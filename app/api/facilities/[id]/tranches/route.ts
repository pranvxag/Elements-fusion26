import { randomUUID } from 'node:crypto'
import { getRequestUser, assertPermission } from '@/lib/auth'
import { validateTrancheSchedule, type Tranche } from '@/lib/loan-domain'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'
import { errorResponse } from '@/lib/api-response'
import { parseTranchePatch, positiveAmount, requiredText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request)
    assertPermission(user, 'facility:write')
    const { id } = await params
    const payload = await request.json() as { tranches?: unknown[] }
    if (!Array.isArray(payload.tranches)) throw new Error('A tranche schedule is required.')
    const requestedTranches = payload.tranches
    let updatedFacility: unknown
    await updateLoanStore(store => {
      const facility = store.facilities.find(item => item.id === id)
      if (!facility) throw new Error('Loan facility was not found.')
      const nextTranches = requestedTranches.map((raw, index) => {
        const patch = parseTranchePatch(raw)
        const source = raw as Record<string, unknown>
        return { ...(source as unknown as Tranche), ...patch, id: typeof source.id === 'string' ? source.id : `tranche-${randomUUID()}`, facilityId: id, sequence: index + 1, status: typeof source.status === 'string' ? source.status : 'Planned', evidence: Array.isArray(source.evidence) ? source.evidence : [] } as Tranche
      })
      validateTrancheSchedule(facility, nextTranches)
      facility.tranches = nextTranches
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: user.role, action: 'Tranche schedule changed', entityType: 'Facility', entityId: id, reason: 'Schedule edited in synthetic demo', occurredAt: new Date().toISOString() })
      updatedFacility = facility
    })
    return Response.json({ facility: updatedFacility })
  } catch (error) {
    return errorResponse(error, 403)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request)
    assertPermission(user, 'facility:write')
    const { id } = await params
    const payload = await request.json() as Record<string, unknown>
    const tranche: Tranche = { id: `tranche-${randomUUID()}`, facilityId: id, sequence: 0, purpose: requiredText(payload.purpose, 'Purpose'), cropStage: requiredText(payload.cropStage, 'Crop stage'), amount: positiveAmount(payload.amount, 'Amount'), plannedDate: requiredText(payload.plannedDate, 'Planned date'), status: 'Planned', evidence: [] }
    let created: Tranche | undefined
    await updateLoanStore(store => {
      const facility = store.facilities.find(item => item.id === id)
      if (!facility) throw new Error('Loan facility was not found.')
      tranche.sequence = facility.tranches.length + 1
      validateTrancheSchedule(facility, [...facility.tranches, tranche])
      facility.tranches.push(tranche)
      created = tranche
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: user.role, action: 'Tranche schedule changed', entityType: 'Tranche', entityId: tranche.id, reason: 'Tranche added in synthetic demo', occurredAt: new Date().toISOString() })
    })
    return Response.json({ tranche: created }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 403)
  }
}
