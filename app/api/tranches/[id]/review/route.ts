import { randomUUID } from 'node:crypto'
import { getRequestUser, assertPermission } from '@/lib/auth'
import { allowedTransitions, canTransition, type RepaymentMethod, type TrancheStatus } from '@/lib/loan-domain'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'
import { errorResponse } from '@/lib/api-response'
import { requireReason, requireTransition } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type ReviewAction = 'submit' | 'approve' | 'hold' | 'decline' | 'cancel' | 'release'
const targetStatus: Record<Exclude<ReviewAction, 'release'>, TrancheStatus> = { submit: 'Pending Review', approve: 'Approved for Release', hold: 'On Hold', decline: 'Declined', cancel: 'Cancelled' }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request)
    const { id } = await params
    const payload = await request.json() as { action?: ReviewAction; reason?: string; idempotencyKey?: string; paymentMethod?: string; destinationReference?: string }
    const action = payload.action
    if (!action || !['submit', 'approve', 'hold', 'decline', 'cancel', 'release'].includes(action)) throw new Error('A valid tranche action is required.')
    if (action === 'release') assertPermission(user, 'tranche:release')
    else assertPermission(user, 'tranche:review')
    const idempotencyKey = payload.idempotencyKey?.trim()
    let result: unknown
    await updateLoanStore(store => {
      const facility = store.facilities.find(item => item.tranches.some(tranche => tranche.id === id))
      const tranche = facility?.tranches.find(item => item.id === id)
      if (!facility || !tranche) throw new Error('Tranche was not found.')
      if (action === 'release') {
        if (tranche.status !== 'Approved for Release') throw new Error('Only an approved tranche can be disbursed.')
        if (tranche.evidence.some(item => item.required && !item.received)) throw new Error('All required evidence must be received before release.')
        const transactionId = idempotencyKey ? `DEMO-${idempotencyKey}` : `DEMO-TXN-${randomUUID()}`
        const existing = store.disbursements.find(item => item.transactionId === transactionId)
        if (existing) { result = existing; return }
        const alreadyDisbursed = store.disbursements.filter(item => item.facilityId === facility.id).reduce((total, item) => total + item.amount, 0)
        if (alreadyDisbursed + tranche.amount > facility.approvedLimit) throw new Error('This release would exceed the approved facility limit.')
        tranche.status = 'Disbursed'
        tranche.disbursedAt = new Date().toISOString()
        tranche.approvedBy = user.name
        tranche.transactionId = transactionId
        const paymentMethod: RepaymentMethod = payload.paymentMethod === 'Bank transfer' || payload.paymentMethod === 'UPI' || payload.paymentMethod === 'Cash deposit' ? payload.paymentMethod : 'Demo ledger'
        const disbursement = { id: `disbursement-${randomUUID()}`, trancheId: id, facilityId: facility.id, transactionId, amount: tranche.amount, recordedAt: new Date().toISOString(), paymentMethod, destinationReference: payload.destinationReference?.trim() || 'DEMO-DESTINATION', approvedBy: user.name, demo: true as const }
        store.disbursements.push(disbursement)
        store.ledger.push({ id: `ledger-${randomUUID()}`, facilityId: facility.id, type: 'Disbursement', amount: tranche.amount, principal: tranche.amount, interest: 0, postedAt: disbursement.recordedAt, reference: transactionId, immutable: true })
        store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: user.role, action: 'Release recorded', entityType: 'Disbursement', entityId: disbursement.id, reason: 'Synthetic DEMO transaction; no payment provider connected', occurredAt: disbursement.recordedAt })
        result = disbursement
        return
      }
      const nextStatus = targetStatus[action]
      requireTransition(tranche.status, nextStatus, canTransition)
      const reason = action === 'hold' || action === 'decline' || action === 'cancel' ? requireReason(payload.reason, action) : payload.reason?.trim()
      if (action === 'approve' && tranche.evidence.some(item => item.required && !item.received)) throw new Error('Required evidence is incomplete; the tranche cannot be approved yet.')
      tranche.status = nextStatus
      tranche.reviewReason = reason
      if (action === 'approve') { tranche.approvedBy = user.name; tranche.approvedAt = new Date().toISOString() }
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: user.role, action: `Tranche ${action}d`, entityType: 'Tranche', entityId: id, reason, occurredAt: new Date().toISOString() })
      result = tranche
    })
    return Response.json({ result })
  } catch (error) {
    return errorResponse(error, 403)
  }
}
