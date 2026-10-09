export type RepaymentSchedule = {
  payment: number
  totalRepayment: number
  totalInterest: number
  periods: number
}

export function calculateRepayment(principal: number, annualRate: number, frequency: 'Monthly' | 'Seasonal' | 'Harvest-linked', periods = 12): RepaymentSchedule {
  if (principal < 0 || annualRate < 0 || periods < 1) throw new Error('Financial inputs must be non-negative and include at least one period.')
  if (frequency === 'Harvest-linked') {
    const totalInterest = Math.round(principal * annualRate / 100)
    return { payment: principal + totalInterest, totalRepayment: principal + totalInterest, totalInterest, periods: 1 }
  }
  const periodsPerYear = frequency === 'Monthly' ? 12 : 3
  const numberOfPeriods = Math.max(1, Math.ceil(periods / (12 / periodsPerYear)))
  const periodicRate = annualRate / 100 / periodsPerYear
  const payment = periodicRate === 0
    ? principal / numberOfPeriods
    : principal * periodicRate * (1 + periodicRate) ** numberOfPeriods / ((1 + periodicRate) ** numberOfPeriods - 1)
  const roundedPayment = Math.round(payment)
  const totalRepayment = roundedPayment * numberOfPeriods
  return { payment: roundedPayment, totalRepayment, totalInterest: Math.max(0, totalRepayment - principal), periods: numberOfPeriods }
}

export function allocateRepayment(amount: number, accruedInterest: number, outstandingPrincipal: number) {
  if (amount < 0 || accruedInterest < 0 || outstandingPrincipal < 0) throw new Error('Repayment values cannot be negative.')
  const interest = Math.min(amount, accruedInterest)
  const principal = Math.min(amount - interest, outstandingPrincipal)
  const unapplied = Math.max(0, amount - interest - principal)
  return { interest, principal, unapplied }
}
