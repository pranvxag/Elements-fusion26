import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { AuthUser, LoanFacility, PortalRole, Tranche, UserRole } from './loan-domain'
import { readLoanStore, updateLoanStore } from './loan-store'
import { demoAccounts } from './demo-accounts'

export type DemoUser = { id: string; name: string; role: UserRole }

const permissions: Record<UserRole, string[]> = {
  Administrator: ['facility:read', 'facility:write', 'tranche:review', 'tranche:release', 'repayment:write', 'audit:read'],
  'Credit Officer': ['facility:read', 'facility:write', 'tranche:review', 'audit:read'],
  'Loan Officer': ['facility:read', 'tranche:review', 'tranche:release'],
  'Read-Only Auditor': ['facility:read', 'audit:read'],
  'Bank Officer': ['facility:read', 'facility:write', 'tranche:review', 'tranche:release', 'application:review', 'audit:read'],
  Farmer: ['application:read', 'application:write', 'evidence:write'],
}

export const SESSION_COOKIE = 'agririsk_session'
const sessionDurationMs = 1000 * 60 * 60 * 8
export async function ensureDemoAccounts() {
  await updateLoanStore(store => {
    store.users = store.users || []
    for (const account of demoAccounts) {
      if (!store.users.some(user => user.email === account.email)) store.users.push({ id: `demo-${account.role === 'Farmer' ? 'farmer' : 'officer'}`, name: account.name, email: account.email, role: account.role, passwordHash: account.passwordHash, createdAt: '2026-10-09T00:00:00.000Z' })
    }
    const farmer = store.users.find(user => user.email === 'farmer.demo@agririsk.local')
    if (farmer && !store.facilities.some(facility => facility.farmerUserId === farmer.id)) {
      const facilityId = 'facility-demo-farmer'
      const tranches: Tranche[] = [
        { id: 'tranche-demo-farmer-1', facilityId, sequence: 1, purpose: 'Seeds and sowing', cropStage: 'Sowing', amount: 20000, plannedDate: '2026-06-15', status: 'Disbursed', evidence: [{ id: 'demo-seed-proof', label: 'Seed invoice', required: true, received: true }] },
        { id: 'tranche-demo-farmer-2', facilityId, sequence: 2, purpose: 'Fertilizers and crop inputs', cropStage: 'Vegetative growth', amount: 20000, plannedDate: '2026-07-02', status: 'Pending Review', evidence: [{ id: 'demo-crop-photo', label: 'Crop-progress photo', required: true, received: false }] },
        { id: 'tranche-demo-farmer-3', facilityId, sequence: 3, purpose: 'Harvest preparation', cropStage: 'Harvest', amount: 20000, plannedDate: '2026-10-18', status: 'Planned', evidence: [{ id: 'demo-harvest-proof', label: 'Harvest plan', required: true, received: false }] },
      ]
      const facility: LoanFacility = { id: facilityId, reference: 'ARI-FAC-DEMO01', farmerName: farmer.name, district: 'Nashik', crop: 'Grapes', farmAreaHa: 2.4, approvedLimit: 60000, annualRate: 11.5, repaymentStructure: 'Harvest-linked', approvedAt: '2026-06-01T09:00:00.000Z', status: 'Active', tranches, farmerUserId: farmer.id }
      store.facilities.push(facility)
      store.disbursements.push({ id: 'disbursement-demo-farmer-1', trancheId: tranches[0].id, facilityId, transactionId: 'DEMO-TXN-FARMER-01', amount: 20000, recordedAt: '2026-06-15T09:00:00.000Z', paymentMethod: 'Demo ledger', destinationReference: 'DEMO-DESTINATION', approvedBy: 'Arun Kulkarni', demo: true })
      store.ledger.push({ id: 'ledger-demo-farmer-1', facilityId, type: 'Disbursement', amount: 20000, principal: 20000, interest: 0, postedAt: '2026-06-15T09:00:00.000Z', reference: 'DEMO-TXN-FARMER-01', immutable: true })
      store.applications = store.applications || []
      store.applications.push({ id: 'application-demo-farmer', reference: 'ARI-APP-DEMO01', userId: farmer.id, status: 'Approved', farmerName: farmer.name, phone: '+919800000001', district: 'Nashik', village: 'Dindori', crop: 'Grapes', farmAreaHa: 2.4, irrigation: 'Drip', historicalYield: 28, requestedAmount: 60000, expectedRevenue: 560000, cultivationCosts: 220000, existingDebt: 25000, creditHistory: 'Strong', purpose: 'Seasonal crop cultivation', documents: [], facilityId, officerNote: 'Synthetic demo facility approved with milestone-based release.', createdAt: '2026-06-01T09:00:00.000Z', updatedAt: '2026-06-15T09:00:00.000Z' })
    }
  })
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derived = scryptSync(password, salt, 64)
  return timingSafeEqual(derived, Buffer.from(hash, 'hex'))
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function publicUser(user: AuthUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
}

export async function createSession(userId: string) {
  const session = { id: randomBytes(32).toString('hex'), userId, expiresAt: new Date(Date.now() + sessionDurationMs).toISOString() }
  await updateLoanStore(store => { store.sessions = (store.sessions || []).filter(item => new Date(item.expiresAt) > new Date()); store.sessions.push(session) })
  return session
}

export async function getAuthenticatedUser(request: Request) {
  const sessionId = request.headers.get('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]
  if (!sessionId) return null
  const store = await readLoanStore()
  const session = (store.sessions || []).find(item => item.id === sessionId && new Date(item.expiresAt) > new Date())
  return session ? (store.users || []).find(user => user.id === session.userId) || null : null
}

export async function destroySession(request: Request) {
  const sessionId = request.headers.get('cookie')?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1]
  if (sessionId) await updateLoanStore(store => { store.sessions = (store.sessions || []).filter(item => item.id !== sessionId) })
}

export function assertPortalRole(user: AuthUser, role: PortalRole) {
  if (user.role !== role) throw new Error('This account is not authorized for this portal.')
}

export function getDemoUser(request: Request): DemoUser {
  const role = request.headers.get('x-demo-role') as UserRole | null
  const validRole = role && role in permissions ? role : 'Loan Officer'
  return { id: 'user-arun', name: 'Arun Kulkarni', role: validRole }
}

export async function getRequestUser(request: Request): Promise<DemoUser> {
  const authenticated = await getAuthenticatedUser(request)
  if (authenticated) return { id: authenticated.id, name: authenticated.name, role: authenticated.role }
  throw new Error('You must be signed in.')
}

export function assertPermission(user: DemoUser, permission: string) {
  if (!permissions[user.role].includes(permission)) throw new Error(`Role ${user.role} is not authorized for ${permission}.`)
}
