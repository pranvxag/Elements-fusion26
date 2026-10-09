import { getAuthenticatedUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-response'
import { getFacilitySummary } from '@/lib/loan-domain'
import { readLoanStore } from '@/lib/loan-store'
import { calculateRisk, riskInputFromApplication } from '@/lib/risk-engine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'Bank Officer') throw new Error('You must be signed in as a bank officer.')

    const store = await readLoanStore()
    const applications = store.applications || []
    const scoredApplications = applications.map(application => {
      const risk = calculateRisk(riskInputFromApplication(application))
      return {
        ...application,
        repaymentProbability: risk.repaymentProbability,
        riskCategory: risk.riskCategory,
      }
    })
    const facilities = store.facilities.map(facility => ({
      ...facility,
      summary: getFacilitySummary(store, facility),
    }))
    const statusCounts = scoredApplications.reduce<Record<string, number>>((counts, application) => {
      counts[application.status] = (counts[application.status] || 0) + 1
      return counts
    }, {})
    const riskCounts = scoredApplications.reduce(
      (counts, application) => {
        counts[application.riskCategory] += 1
        return counts
      },
      { Low: 0, Moderate: 0, High: 0 },
    )
    const activeFacilities = facilities.filter(facility => facility.status === 'Active')
    const approvedLimit = facilities.reduce((total, facility) => total + facility.approvedLimit, 0)
    const amountDisbursed = facilities.reduce((total, facility) => total + facility.summary.amountDisbursed, 0)

    return Response.json({
      user: { id: user.id, name: user.name, role: user.role },
      applications: scoredApplications.sort((first, second) => second.repaymentProbability - first.repaymentProbability),
      facilities,
      metrics: {
        applications: applications.length,
        activeFacilities: activeFacilities.length,
        approvedLimit,
        amountDisbursed,
        pendingReview: applications.filter(application => application.status === 'Submitted' || application.status === 'Under Review' || application.status === 'Documents Required').length,
        elevatedClimateExposure: riskCounts.Moderate + riskCounts.High,
        completionRate: applications.length ? Math.round(applications.filter(application => application.status === 'Approved' || application.status === 'Rejected').length / applications.length * 100) : 0,
      },
      statusCounts,
      riskCounts,
    })
  } catch (error) {
    return errorResponse(error, 401)
  }
}
