import { randomUUID } from 'node:crypto'
import { assertPortalRole, getAuthenticatedUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { getFacilitySummary } from '@/lib/loan-domain'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    const store = await readLoanStore()
    const applications = (store.applications || []).filter(application => user.role === 'Bank Officer' || application.userId === user.id)
    const facilities = store.facilities.filter(facility => user.role === 'Bank Officer' || facility.farmerUserId === user.id).map(facility => ({ ...facility, summary: getFacilitySummary(store, facility) }))
    return Response.json({ applications, facilities })
  } catch (error) {
    return errorResponse(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    assertPortalRole(user, 'Farmer')
    const payload = await request.json() as Record<string, unknown>
    const text = (key: string) => typeof payload[key] === 'string' ? String(payload[key]).trim() : ''
    const number = (key: string) => Number(payload[key])
    const farmerName = text('farmerName') || user.name
    const requestedAmount = number('requestedAmount')
    const farmAreaHa = number('farmAreaHa')
    if (!farmerName || !text('phone') || !text('district') || !text('village') || !text('crop')) throw new Error('Complete the farmer, location and crop details.')
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || !Number.isFinite(farmAreaHa) || farmAreaHa <= 0) throw new Error('Loan amount and farm area must be positive numbers.')
    let created = null
    await updateLoanStore(store => {
      const now = new Date().toISOString()
      created = {
        id: `application-${randomUUID()}`, reference: `ARI-APP-${Date.now().toString().slice(-6)}`, userId: user.id, status: 'Submitted' as const,
        farmerName, phone: text('phone'), district: text('district'), village: text('village'), crop: text('crop'), farmAreaHa,
        irrigation: text('irrigation') || 'Rain-fed', historicalYield: number('historicalYield') || 0, requestedAmount,
        expectedRevenue: number('expectedRevenue') || 0, cultivationCosts: number('cultivationCosts') || 0, existingDebt: number('existingDebt') || 0,
        creditHistory: text('creditHistory') || 'Limited', purpose: text('purpose') || 'Seasonal crop cultivation', documents: [], createdAt: now, updatedAt: now,
      }
      store.applications = store.applications || []
      store.applications.push(created)
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: 'Farmer', action: 'Application submitted', entityType: 'Application', entityId: created.id, reason: 'Submitted through farmer portal', occurredAt: now })
    })
    return Response.json({ application: created }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
