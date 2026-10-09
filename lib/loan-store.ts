import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { LoanStore } from './loan-domain'

const dataDirectory = path.join(process.cwd(), 'data')
const dataFile = path.join(dataDirectory, 'loan-store.json')
let mutationLock = Promise.resolve()

async function readSeed(): Promise<LoanStore> {
  const content = await readFile(dataFile, 'utf8')
  return JSON.parse(content) as LoanStore
}

export async function readLoanStore() {
  await mkdir(dataDirectory, { recursive: true })
  try {
    return await readSeed()
  } catch {
    throw new Error('Local loan store is missing. Restore data/loan-store.json or run the seed command.')
  }
}

export async function updateLoanStore<T>(mutator: (store: LoanStore) => T | Promise<T>) {
  let result: T | undefined
  const operation = mutationLock.then(async () => {
    const store = await readLoanStore()
    result = await mutator(store)
    const temporaryFile = `${dataFile}.${process.pid}.tmp`
    await writeFile(temporaryFile, JSON.stringify(store, null, 2) + '\n', 'utf8')
    await rename(temporaryFile, dataFile)
  })
  mutationLock = operation.catch(() => undefined)
  await operation
  return result as T
}
