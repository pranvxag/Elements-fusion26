import { randomUUID } from 'node:crypto'
import { assertPortalRole, getAuthenticatedUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { validateTrancheSchedule, type LoanFacility, type Tranche } from '@/lib/loan-domain'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    assertPortalRole(user, 'Bank Officer')
    const { id } = await params
    const payload = await request.json() as { action?: 'approve' | 'reject' | 'request-documents'; approvedLimit?: number; annualRate?: number; repaymentStructure?: LoanFacility['repaymentStructure']; tranches?: Array<{ purpose: string; cropStage: string; amount: number; plannedDate: string }> ; note?: string }
    if (!payload.action) throw new Error('A decision action is required.')
    let result: unknown
    await updateLoanStore(store => {
      store.applications = store.applications || []
      const application = store.applications.find(item => item.id === id)
      if (!application) throw new Error('Application was not found.')
      if (application.status === 'Approved' || application.status === 'Rejected') throw new Error('This application already has a final decision.')
      const now = new Date().toISOString()
      if (payload.action === 'reject') {
        application.status = 'Rejected'; application.officerNote = payload.note?.trim() || 'Application rejected after officer review.'
      } else if (payload.action === 'request-documents') {
        application.status = 'Documents Required'; application.officerNote = payload.note?.trim() || 'Additional supporting documents are required.'
      } else {
        if (!application.assessment) throw new Error('Run and review the AgriRisk assessment before recording an approval.')
        const approvedLimit = Number(payload.approvedLimit)
        if (!Number.isFinite(approvedLimit) || approvedLimit <= 0) throw new Error('Approved amount must be positive.')
        const plans = payload.tranches?.length ? payload.tranches : [
          { purpose: 'Seeds and sowing', cropStage: 'Sowing', amount: Math.round(approvedLimit * 0.2), plannedDate: now.slice(0, 10) },
          { purpose: 'Crop inputs', cropStage: 'Vegetative growth', amount: Math.round(approvedLimit * 0.2), plannedDate: now.slice(0, 10) },
          { purpose: 'Crop protection', cropStage: 'Flowering', amount: Math.round(approvedLimit * 0.2), plannedDate: now.slice(0, 10) },
          { purpose: 'Irrigation and maintenance', cropStage: 'Canopy development', amount: Math.round(approvedLimit * 0.2), plannedDate: now.slice(0, 10) },
          { purpose: 'Harvest preparation', cropStage: 'Harvest', amount: approvedLimit - Math.round(approvedLimit * 0.2) * 4, plannedDate: now.slice(0, 10) },
        ]
        const facilityId = `facility-${randomUUID()}`
        const tranches: Tranche[] = plans.map((plan, index) => ({ id: `tranche-${randomUUID()}`, facilityId, sequence: index + 1, purpose: plan.purpose, cropStage: plan.cropStage, amount: Math.round(Number(plan.amount)), plannedDate: plan.plannedDate, status: index === 0 ? 'Pending Review' : 'Planned', evidence: index === 0 ? [] : [{ id: `evidence-${randomUUID()}`, label: 'Crop-progress photo', required: true, received: false }] }))
        const facility: LoanFacility = { id: facilityId, reference: `ARI-FAC-${Date.now().toString().slice(-6)}`, farmerName: application.farmerName, district: application.district, crop: application.crop, farmAreaHa: application.farmAreaHa, approvedLimit, annualRate: Number(payload.annualRate) || 11.5, repaymentStructure: payload.repaymentStructure || 'Harvest-linked', approvedAt: now, status: 'Active', tranches, farmerUserId: application.userId }
        validateTrancheSchedule(facility, tranches)
        store.facilities.push(facility)
        application.status = 'Approved'; application.facilityId = facility.id; application.officerNote = payload.note?.trim() || 'Approved with staged disbursement.'
      }
      application.updatedAt = now
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: 'Bank Officer', action: `Application ${payload.action}`, entityType: 'Application', entityId: id, reason: application.officerNote, occurredAt: now })
      result = application
    })
    return Response.json({ application: result })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
