export type RiskInput = {
  crop: string
  farmArea: number
  irrigation: 'Rain-fed' | 'Borewell' | 'Canal' | 'Drip'
  historicalYield: number
  yieldVolatility: number
  creditHistory: 'Strong' | 'Limited' | 'Past delays' | 'Defaults'
  existingDebt: number
  loanAmount: number
  annualRate: number
  repayment: 'Monthly' | 'Seasonal' | 'Harvest-linked'
  rainfallAnomaly: number
  heatStress: number
  soilMoisture: number
  ndvi: number
  forecastRainfall: number
  marketPriceChange: number
  harvestDelay: number
}

export type RiskDriver = {
  label: string
  detail: string
  impact: number
  direction: 'risk' | 'protection'
}

export type RiskResult = {
  repaymentProbability: number
  baseProbability: number
  climateImpact: number
  riskCategory: 'Low' | 'Moderate' | 'High'
  expectedYield: number
  expectedRevenue: number
  totalDebt: number
  coverageRatio: number
  projectedSurplus: number
  drivers: RiskDriver[]
}

const cropPrices: Record<string, number> = {
  Cotton: 7200,
  Grapes: 18500,
  Maize: 2200,
  Soybean: 4800,
  Sugarcane: 3400,
  Wheat: 2600,
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))
export function calculateRisk(input: RiskInput): RiskResult {
  const price = cropPrices[input.crop] ?? 5000
  const climateStress =
    Math.abs(input.rainfallAnomaly) * 0.18 +
    input.heatStress * 2.2 +
    Math.max(0, 50 - input.soilMoisture) * 0.22 +
    Math.max(0, 0.62 - input.ndvi) * 24 +
    Math.max(0, -input.forecastRainfall) * 0.12 +
    input.harvestDelay * 0.16
  const resilience =
    (input.irrigation === 'Drip' ? 12 : input.irrigation === 'Borewell' ? 8 : input.irrigation === 'Canal' ? 5 : 0) +
    (input.creditHistory === 'Strong' ? 14 : input.creditHistory === 'Limited' ? 4 : input.creditHistory === 'Past delays' ? -8 : -20)
  const baseProbability = input.creditHistory === 'Strong' ? 88 : input.creditHistory === 'Limited' ? 76 : input.creditHistory === 'Past delays' ? 60 : 42
  const climateImpact = Math.round(climateStress * 0.72 - resilience * 0.35)
  const repaymentProbability = clamp(Math.round(baseProbability - climateImpact - input.existingDebt / 100000 + input.yieldVolatility * 0.08), 5, 98)
  const expectedYield = Math.max(0.1, input.historicalYield * (1 - climateStress / 180))
  const expectedRevenue = expectedYield * input.farmArea * price * (1 + input.marketPriceChange / 100)
  const cultivationCosts = input.farmArea * 52000 * (1 + climateStress / 250)
  const totalDebt = input.loanAmount * (1 + input.annualRate / 100) + input.existingDebt
  const projectedSurplus = expectedRevenue - cultivationCosts - totalDebt
  const coverageRatio = totalDebt ? Math.max(0, expectedRevenue / totalDebt) : 0
  const riskCategory = repaymentProbability < 55 ? 'High' : repaymentProbability < 75 ? 'Moderate' : 'Low'
  const drivers: RiskDriver[] = [
    { label: 'Soil moisture', detail: `${input.soilMoisture}% current moisture`, impact: Math.round(Math.max(0, 50 - input.soilMoisture) * 0.22), direction: (input.soilMoisture < 40 ? 'risk' : 'protection') as RiskDriver['direction'] },
    { label: 'Rainfall outlook', detail: `${input.forecastRainfall}% forecast anomaly`, impact: Math.round(Math.abs(input.forecastRainfall) * 0.12), direction: (input.forecastRainfall < 0 ? 'risk' : 'protection') as RiskDriver['direction'] },
    { label: 'Crop health (NDVI)', detail: `${input.ndvi.toFixed(2)} satellite vegetation index`, impact: Math.round(Math.max(0, 0.62 - input.ndvi) * 24), direction: (input.ndvi < 0.62 ? 'risk' : 'protection') as RiskDriver['direction'] },
    { label: 'Credit history', detail: `${input.creditHistory} repayment profile`, impact: Math.abs(input.creditHistory === 'Strong' ? 14 : input.creditHistory === 'Limited' ? 4 : input.creditHistory === 'Past delays' ? -8 : -20), direction: (input.creditHistory === 'Strong' ? 'protection' : 'risk') as RiskDriver['direction'] },
    { label: 'Irrigation resilience', detail: `${input.irrigation} irrigation`, impact: input.irrigation === 'Rain-fed' ? 0 : input.irrigation === 'Drip' ? 12 : 7, direction: (input.irrigation === 'Rain-fed' ? 'risk' : 'protection') as RiskDriver['direction'] },
    { label: 'Market price', detail: `${input.marketPriceChange}% crop price change`, impact: Math.round(Math.abs(input.marketPriceChange) * 0.2), direction: (input.marketPriceChange < 0 ? 'risk' : 'protection') as RiskDriver['direction'] },
  ]
    .filter(driver => driver.impact > 0)
    .sort((first, second) => second.impact - first.impact)
    .slice(0, 5)

  return { repaymentProbability, baseProbability, climateImpact, riskCategory, expectedYield, expectedRevenue, totalDebt, coverageRatio, projectedSurplus, drivers }
}
