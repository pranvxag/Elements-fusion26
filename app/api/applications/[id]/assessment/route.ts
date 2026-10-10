import { randomUUID } from 'node:crypto'
import { assertPortalRole, getAuthenticatedUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { calculateRisk, riskInputFromApplication } from '@/lib/risk-engine'
import { readLoanStore, updateLoanStore } from '@/lib/loan-store'
import type { AssessmentReport } from '@/lib/loan-domain'

export const dynamic = 'force-dynamic'

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function distanceKm(latitude: number, longitude: number, otherLatitude: number, otherLongitude: number) {
  const radians = (value: number) => value * Math.PI / 180
  const earthRadius = 6371
  const deltaLat = radians(otherLatitude - latitude)
  const deltaLng = radians(otherLongitude - longitude)
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(otherLatitude)) * Math.sin(deltaLng / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    const { id } = await params
    const store = await readLoanStore()
    const application = (store.applications || []).find(item => item.id === id)
    if (!application) throw new Error('Application was not found.')
    if (user.role !== 'Bank Officer' && application.userId !== user.id) throw new Error('You are not authorized to view this assessment.')
    return Response.json({ assessment: application.assessment || null })
  } catch (error) {
    return errorResponse(error, 403)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) throw new Error('You must be signed in.')
    assertPortalRole(user, 'Bank Officer')
    const { id } = await params
    let report: AssessmentReport | undefined
    await updateLoanStore(store => {
      const application = (store.applications || []).find(item => item.id === id)
      if (!application) throw new Error('Application was not found.')
      if (application.status === 'Rejected' || application.status === 'Approved') throw new Error('A final application cannot be reassessed.')
      if (!Number.isFinite(application.farmAreaHa) || application.farmAreaHa <= 0 || !Number.isFinite(application.requestedAmount) || application.requestedAmount <= 0) {
        throw new Error('The application has invalid farm area or loan amount.')
      }
      const risk = calculateRisk(riskInputFromApplication(application))
      const now = new Date()
      const sowingDate = application.sowingDate ? new Date(application.sowingDate) : now
      const duration = application.crop === 'Grapes' ? 180 : application.crop === 'Sugarcane' ? 300 : 120
      const timeline = [
        { stage: 'Sowing', date: application.sowingDate || addDays(sowingDate, 0), kind: application.sowingDate ? 'configured' as const : 'estimate' as const, detail: 'Crop establishment and input purchase' },
        { stage: 'Vegetative growth', date: addDays(sowingDate, Math.round(duration * 0.3)), kind: 'estimate' as const, detail: 'Crop-progress evidence checkpoint' },
        { stage: 'Flowering / grain fill', date: addDays(sowingDate, Math.round(duration * 0.65)), kind: 'estimate' as const, detail: 'Irrigation and crop-health checkpoint' },
        { stage: 'Expected harvest', date: application.expectedHarvestDate || addDays(sowingDate, duration), kind: application.expectedHarvestDate ? 'configured' as const : 'estimate' as const, detail: 'Expected sale and harvest evidence' },
        { stage: 'Repayment start', date: addDays(sowingDate, duration + 15), kind: 'estimate' as const, detail: `${application.repaymentStructure || 'Harvest-linked'} repayment schedule begins` },
      ]
      const hasLocation = Number.isFinite(application.latitude) && Number.isFinite(application.longitude)
      const syntheticWater = hasLocation ? [
        { name: 'Synthetic seasonal canal marker', latitude: application.latitude! + 0.018, longitude: application.longitude! + 0.012 },
        { name: 'Synthetic village pond marker', latitude: application.latitude! - 0.011, longitude: application.longitude! - 0.016 },
      ].map(resource => ({ ...resource, distanceKm: distanceKm(application.latitude!, application.longitude!, resource.latitude, resource.longitude) })).sort((first, second) => first.distanceKm - second.distanceKm)[0] : undefined
      report = {
        version: 'agririsk-demo-1.0',
        assessedAt: now.toISOString(),
        assessedBy: user.name,
        inputSnapshot: { ...application, documents: application.documents.map(document => ({ label: document.label, status: document.status })) },
        result: risk,
        dataSources: [
          { name: 'Application and financial details', kind: 'observed', status: 'Provided by farmer; officer verification required' },
          { name: 'Crop duration and price assumptions', kind: 'estimated', status: 'Demo crop library assumption' },
          { name: 'Weather, soil moisture and crop health', kind: 'synthetic', status: 'Seeded demo indicators; not a satellite observation' },
          { name: 'Farm coordinates', kind: hasLocation ? 'observed' : 'estimated', status: hasLocation ? 'Provided coordinates; not independently verified' : 'No verified location supplied' },
        ],
        assumptions: ['Synthetic climate indicators are illustrative and not statistically validated probabilities of default.', 'Nearby water resources are not treated as proof of irrigation access.', 'Expected revenue uses the seeded crop price library and reported yield.'],
        warnings: [...(!hasLocation ? ['Location coordinates are missing; geometry and water-distance analysis were not run.'] : []), ...(application.documents.length === 0 ? ['No land or identity document has been uploaded for officer verification.'] : [])],
        suggestedLoanAmount: Math.max(0, Math.min(application.requestedAmount, Math.round(Math.max(0, risk.expectedRevenue - application.cultivationCosts - application.existingDebt) * 0.35))),
        mapAnalysis: syntheticWater ? { status: 'synthetic', nearestResource: syntheticWater.name, distanceKm: Math.round(syntheticWater.distanceKm * 100) / 100, confidence: 'low', freshness: 'Seeded demo geospatial data; not a verified map resource' } : { status: 'unavailable', confidence: 'low', freshness: 'No coordinates supplied' },
        timeline,
      }
      application.assessment = report
      application.status = 'Under Review'
      application.updatedAt = now.toISOString()
      store.audit.push({ id: `audit-${randomUUID()}`, actor: user.name, role: 'Bank Officer', action: 'AgriRisk assessment generated', entityType: 'Application', entityId: id, reason: `Calculation version ${report.version}`, occurredAt: now.toISOString() })
    })
    return Response.json({ assessment: report })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
