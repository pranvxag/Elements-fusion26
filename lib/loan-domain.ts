export type UserRole = 'Administrator' | 'Credit Officer' | 'Loan Officer' | 'Read-Only Auditor' | 'Bank Officer' | 'Farmer'
export type PortalRole = 'Bank Officer' | 'Farmer'
export type FacilityStatus = 'Active' | 'Completed' | 'Suspended'
export type TrancheStatus = 'Planned' | 'Pending Review' | 'Approved for Release' | 'Disbursed' | 'On Hold' | 'Declined' | 'Cancelled'
export type RepaymentMethod = 'Bank transfer' | 'UPI' | 'Cash deposit' | 'Demo ledger'

export type EvidenceRequirement = {
  id: string
  label: string
  required: boolean
  received: boolean
  proofFileName?: string
  proofStorageName?: string
}

export type Tranche = {
  id: string
  facilityId: string
  sequence: number
  purpose: string
  cropStage: string
  amount: number
  plannedDate: string
  status: TrancheStatus
  evidence: EvidenceRequirement[]
  reviewObservation?: string
  reviewReason?: string
  climateSnapshot?: { repaymentProbability: number; capturedAt: string; label: string }
  approvedBy?: string
  approvedAt?: string
  disbursedAt?: string
  transactionId?: string
}

export type LoanFacility = {
  id: string
  reference: string
  farmerName: string
  district: string
  crop: string
  farmAreaHa: number
  approvedLimit: number
  annualRate: number
  repaymentStructure: 'Monthly' | 'Seasonal' | 'Harvest-linked'
  approvedAt: string
  status: FacilityStatus
  tranches: Tranche[]
  farmerUserId?: string
}

export type Disbursement = {
  id: string
  trancheId: string
  facilityId: string
  transactionId: string
  amount: number
  recordedAt: string
  paymentMethod: RepaymentMethod
  destinationReference: string
  approvedBy: string
  demo: true
}

export type Repayment = {
  id: string
  facilityId: string
  amount: number
  principal: number
  interest: number
  recordedAt: string
  reference: string
  demo: true
}

export type LedgerEntry = {
  id: string
  facilityId: string
  type: 'Disbursement' | 'Repayment' | 'Interest Accrual' | 'Adjustment' | 'Reversal'
  amount: number
  principal: number
  interest: number
  postedAt: string
  reference: string
  immutable: true
}

export type AuditEvent = {
  id: string
  actor: string
  role: UserRole
  action: string
  entityType: 'Facility' | 'Tranche' | 'Disbursement' | 'Repayment' | 'Application' | 'Document'
  entityId: string
  reason?: string
  occurredAt: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: PortalRole
  passwordHash: string
  phone?: string
  createdAt: string
}

export type SessionRecord = {
  id: string
  userId: string
  expiresAt: string
}

export type LoanApplicationStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Documents Required'

export type AssessmentReport = {
  version: string
  assessedAt: string
  assessedBy: string
  inputSnapshot: Record<string, unknown>
  result: {
    repaymentProbability: number
    riskCategory: 'Low' | 'Moderate' | 'High'
    expectedYield: number
    expectedRevenue: number
    totalDebt: number
    coverageRatio: number
    projectedSurplus: number
    drivers: Array<{ label: string; detail: string; impact: number; direction: 'risk' | 'protection' }>
  }
  dataSources: Array<{ name: string; kind: 'observed' | 'external' | 'estimated' | 'synthetic'; status: string }>
  assumptions: string[]
  warnings: string[]
  suggestedLoanAmount: number
  mapAnalysis?: {
    status: 'synthetic' | 'unavailable'
    nearestResource?: string
    distanceKm?: number
    confidence: 'low' | 'medium'
    freshness: string
  }
  timeline: Array<{ stage: string; date: string; kind: 'estimate' | 'configured'; detail: string }>
}

export type LoanApplication = {
  id: string
  reference: string
  userId: string
  status: LoanApplicationStatus
  farmerName: string
  phone: string
  district: string
  village: string
  crop: string
  farmAreaHa: number
  irrigation: string
  historicalYield: number
  requestedAmount: number
  expectedRevenue: number
  cultivationCosts: number
  existingDebt: number
  creditHistory: string
  purpose: string
  state?: string
  taluka?: string
  sowingDate?: string
  expectedHarvestDate?: string
  latitude?: number
  longitude?: number
  mapsLink?: string
  surveyReference?: string
  cultivatedAreaHa?: number
  expectedYield?: number
  repaymentStructure?: 'Monthly' | 'Seasonal' | 'Harvest-linked'
  assessment?: AssessmentReport
  documents: ApplicationDocument[]
  facilityId?: string
  officerNote?: string
  createdAt: string
  updatedAt: string
}

export type ApplicationDocument = {
  id: string
  label: string
  fileName: string
  storageName: string
  uploadedAt: string
  status: 'Submitted' | 'Accepted' | 'Additional Proof Required'
}

export type LoanStore = {
  facilities: LoanFacility[]
  disbursements: Disbursement[]
  repayments: Repayment[]
  ledger: LedgerEntry[]
  audit: AuditEvent[]
  users?: AuthUser[]
  sessions?: SessionRecord[]
  applications?: LoanApplication[]
}

export type FacilitySummary = {
  approvedLimit: number
  amountDisbursed: number
  remainingToDisburse: number
  outstandingPrincipal: number
  principalRepaid: number
  interestDue: number
  overdue: number
  pendingReview: number
}

export const allowedTransitions: Record<TrancheStatus, TrancheStatus[]> = {
  Planned: ['Pending Review', 'Cancelled'],
  'Pending Review': ['Approved for Release', 'On Hold', 'Declined'],
  'Approved for Release': ['Disbursed', 'On Hold', 'Declined'],
  Disbursed: [],
  'On Hold': ['Pending Review', 'Declined', 'Cancelled'],
  Declined: ['Pending Review', 'Cancelled'],
  Cancelled: [],
}

export function canTransition(from: TrancheStatus, to: TrancheStatus) {
  return allowedTransitions[from].includes(to)
}

export function validateTrancheSchedule(facility: LoanFacility, tranches: Tranche[]) {
  const plannedTotal = tranches.filter(tranche => tranche.status !== 'Cancelled').reduce((total, tranche) => total + tranche.amount, 0)
  const disbursedTotal = facility.tranches.filter(tranche => tranche.status === 'Disbursed').reduce((total, tranche) => total + tranche.amount, 0)
  if (plannedTotal > facility.approvedLimit) throw new Error('Planned tranches exceed the approved facility limit.')
  if (plannedTotal < disbursedTotal) throw new Error('The schedule cannot be reduced below amounts already disbursed.')
  if (tranches.some(tranche => !Number.isInteger(tranche.amount) || tranche.amount <= 0)) throw new Error('Every tranche amount must be a positive whole rupee amount.')
}

export function getFacilitySummary(store: LoanStore, facility: LoanFacility): FacilitySummary {
  const disbursements = store.disbursements.filter(item => item.facilityId === facility.id)
  const repayments = store.repayments.filter(item => item.facilityId === facility.id)
  const amountDisbursed = disbursements.reduce((total, item) => total + item.amount, 0)
  const principalRepaid = repayments.reduce((total, item) => total + item.principal, 0)
  const interestDue = repayments.reduce((total, item) => total + item.interest, 0)
  return {
    approvedLimit: facility.approvedLimit,
    amountDisbursed,
    remainingToDisburse: Math.max(0, facility.approvedLimit - amountDisbursed),
    outstandingPrincipal: Math.max(0, amountDisbursed - principalRepaid),
    principalRepaid,
    interestDue,
    overdue: 0,
    pendingReview: facility.tranches.filter(tranche => tranche.status === 'Pending Review').length,
  }
}
