'use client'

import { useState } from 'react'
import { AlertTriangle, Check, ChevronRight, FileText, Sprout, Upload, X } from 'lucide-react'
import { createWorker } from 'tesseract.js'

type ExtractedRecord = {
  farmerName: string
  surveyNumber: string
  area: string
  district: string
  taluka: string
  village: string
  landType: string
  ownership: string
}

const steps = ['Farmer details', 'Land records', 'Farm & crop', 'Financials', 'Collateral', 'Review']
const emptyRecord: ExtractedRecord = { farmerName: '', surveyNumber: '', area: '', district: '', taluka: '', village: '', landType: '', ownership: '' }

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim().replace(/\s+/g, ' ')
  }
  return ''
}

function parseLandRecordText(text: string): ExtractedRecord {
  const normalized = text.replace(/[|]/g, ':').replace(/\r/g, '\n')
  return {
    farmerName: firstMatch(normalized, [/(?:name of (?:the )?(?:occupant|holder|farmer)|khatedar|account holder)\s*[:\-]?\s*([A-Za-z][A-Za-z .]{2,})/i]),
    surveyNumber: firstMatch(normalized, [/(?:survey|gat|khasra)\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Za-z0-9\-/]+)/i]),
    area: firstMatch(normalized, [/(?:total )?(?:area|hectare|hectares)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i]),
    district: firstMatch(normalized, [/(?:district|zilla)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,})/i]),
    taluka: firstMatch(normalized, [/(?:taluka|tehsil)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,})/i]),
    village: firstMatch(normalized, [/(?:village|mouza)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,})/i]),
    landType: firstMatch(normalized, [/(?:land type|classification)\s*[:\-]?\s*([A-Za-z][A-Za-z /-]{2,})/i]),
    ownership: firstMatch(normalized, [/(?:ownership|cultivator status)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,})/i]),
  }
}

export function AssessmentWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1)
  const [record, setRecord] = useState<ExtractedRecord>(emptyRecord)
  const [farmerName, setFarmerName] = useState('')
  const [contact, setContact] = useState('')
  const [district, setDistrict] = useState('Pune')
  const [loanPurpose, setLoanPurpose] = useState('Seasonal crop cultivation')
  const [requestedLoan, setRequestedLoan] = useState('250000')
  const [crop, setCrop] = useState('Soybean')
  const [farmArea, setFarmArea] = useState('4.1')
  const [cultivatedArea, setCultivatedArea] = useState('3.2')
  const [irrigation, setIrrigation] = useState('Rain-fed')
  const [sowingDate, setSowingDate] = useState('')
  const [harvestDate, setHarvestDate] = useState('')
  const [yieldHistory, setYieldHistory] = useState('22')
  const [revenue, setRevenue] = useState('450000')
  const [costs, setCosts] = useState('185000')
  const [existingDebt, setExistingDebt] = useState('80000')
  const [creditHistory, setCreditHistory] = useState('Limited')
  const [collateral, setCollateral] = useState('Agricultural land')
  const [collateralValue, setCollateralValue] = useState('650000')
  const [landRecordFile, setLandRecordFile] = useState<File | null>(null)
  const [eightAFile, setEightAFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null)
  const [rawOcrText, setRawOcrText] = useState('')
  const [message, setMessage] = useState('')

  const updateRecord = (key: keyof ExtractedRecord, value: string) => setRecord(current => ({ ...current, [key]: value }))
  const runOcr = async () => {
    if (!landRecordFile || !eightAFile) {
      setMessage('Please upload both 7/12 and 8A scans before running OCR.')
      return
    }

    const unsupportedFiles = [landRecordFile, eightAFile].filter(file => !file.type.startsWith('image/'))
    if (unsupportedFiles.length > 0) {
      setMessage('OCR is enabled for JPG and PNG scans. Please upload image files for the browser OCR workflow.')
      return
    }

    setExtracting(true)
    setMessage('')
    try {
      const worker = await createWorker('eng')
      const [sevenTwelve, eightA] = await Promise.all([worker.recognize(landRecordFile), worker.recognize(eightAFile)])
      await worker.terminate()
      const rawText = `${sevenTwelve.data.text}\n${eightA.data.text}`
      const extractedRecord = parseLandRecordText(rawText)
      const confidence = Math.round((sevenTwelve.data.confidence + eightA.data.confidence) / 2)
      setRecord(extractedRecord)
      if (extractedRecord.farmerName) setFarmerName(extractedRecord.farmerName)
      if (extractedRecord.district) setDistrict(extractedRecord.district)
      if (extractedRecord.area) setFarmArea(extractedRecord.area)
      setExtracted(true)
      setOcrConfidence(confidence)
      setRawOcrText(rawText)
      setMessage(`OCR completed at ${confidence}% average confidence. Review every extracted value before continuing.`)
    } catch (error) {
      setMessage(error instanceof Error ? `OCR failed: ${error.message}` : 'OCR failed. Try a clearer JPG or PNG scan.')
    } finally {
      setExtracting(false)
    }
  }

  const input = (label: string, value: string, onChange: (value: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label>{label}<input {...props} value={value} onChange={event => onChange(event.target.value)} /></label>
  const select = (label: string, value: string, onChange: (value: string) => void, options: string[]) => <label>{label}<select value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>

  return <div className="page-stack"><div className="page-heading"><div><div className="eyebrow">APPLICATION INTAKE / LOCAL OCR</div><h1>New farmer assessment</h1><p>Build a transparent, reviewable assessment from land records through repayment capacity.</p></div><span className="step-count">Step {step} of 6</span></div><div className="progress-steps">{steps.map((label, index) => <div className={index + 1 <= step ? 'active' : ''} key={label}><span>{index + 1 < step ? <Check size={13} /> : index + 1}</span>{label}</div>)}</div><Card><SectionTitle icon={step === 2 ? Upload : step === 3 ? Sprout : FileText} title={['Farmer and application details', 'Land records — 7/12 and 8A', 'Farm and crop details', 'Financial and credit profile', 'Collateral and security', 'Review and generate'][step - 1]} description="Fields marked with * are required. OCR output is unverified until reviewed by an officer." />{step === 1 && <div className="form-grid large">{input('Farmer name *', farmerName, setFarmerName, { placeholder: 'e.g. Rajendra Deshmukh' })}{input('Contact number *', contact, setContact, { placeholder: '+91 98XXX XXXXX' })}{select('State', 'Maharashtra', () => undefined, ['Maharashtra'])}{select('District', district, setDistrict, ['Pune', 'Nashik', 'Latur', 'Solapur', 'Dharashiv'])}{input('Taluka', record.taluka, value => updateRecord('taluka', value), { placeholder: 'Enter taluka' })}{input('Village', record.village, value => updateRecord('village', value), { placeholder: 'Enter village' })}{select('Loan purpose', loanPurpose, setLoanPurpose, ['Seasonal crop cultivation', 'Farm equipment', 'Land improvement'])}{input('Requested loan amount *', requestedLoan, setRequestedLoan, { type: 'number' })}</div>}{step === 2 && <div className="record-upload-layout"><div className="upload-grid"><UploadPanel label="7/12 Extract" file={landRecordFile} setFile={setLandRecordFile} /><UploadPanel label="8A Extract" file={eightAFile} setFile={setEightAFile} /></div><div className="ocr-panel"><div><AlertTriangle size={17} /><strong>Local OCR extraction</strong></div><p>Image scans are processed in your browser using Tesseract.js. Upload both records, then review extracted farmer, survey, area, ownership and location details.</p><button className="button button-primary" disabled={!landRecordFile || !eightAFile || extracting} onClick={runOcr}>{extracting ? 'Reading records...' : 'Run OCR extraction'}</button>{ocrConfidence !== null && <small>Average OCR confidence: {ocrConfidence}%</small>}{message && <small className="workflow-message">{message}</small>}</div>{extracted && <div className="extraction-grid">{input('Farmer from record', record.farmerName, value => updateRecord('farmerName', value))}{input('Survey / Gat number', record.surveyNumber, value => updateRecord('surveyNumber', value))}{input('Recorded area (ha)', record.area, value => updateRecord('area', value))}{input('Land type', record.landType, value => updateRecord('landType', value))}{input('Ownership', record.ownership, value => updateRecord('ownership', value))}{input('Village', record.village, value => updateRecord('village', value))}<details className="raw-ocr"><summary>View raw OCR text</summary><pre>{rawOcrText}</pre></details></div>}</div>}{step === 3 && <div className="form-grid large">{input('Farm location / village', `${record.village}${record.taluka ? `, ${record.taluka}` : ''}`, value => updateRecord('village', value))}{input('Survey / Gat number', record.surveyNumber, value => updateRecord('surveyNumber', value))}{input('Total recorded area (ha)', farmArea, setFarmArea, { type: 'number', step: '0.1' })}{input('Cultivated area (ha)', cultivatedArea, setCultivatedArea, { type: 'number', step: '0.1' })}{select('Crop type', crop, setCrop, ['Soybean', 'Cotton', 'Sugarcane', 'Wheat', 'Maize', 'Grapes'])}{input('Sowing date', sowingDate, setSowingDate, { type: 'date' })}{input('Expected harvest date', harvestDate, setHarvestDate, { type: 'date' })}{select('Irrigation type', irrigation, setIrrigation, ['Rain-fed', 'Borewell', 'Canal', 'Drip'])}{input('Historical average yield (q/ha)', yieldHistory, setYieldHistory, { type: 'number' })}</div>}{step === 4 && <div className="form-grid large">{input('Expected gross crop revenue', revenue, setRevenue, { type: 'number' })}{input('Estimated cultivation costs', costs, setCosts, { type: 'number' })}{input('Existing debt obligations', existingDebt, setExistingDebt, { type: 'number' })}{select('Credit history', creditHistory, setCreditHistory, ['Strong', 'Limited', 'Past delays', 'Defaults'])}{select('Repayment structure', 'Harvest-linked', () => undefined, ['Monthly', 'Seasonal', 'Harvest-linked'])}{input('Annual interest rate (%)', '11.5', () => undefined, { type: 'number', step: '0.1' })}</div>}{step === 5 && <div className="form-grid large">{select('Collateral type', collateral, setCollateral, ['Agricultural land', 'Residential property', 'Equipment', 'Crop insurance'])}{input('Estimated collateral value', collateralValue, setCollateralValue, { type: 'number' })}{input('Collateral identifier / Gat number', record.surveyNumber, value => updateRecord('surveyNumber', value))}{select('Security status', 'Documents received', () => undefined, ['Documents received', 'Pending verification', 'Not available'])}<div className="demo-alert compact field-span"><AlertTriangle size={15} /><span>Collateral verification is a synthetic review state and does not establish legal ownership.</span></div></div>}{step === 6 && <div className="assessment-review"><div className="review-banner"><Check size={20} /><div><strong>Assessment ready for officer review</strong><span>OCR values, uploaded filenames, and manually entered financial details are shown below.</span></div></div><div className="review-grid"><ReviewItem label="Farmer" value={farmerName || record.farmerName || 'Not entered'} /><ReviewItem label="Land record" value={`${record.surveyNumber || 'Not extracted'} · ${record.area || farmArea} ha`} /><ReviewItem label="Crop and irrigation" value={`${crop} · ${irrigation}`} /><ReviewItem label="Requested loan" value={`₹${Number(requestedLoan || 0).toLocaleString('en-IN')}`} /><ReviewItem label="Credit history" value={creditHistory} /><ReviewItem label="Collateral" value={`${collateral} · ₹${Number(collateralValue || 0).toLocaleString('en-IN')}`} /></div><p className="review-note">Next step opens the explainable climate assessment. No funding decision is made automatically.</p></div>}</Card><div className="wizard-actions"><button className="button button-ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Back</button><button className="button button-outline" onClick={() => setMessage('Draft saved in this demo session.')}>Save draft</button>{step < 6 ? <button className="button button-primary" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={15} /></button> : <button className="button button-primary" onClick={onDone}>Open climate assessment <Check size={15} /></button>}</div></div>
}

function Card({ children }: { children: React.ReactNode }) { return <section className="card">{children}</section> }
function SectionTitle({ icon: Icon, title, description }: { icon: typeof Sprout; title: string; description: string }) { return <div className="section-title"><div className="icon-box"><Icon size={17} /></div><div><h2>{title}</h2><p>{description}</p></div></div> }
function ReviewItem({ label, value }: { label: string; value: string }) { return <div className="review-item"><span>{label}</span><strong>{value}</strong></div> }
function UploadPanel({ label, file, setFile }: { label: string; file: File | null; setFile: (value: File | null) => void }) { return <div className="upload-panel"><div className="upload-icon"><Upload size={20} /></div><strong>Upload {label}</strong><span>JPG or PNG image scans for local OCR</span><input type="file" accept=".jpg,.jpeg,.png" onChange={event => setFile(event.target.files?.[0] || null)} />{file && <div className="file-pill"><FileText size={14} />{file.name}<button type="button" aria-label={`Remove ${label}`} onClick={() => setFile(null)}><X size={14} /></button></div>}<small>OCR runs locally in the browser; the image is not uploaded to a server.</small></div> }
