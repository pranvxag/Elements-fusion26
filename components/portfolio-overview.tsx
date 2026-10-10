'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Check, CloudRain, FileText, Plus, ShieldCheck } from 'lucide-react'
import { calculateRisk, type RiskInput } from '@/lib/risk-engine'

type DashboardApplication = {
  id: string
  reference: string
  farmerName: string
  crop: string
  requestedAmount: number
  status: string
  repaymentProbability: number
  riskCategory: 'Low' | 'Moderate' | 'High'
}

type DashboardData = {
  applications: DashboardApplication[]
  metrics: {
    applications: number
    activeFacilities: number
    approvedLimit: number
    amountDisbursed: number
    pendingReview: number
    elevatedClimateExposure: number
    completionRate: number
  }
  statusCounts: Record<string, number>
  riskCounts: Record<'Low' | 'Moderate' | 'High', number>
}

const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

function Card({ children }: { children: React.ReactNode }) {
  return <section className="card">{children}</section>
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) {
  return <div className="section-title"><div className="icon-box"><Icon size={17} /></div><div><h2>{title}</h2><p>{description}</p></div></div>
}

export function PortfolioOverview({ setPage, input }: { setPage: (page: string) => void; input: RiskInput }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const result = useMemo(() => calculateRisk(input), [input])

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json() as DashboardData & { error?: string }
        if (!response.ok) throw new Error(payload.error || 'Unable to load the portfolio.')
        setDashboard(payload)
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Unable to load the portfolio.'))
  }, [])

  if (error) return <div className="page-stack"><div className="auth-error">{error}</div></div>
  if (!dashboard) return <div className="auth-loading">Loading portfolio...</div>

  const pipeline = Object.entries(dashboard.statusCounts)
  const totalRisk = Math.max(1, dashboard.metrics.applications)
  return <div className="page-stack">
    <div className="page-heading"><div><div className="eyebrow">PORTFOLIO OVERVIEW / LIVE WORKSPACE</div><h1>Good morning, Loan Officer</h1><p>Monitor applications, climate exposure, and explainable repayment risk from the operational store.</p></div><button className="button button-primary" onClick={() => setPage('New Assessment')}><Plus size={16} /> New assessment</button></div>
    <div className="demo-alert compact"><CloudRain size={16} /><span>Risk scores are calculated from the application record and the current engine. External climate adapters can be added without changing the workflow.</span></div>
    <div className="kpi-grid">
      <Card><div className="kpi-top"><div className="icon-box"><ShieldCheck size={17} /></div><span className="demo-label">SELECTED MODEL</span></div><strong className="kpi-value">{result.repaymentProbability}%</strong><span className="kpi-label">Current assessment probability</span><span className="kpi-delta">{result.riskCategory} exposure</span></Card>
      <Card><div className="kpi-top"><div className="icon-box"><CloudRain size={17} /></div><span className="demo-label">CLIMATE RISK</span></div><strong className="kpi-value">{dashboard.metrics.elevatedClimateExposure}</strong><span className="kpi-label">Applications needing climate attention</span><span className="kpi-delta">{dashboard.riskCounts.High} high · {dashboard.riskCounts.Moderate} moderate</span></Card>
      <Card><div className="kpi-top"><div className="icon-box"><FileText size={17} /></div><span className="demo-label">APPLICATIONS</span></div><strong className="kpi-value">{dashboard.metrics.applications}</strong><span className="kpi-label">Applications in the operational store</span><span className="kpi-delta">{dashboard.metrics.pendingReview} pending review</span></Card>
      <Card><div className="kpi-top"><div className="icon-box"><Check size={17} /></div><span className="demo-label">FACILITIES</span></div><strong className="kpi-value">{dashboard.metrics.activeFacilities}</strong><span className="kpi-label">Active loan facilities</span><span className="kpi-delta">{money(dashboard.metrics.amountDisbursed)} disbursed</span></Card>
    </div>
    <div className="two-col">
      <Card><SectionTitle icon={BarChart3} title="Application pipeline" description="Live counts grouped by persisted status." />{pipeline.length ? pipeline.map(([label, value]) => <div className="bar-row" key={label}><span>{label}</span><div className="bar-track"><div style={{ width: `${value / Math.max(...pipeline.map(([, count]) => count), 1) * 100}%` }} /></div><b>{value}</b></div>) : <div className="empty"><p>No applications have been submitted yet.</p></div>}</Card>
      <Card><SectionTitle icon={CloudRain} title="Portfolio climate exposure" description="Risk categories produced by the shared engine." />{(['Low', 'Moderate', 'High'] as const).map(category => <div className="exposure-row" key={category}><div><span className={`dot ${category === 'Low' ? 'green' : category === 'Moderate' ? 'amber' : 'orange'}`} />{category}<b>{dashboard.riskCounts[category]}</b></div><div className="exposure-track"><i className={category === 'Low' ? 'green' : category === 'Moderate' ? 'amber' : 'orange'} style={{ width: `${dashboard.riskCounts[category] / totalRisk * 100}%` }} /></div></div>)}</Card>
    </div>
    <Card><div className="table-header"><SectionTitle icon={FileText} title="Applications needing review" description="Sorted by climate-adjusted repayment probability." /><button className="button button-ghost" onClick={() => setPage('Applications Review')}>Open review queue</button></div><div className="table-wrap"><table><thead><tr><th>Application</th><th>Farmer</th><th>Crop</th><th>Requested loan</th><th>Probability</th><th>Status</th></tr></thead><tbody>{dashboard.applications.slice(0, 8).map(application => <tr key={application.id}><td><strong>{application.reference}</strong><small>{application.id}</small></td><td>{application.farmerName}</td><td>{application.crop}</td><td>{money(application.requestedAmount)}</td><td><strong>{application.repaymentProbability}%</strong></td><td><span className={`badge badge-${application.riskCategory.toLowerCase()}`}>{application.status}</span></td></tr>)}</tbody></table></div></Card>
  </div>
}
