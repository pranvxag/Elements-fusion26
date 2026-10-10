import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool, type PoolClient } from 'pg'
import type { LoanStore } from './loan-domain'

const dataFile = path.join(process.cwd(), 'data', 'loan-store.json')
const databaseUrl = process.env.DATABASE_URL
let pool: Pool | undefined
let initialization: Promise<void> | undefined
let mutationLock = Promise.resolve()

function getPool() {
  if (!databaseUrl) return undefined
  pool ||= new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX || 5),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })
  return pool
}

async function readLocalSeed(): Promise<LoanStore> {
  const content = await readFile(dataFile, 'utf8')
  return JSON.parse(content) as LoanStore
}

async function initializeDatabase() {
  const currentPool = getPool()
  if (!currentPool) return
  await currentPool.query(`
    CREATE TABLE IF NOT EXISTS agririsk_store (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  const existing = await currentPool.query('SELECT id FROM agririsk_store WHERE id = 1')
  if (existing.rowCount === 0) {
    const seed = await readLocalSeed()
    await currentPool.query('INSERT INTO agririsk_store (id, payload) VALUES (1, $1::jsonb)', [JSON.stringify(seed)])
  }
}

async function ensureDatabase() {
  if (!initialization) initialization = initializeDatabase().catch(error => {
    initialization = undefined
    throw new Error(`Postgres persistence could not be initialized: ${error instanceof Error ? error.message : 'unknown database error'}`)
  })
  await initialization
}

export async function readLoanStore(): Promise<LoanStore> {
  const currentPool = getPool()
  if (!currentPool) {
    try {
      return await readLocalSeed()
    } catch {
      throw new Error('Local loan store is missing. Restore data/loan-store.json or configure DATABASE_URL.')
    }
  }
  await ensureDatabase()
  const result = await currentPool.query<{ payload: LoanStore }>('SELECT payload FROM agririsk_store WHERE id = 1')
  if (!result.rows[0]) throw new Error('Postgres loan store is empty.')
  return result.rows[0].payload
}

async function updatePostgres<T>(currentPool: Pool, mutator: (store: LoanStore) => T | Promise<T>) {
  const client: PoolClient = await currentPool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{ payload: LoanStore }>('SELECT payload FROM agririsk_store WHERE id = 1 FOR UPDATE')
    if (!result.rows[0]) throw new Error('Postgres loan store is empty.')
    const output = await mutator(result.rows[0].payload)
    await client.query('UPDATE agririsk_store SET payload = $1::jsonb, updated_at = NOW() WHERE id = 1', [JSON.stringify(result.rows[0].payload)])
    await client.query('COMMIT')
    return output
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateLoanStore<T>(mutator: (store: LoanStore) => T | Promise<T>) {
  const currentPool = getPool()
  if (currentPool) {
    await ensureDatabase()
    return updatePostgres(currentPool, mutator)
  }

  let result: T | undefined
  const operation = mutationLock.then(async () => {
    const store = await readLoanStore()
    result = await mutator(store)
    // The JSON fallback is for local development only. Vercel uses DATABASE_URL.
    const { mkdir, rename, writeFile } = await import('node:fs/promises')
    const dataDirectory = path.dirname(dataFile)
    await mkdir(dataDirectory, { recursive: true })
    const temporaryFile = `${dataFile}.${process.pid}.tmp`
    await writeFile(temporaryFile, JSON.stringify(store, null, 2) + '\n', 'utf8')
    await rename(temporaryFile, dataFile)
  })
  mutationLock = operation.catch(() => undefined)
  await operation
  return result as T
}
