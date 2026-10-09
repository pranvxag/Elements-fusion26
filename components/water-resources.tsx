import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Construction,
  Droplets,
  MapPin,
  Satellite,
  Waves,
} from 'lucide-react'

type WaterClass = 'Natural' | 'Artificial / Man-Made' | 'Unknown'
type WaterResource = {
  id: string
  name: string
  feature: string
  classification: WaterClass
  evidence: string
  distanceKm: number
  direction: string
  captureDate: string
  confidence: number | null
  status: 'Detected' | 'Requires Verification'
  source: string
  position: { left: string; top: string }
}

const demoResources: WaterResource[] = [
  { id: 'pond', name: 'Constructed farm pond', feature: 'Farm pond', classification: 'Artificial / Man-Made', evidence: 'Visible water body', distanceKm: 0.6, direction: 'East', captureDate: '2025-10-18', confidence: 0.84, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '68%', top: '48%' } },
  { id: 'natural-pond', name: 'Natural pond', feature: 'Natural pond', classification: 'Natural', evidence: 'Visible water body', distanceKm: 1.8, direction: 'South-west', captureDate: '2025-10-18', confidence: 0.81, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '27%', top: '61%' } },
  { id: 'canal', name: 'Irrigation canal', feature: 'Canal', classification: 'Artificial / Man-Made', evidence: 'Visible water body', distanceKm: 1.4, direction: 'South-east', captureDate: '2025-10-18', confidence: 0.91, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '76%', top: '73%' } },
  { id: 'tank', name: 'Farm storage tank', feature: 'Water storage structure', classification: 'Artificial / Man-Made', evidence: 'Structure visible; water presence not established', distanceKm: 0.9, direction: 'North-west', captureDate: '2025-10-18', confidence: null, status: 'Requires Verification', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '29%', top: '30%' } },
  { id: 'stream', name: 'Seasonal stream', feature: 'Stream', classification: 'Natural', evidence: 'Visible water body', distanceKm: 2.7, direction: 'North', captureDate: '2025-10-18', confidence: 0.78, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '54%', top: '17%' } },
  { id: 'wetland', name: 'Natural wetland', feature: 'Wetland', classification: 'Natural', evidence: 'Visible wetland extent', distanceKm: 3.1, direction: 'South-west', captureDate: '2025-10-18', confidence: 0.74, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '20%', top: '72%' } },
  { id: 'unknown', name: 'Unclassified surface feature', feature: 'Possible water body', classification: 'Unknown', evidence: 'Low-resolution feature is ambiguous', distanceKm: 2.2, direction: 'West', captureDate: '2025-10-18', confidence: 0.56, status: 'Requires Verification', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '12%', top: '46%' } },
  { id: 'lake', name: 'Village lake', feature: 'Lake', classification: 'Natural', evidence: 'Visible water body', distanceKm: 4.4, direction: 'North-east', captureDate: '2025-10-18', confidence: 0.96, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '82%', top: '22%' } },
  { id: 'river', name: 'River reach', feature: 'River', classification: 'Natural', evidence: 'Visible water body', distanceKm: 6.3, direction: 'North-west', captureDate: '2025-10-18', confidence: 0.93, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '39%', top: '10%' } },
  { id: 'reservoir', name: 'Storage reservoir', feature: 'Reservoir', classification: 'Artificial / Man-Made', evidence: 'Visible water body', distanceKm: 5.2, direction: 'South', captureDate: '2025-10-18', confidence: 0.88, status: 'Detected', source: 'Synthetic demo fixture; not satellite imagery', position: { left: '46%', top: '86%' } },
]

function getAssessment(demoMode: boolean, proximityKm: number) {
  if (!demoMode) return { points: null, qualifyingCount: 0 }
  const qualifyingCount = demoResources.filter(resource =>
    resource.status === 'Detected' && resource.classification !== 'Unknown' && resource.distanceKm <= proximityKm,
  ).length
  return { points: qualifyingCount > 0 ? 1 : 0, qualifyingCount }
}

export function WaterAssessmentSummary({ demoMode, proximityKm }: { demoMode: boolean; proximityKm: number }) {
  const assessment = getAssessment(demoMode, proximityKm)
  return <div className="water-assessment-summary">
    <div className="water-summary-icon"><Droplets size={16} /></div>
    <div className="water-summary-copy">
      <strong>Nearby water-resource factor</strong>
      <span>{demoMode ? assessment.points ? '+1 supporting point (demo only)' : '0 supporting points in demo results' : 'Unable to Verify'}</span>
      <small>{demoMode ? `${assessment.qualifyingCount} qualifying demo resource${assessment.qualifyingCount === 1 ? '' : 's'} within ${proximityKm} km; counted once.` : 'No live imagery provider is connected. No point assigned; this is not a zero-risk finding.'}</small>
    </div>
  </div>
}

export default function WaterResourcesPanel({
  demoMode,
  setDemoMode,
  proximityKm,
  setProximityKm,
}: {
  demoMode: boolean
  setDemoMode: (enabled: boolean) => void
  proximityKm: number
  setProximityKm: (distance: number) => void
}) {
  const [selectedId, setSelectedId] = useState('pond')
  const resources = demoMode ? demoResources : []
  const selected = resources.find(resource => resource.id === selectedId)

  return <div className="page-stack water-page">
    <div className="page-heading">
      <div><div className="eyebrow">CLIMATE INTELLIGENCE / WATER RESOURCES</div><h1>Water resource detection</h1><p>Review visible natural water bodies and constructed storage near the farm.</p></div>
      <label className="water-threshold">Proximity threshold<select value={proximityKm} onChange={event => setProximityKm(Number(event.target.value))}><option value={1}>1 km</option><option value={2}>2 km</option><option value={5}>5 km</option><option value={10}>10 km</option></select></label>
    </div>

    <div className="water-mode-row" role="tablist" aria-label="Imagery result mode">
      <button className={!demoMode ? 'active' : ''} role="tab" aria-selected={!demoMode} onClick={() => setDemoMode(false)}><Satellite size={15} /> Live imagery</button>
      <button className={demoMode ? 'active' : ''} role="tab" aria-selected={demoMode} onClick={() => setDemoMode(true)}><Waves size={15} /> Demo examples</button>
      <span className={demoMode ? 'water-mode-badge demo' : 'water-mode-badge'}>{demoMode ? 'SYNTHETIC DATA' : 'NOT CONNECTED'}</span>
    </div>

    {!demoMode && <div className="water-unavailable" role="status">
      <AlertTriangle size={19} />
      <div><strong>Unable to Verify</strong><p>No satellite imagery provider is configured. No detections, capture dates, confidence values, or water-resource points are being inferred.</p></div>
    </div>}

    {demoMode && <div className="water-demo-warning"><AlertTriangle size={16} /><span>DEMO ONLY — These records are synthetic examples, not satellite observations or evidence about a real farm.</span></div>}

    <WaterAssessmentSummary demoMode={demoMode} proximityKm={proximityKm} />

    {demoMode && <section className="water-map-section" aria-label="Schematic demo map and detected resources">
      <div className="water-map-heading"><div><h2>Nearby resource map</h2><p>Schematic positions only. Not georeferenced or based on imagery.</p></div><span>{resources.length} demo features</span></div>
      <div className="water-map" role="group" aria-label="Illustrative schematic map">
        <div className="water-map-grid" />
        <div className="water-farm-marker"><MapPin size={18} /><strong>Farmland</strong><span>Reference point</span></div>
        {resources.map(resource => <button key={resource.id} className={`water-map-marker ${resource.classification === 'Natural' ? 'natural' : resource.status === 'Requires Verification' ? 'verify' : 'artificial'} ${selectedId === resource.id ? 'selected' : ''}`} style={resource.position} title={`${resource.name}, ${resource.distanceKm} km ${resource.direction}`} onClick={() => setSelectedId(resource.id)} aria-label={`${resource.name}, ${resource.distanceKm} kilometers ${resource.direction}`}><span /></button>)}
        <div className="water-map-scale"><span /> Approximate proximity, not to scale</div>
      </div>
      <div className="water-map-legend"><span><i className="natural" />Natural</span><span><i className="artificial" />Artificial / Man-Made</span><span><i className="verify" />Requires Verification</span></div>
    </section>}

    {demoMode && selected && <div className="water-selected-note"><MapPin size={15} /><span>Selected: <strong>{selected.name}</strong>, approximately {selected.distanceKm} km {selected.direction} of the farmland.</span></div>}

    <div className="water-resource-heading"><div><h2>{demoMode ? 'Demo detections' : 'Detections'}</h2><p>{demoMode ? 'Illustrative records for reviewing classification and evidence handling.' : 'No imagery results available.'}</p></div></div>
    {demoMode && <div className="water-resource-list">{resources.map(resource => {
      const qualifies = resource.status === 'Detected' && resource.classification !== 'Unknown' && resource.distanceKm <= proximityKm
      return <article className={`water-resource ${selectedId === resource.id ? 'selected' : ''}`} key={resource.id} onClick={() => setSelectedId(resource.id)}>
        <div className={`water-resource-icon ${resource.classification === 'Natural' ? 'natural' : resource.status === 'Requires Verification' ? 'verify' : 'artificial'}`}>{resource.feature === 'Water storage structure' ? <Construction size={17} /> : resource.classification === 'Natural' ? <Waves size={17} /> : <Droplets size={17} />}</div>
        <div className="water-resource-main"><div className="water-resource-title"><h3>{resource.name}</h3><span className={`water-class ${resource.classification === 'Natural' ? 'natural' : resource.classification === 'Unknown' ? 'unknown' : 'artificial'}`}>{resource.classification}</span><span className={`water-verify ${resource.status === 'Detected' ? 'detected' : ''}`}>{resource.status}</span></div>
          <div className="water-resource-meta"><span>{resource.feature}</span><span>{resource.distanceKm.toFixed(1)} km {resource.direction}</span><span>{resource.evidence}</span>{qualifies && <span className="water-qualifies"><Check size={12} />Within threshold</span>}</div>
          <div className="water-resource-source"><span>Capture date: {resource.captureDate} <em>(simulated)</em></span><span>Confidence: {resource.confidence === null ? 'Not assessed' : `${Math.round(resource.confidence * 100)}% (simulated)`}</span><span>Source: {resource.source}</span></div>
        </div>
      </article>
    })}</div>}

    <div className="water-guardrail"><CircleHelp size={16} /><p><strong>Assessment guardrail</strong> A nearby resource contributes at most one supporting point, regardless of the number of detections. Structures do not imply stored water unless visible water is verified. This factor does not guarantee approval; the bank officer makes the final decision.</p></div>
  </div>
}