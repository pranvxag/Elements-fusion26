import { randomUUID } from 'node:crypto'
import { getAuthenticatedUser, getRequestUser, assertPermission } from '@/lib/auth'
import { getFacilitySummary, type LoanFacility } from '@/lib/loan-domain'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'
import { errorResponse } from '@/lib/api-response'
import { positiveAmount, requiredText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    const store = await readLoanStore()
    const facilities = store.facilities.filter(facility => user.role === 'Bank Officer' || facility.farmerUserId === user.id).map(facility => ({ ...facility, summary: getFacilitySummary(store, facility) }))
    return Response.json({ facilities })
  } catch (error) {
    return errorResponse(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    assertPermission(user, 'facility:write')
    const payload = await request.json() as Record<string, unknown>
    const approvedLimit = positiveAmount(payload.approvedLimit, 'Approved facility limit')
    const facility: LoanFacility = {
      id: `facility-${randomUUID()}`,
      reference: `ARI-FAC-${new Date().getTime().toString().slice(-6)}`,
      farmerName: requiredText(payload.farmerName, 'Farmer name'),
      district: requiredText(payload.district, 'District'),
      crop: requiredText(payload.crop, 'Crop'),
      farmAreaHa: Number(payload.farmAreaHa) || 0,
      approvedLimit,
      annualRate: Number(payload.annualRate) || 0,
      repaymentStructure: payload.repaymentStructure === 'Monthly' || payload.repaymentStructure === 'Seasonal' ? payload.repaymentStructure : 'Harvest-linked',
      approvedAt: new Date().toISOString(),
      status: 'Active',
      tranches: [],
    }
    await updateLoanStore(store => {
      store.facilities.push(facility)
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: user.role, action: 'Facility approved', entityType: 'Facility', entityId: facility.id, reason: 'Synthetic demo facility created', occurredAt: new Date().toISOString() })
    })
    return Response.json({ facility }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 403)
  }
}
