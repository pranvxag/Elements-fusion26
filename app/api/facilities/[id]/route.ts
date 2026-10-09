import { getFacilitySummary } from '@/lib/loan-domain'
import { readLoanStore } from '@/lib/loan-store'
import { errorResponse } from '@/lib/api-response'
import { getAuthenticatedUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    const { id } = await params
    const store = await readLoanStore()
    const facility = store.facilities.find(item => item.id === id)
    if (!facility) return Response.json({ error: 'Loan facility was not found.' }, { status: 404 })
    if (user.role !== 'Bank Officer' && facility.farmerUserId !== user.id) throw new Error('You are not authorized to view this facility.')
    return Response.json({ facility, summary: getFacilitySummary(store, facility), disbursements: store.disbursements.filter(item => item.facilityId === id), repayments: store.repayments.filter(item => item.facilityId === id), ledger: store.ledger.filter(item => item.facilityId === id), audit: store.audit.filter(item => item.entityId === id || facility.tranches.some(tranche => tranche.id === item.entityId)) })
  } catch (error) {
    return errorResponse(error, 500)
  }
}
