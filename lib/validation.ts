import type { LoanFacility, Tranche, TrancheStatus } from './loan-domain'

export function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length < 2) throw new Error(`${label} is required.`)
  return value.trim()
}

export function positiveAmount(value: unknown, label: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`${label} must be a positive whole rupee amount.`)
  return amount
}

export function parseTranchePatch(input: unknown): Partial<Tranche> {
  if (!input || typeof input !== 'object') throw new Error('A tranche payload is required.')
  const payload = input as Record<string, unknown>
  const patch: Partial<Tranche> = {}
  if ('purpose' in payload) patch.purpose = requiredText(payload.purpose, 'Purpose')
  if ('cropStage' in payload) patch.cropStage = requiredText(payload.cropStage, 'Crop stage')
  if ('amount' in payload) patch.amount = positiveAmount(payload.amount, 'Amount')
  if ('plannedDate' in payload) patch.plannedDate = requiredText(payload.plannedDate, 'Planned date')
  return patch
}

export function requireReason(reason: unknown, action: string) {
  return requiredText(reason, `A reason is required to ${action}`)
}

export function requireTransition(status: TrancheStatus, nextStatus: TrancheStatus, allowed: (from: TrancheStatus, to: TrancheStatus) => boolean) {
  if (!allowed(status, nextStatus)) throw new Error(`Invalid tranche transition: ${status} to ${nextStatus}.`)
}

export function findFacility(facilities: LoanFacility[], id: string) {
  const facility = facilities.find(item => item.id === id)
  if (!facility) throw new Error('Loan facility was not found.')
  return facility
}
