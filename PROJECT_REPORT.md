# AgriRisk Intelligence

## Official Project Report

**Report date:** 9 October 2026  
**Project type:** Climate-aware agricultural lending decision-support platform  
**Current release:** Hackathon/demo implementation  
**Application URL in local development:** `http://localhost:3000`

---

## 1. Executive Summary

AgriRisk Intelligence is a web-based agricultural lending platform designed to help farmers and financial institutions make more informed, transparent, and climate-aware crop-finance decisions.

The platform combines:

- Farmer and land-record intake
- Browser-based OCR for 7/12 and 8A land-record scans
- Farm, crop, financial, collateral, and credit-profile capture
- Climate-adjusted repayment scenario analysis
- Explainable risk drivers instead of an opaque score
- Loan facilities divided into crop-cycle stages
- Evidence-based tranche review and release workflows
- Separate farmer and bank-officer portals
- Local audit history and synthetic disbursement ledger records

The current implementation is intentionally a demonstration system. It uses synthetic records, a local JSON data store, local browser OCR, and simulated transactions. It does not currently connect to government land-record services, banking systems, payment providers, live satellite feeds, weather services, credit bureaus, or production document storage.

---

## 2. Project Objectives

The project addresses a practical challenge in agricultural lending: a farmer’s ability to repay can change significantly because of rainfall, heat, soil moisture, crop health, market prices, harvest timing, and irrigation resilience.

The main objectives are to:

1. Create a structured digital intake process for agricultural loan applications.
2. Reduce manual entry by extracting information from land-record documents.
3. Add climate and crop-condition context to repayment assessment.
4. Make lending decisions explainable to officers and applicants.
5. Release approved capital in crop-cycle stages rather than as a single payment.
6. Require evidence before later-stage disbursements.
7. Give farmers visibility into applications, approvals, disbursements, and outstanding amounts.
8. Provide bank officers with a centralized operational workspace.
9. Preserve an audit trail for important application, review, and disbursement events.
10. Establish a foundation for future integrations with official agricultural, financial, climate, and payment systems.

---

## 3. Target Users and Applications

### 3.1 Farmer Application

The farmer portal is a self-service workspace for agricultural borrowers. A farmer can:

- Create an account or sign in.
- Submit a crop-loan application.
- Provide contact, location, crop, farm-area, irrigation, yield, income, cost, debt, and credit-history information.
- Upload supporting documents.
- View the status of submitted applications.
- View approved facilities and their financial summaries.
- Track disbursed amounts and outstanding principal.
- Upload crop-progress evidence after a tranche has been disbursed.
- Sign out through a session-controlled workflow.

The portal is intended to improve transparency by showing farmers what has been submitted, what has been approved, and which crop-stage requirements remain incomplete.

### 3.2 Bank Officer Application

The bank-officer workspace supports lending operations and review. An officer can:

- View applications submitted by farmers.
- Review applicant, crop, financial, document, and climate-related information.
- Request additional documents.
- Reject an application with an officer note.
- Approve an application and create a loan facility.
- Configure an approved amount, annual rate, repayment structure, and tranche plan.
- Review required evidence for a crop-stage tranche.
- Approve, hold, decline, cancel, or release eligible tranches.
- Add planned tranches to an existing facility.
- View facility summaries, disbursements, repayments, ledger entries, and audit events.
- Use scenario and climate-intelligence screens to understand risk drivers.

### 3.3 Shared Decision-Support Application

The shared interface provides the following operational screens:

- Overview
- Loan Applications
- Applications Review
- Loan Facilities
- New Assessment
- Climate Intelligence
- Scenario Simulator
- Collateral and Documents
- Portfolio Analytics
- Reports
- Settings

Some screens are fully implemented demo workflows, while others currently act as presentation/navigation surfaces for future modules. The current implementation should not be described as having live portfolio analytics, live reports, or connected climate feeds.

---

## 4. End-to-End Business Workflow

### Step 1: User authentication

The user signs in as either a Farmer or Bank Officer. New users can register for either portal. The application creates an HTTP-only local session cookie and uses role checks to control access.

### Step 2: Farmer application intake

The farmer enters:

- Personal and contact information
- State, district, taluka, village, and location details
- Loan purpose and requested amount
- Farm area and cultivated area
- Crop type and irrigation type
- Sowing and expected harvest dates
- Historical yield
- Expected revenue and cultivation costs
- Existing debt
- Credit history
- Collateral type and estimated value

### Step 3: Land-record document processing

The assessment wizard accepts separate 7/12 and 8A document uploads. For supported JPG and PNG scans, Tesseract.js runs in the browser and attempts to extract:

- Farmer or account-holder name
- Survey, Gat, or Khasra number
- Recorded area
- District
- Taluka
- Village
- Land classification
- Ownership or cultivator status

The extracted values remain editable. The user can view the raw OCR text and the average OCR confidence. The interface clearly identifies OCR output as unverified and requiring officer review.

### Step 4: Explainable assessment

The platform calculates a climate-adjusted repayment estimate using farm, credit, financial, climate, crop-health, and market inputs. The result includes:

- Base repayment probability
- Climate impact adjustment
- Final repayment probability
- Low, Moderate, or High risk category
- Expected yield
- Expected revenue
- Total debt
- Coverage ratio
- Projected repayment surplus or shortfall
- Top risk and protection drivers

No funding decision is made automatically by the assessment wizard. It opens a decision-support view for review.

### Step 5: Officer review and decision

The bank officer can:

- Approve the application
- Reject the application
- Request additional documents

When approved, the system creates a facility and a staged tranche schedule. The default schedule divides the approved limit across five crop-cycle stages:

1. Seeds and sowing
2. Crop inputs or vegetative growth
3. Crop protection or flowering
4. Irrigation and maintenance or canopy development
5. Harvest preparation

### Step 6: Evidence-based facility operation

Each tranche has a status and may contain required evidence. The modeled status flow is:

`Planned → Pending Review → Approved for Release → Disbursed`

Other supported states include:

- On Hold
- Declined
- Cancelled

Required evidence must be received before a tranche can be approved or released. After a tranche is disbursed, the farmer can upload crop-progress evidence.

### Step 7: Simulated disbursement and audit

An approved tranche can be released through the demo ledger. The system records:

- A synthetic transaction ID
- Amount
- Payment method label
- Destination reference
- Approving officer
- Disbursement timestamp
- Immutable-style ledger entry
- Audit event

The demo explicitly indicates that no real payment provider is called.

---

## 5. Current Features

### 5.1 Authentication and access control

- Farmer and Bank Officer account types
- Local account registration
- Local sign-in and sign-out
- HTTP-only session cookie
- Eight-hour local session duration
- Password hashing using salted `scrypt`
- Role-based portal routing
- Permission checks for facility, tranche, application, evidence, and audit operations
- Demo accounts for evaluation

The current authentication design is suitable for a local demonstration, not for production identity management.

### 5.2 Six-step farmer assessment wizard

The assessment wizard provides six steps:

1. Farmer details
2. Land records
3. Farm and crop
4. Financials
5. Collateral
6. Review

The final review presents key values before the user opens the climate assessment.

### 5.3 Browser-based OCR

- Uses Tesseract.js version 7
- Processes selected land-record images in the browser
- Accepts JPG and PNG scans for OCR
- Shows average OCR confidence
- Shows raw OCR text
- Allows extracted values to be corrected
- Does not send OCR images to the application server

Current OCR limitations:

- PDF OCR is not enabled in the assessment wizard.
- English trained data is used.
- Marathi and other regional-language trained data are not enabled.
- OCR output is not a legal or official verification.
- OCR quality depends on scan quality, image orientation, handwriting, and document layout.

### 5.4 Climate-adjusted risk engine

The current risk engine accepts:

- Crop
- Farm area
- Irrigation type
- Historical yield
- Yield volatility
- Credit history
- Existing debt
- Requested loan amount
- Annual interest rate
- Repayment structure
- Rainfall anomaly
- Heat stress
- Soil moisture
- NDVI crop-health index
- Forecast rainfall anomaly
- Market price change
- Harvest delay

It applies deterministic, transparent calculations to produce a repayment estimate. The implementation includes crop price assumptions for Cotton, Grapes, Maize, Soybean, Sugarcane, and Wheat, with a fallback price for unknown crops.

The risk result is intended for explainability and scenario comparison. It is explicitly labeled in the interface as an illustrative hackathon model and not as a validated credit score.

### 5.5 Climate intelligence view

The climate-intelligence interface presents modeled signals for:

- Satellite crop health
- Soil moisture
- Rainfall forecast
- Heat stress

It also shows:

- A synthetic farm exposure map
- A risk-contribution summary
- Base probability
- Climate adjustment
- Current repayment estimate
- Top explainable drivers

The current values are synthetic or selected from scenario inputs. Source adapters are described as future-ready, but live satellite, weather, and soil integrations are not connected.

### 5.6 Scenario simulator

The simulator allows an officer to change model inputs interactively and observe the effect on:

- Repayment probability
- Risk category
- Expected yield
- Expected revenue
- Debt burden
- Coverage ratio
- Projected cash flow
- Risk and protection drivers

Predefined demo scenarios include resilient irrigation, baseline soybean, drought exposure, heat-stress cotton, and flood/price shock conditions.

### 5.7 Loan facility management

Facilities contain:

- Facility reference
- Farmer name
- District
- Crop
- Farm area
- Approved limit
- Annual interest rate
- Repayment structure
- Approval timestamp
- Facility status
- Crop-cycle tranches

Facility summaries calculate:

- Approved limit
- Amount disbursed
- Remaining amount to disburse
- Outstanding principal
- Principal repaid
- Interest due
- Pending review count

The current summary does not calculate real overdue balances because repayment posting and due-date logic are not fully implemented.

### 5.8 Tranche and evidence management

- Crop-stage tranche schedule
- Positive whole-rupee amount validation
- Facility-limit validation
- Allowed status transitions
- Required evidence checks
- Officer review observations and reasons
- Release idempotency key support
- Synthetic transaction and ledger creation
- Farmer crop-progress evidence upload after disbursement
- JPG, PNG, and PDF evidence upload support
- Ten-megabyte upload limit

### 5.9 Application and document APIs

The current application includes API routes for:

- Registration
- Login
- Logout
- Current-user lookup
- Application creation and listing
- Application document upload
- Application approval, rejection, and document requests
- Facility creation and listing
- Facility details
- Tranche schedule update
- Tranche creation
- Tranche review and release
- Post-disbursement tranche evidence upload

### 5.10 Audit and local ledger records

Important actions are recorded as audit events, including:

- Application submission
- Document upload
- Facility approval
- Tranche schedule changes
- Tranche review actions
- Disbursement release
- Crop evidence upload

The local store also contains synthetic disbursement, repayment, and ledger collections. Repayment records are part of the domain model, although the current user interface does not provide a complete live repayment-posting workflow.

---

## 6. Technical Architecture

### 6.1 Frontend

- React 19
- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4 and project CSS
- Lucide React icons
- Client-side interactive workflows
- Responsive portal and dashboard components

Main frontend areas:

- `app/page.tsx`: officer dashboard and shared application views
- `components/auth-portals.tsx`: authentication, farmer portal, and farmer workflows
- `components/assessment-wizard.tsx`: six-step assessment and local OCR
- `app/globals.css`: visual system and responsive styling

### 6.2 Backend

- Next.js Route Handlers
- TypeScript domain types and validation helpers
- File-system persistence for the demo
- HTTP-only cookie sessions
- Server-side authorization checks
- Atomic temporary-file replacement for local store updates

### 6.3 Data persistence

The runnable demo stores records in:

- `data/loan-store.json`
- `data/uploads/` for uploaded documents and evidence

The repository also includes a PostgreSQL migration blueprint in `db/schema.sql` covering:

- Loan facilities
- Tranches
- Disbursements
- Repayments
- Ledger entries
- Audit events

The PostgreSQL schema is a production migration starting point, not the active persistence layer in the current demo.

### 6.4 Domain and validation layer

The domain layer defines:

- User roles
- Portal roles
- Facility states
- Tranche states
- Evidence requirements
- Disbursements
- Repayments
- Ledger entries
- Audit events
- Applications
- Facility summaries
- Allowed tranche transitions

Validation helpers enforce required text, positive amounts, valid transitions, and required reasons for selected officer actions.

---

## 7. Current Technology Stack

| Area | Technology |
|---|---|
| Application framework | Next.js 16 |
| UI library | React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 4, CSS modules/global project CSS |
| Icons | Lucide React |
| OCR | Tesseract.js 7 |
| Password hashing | Node.js `scrypt` |
| Session model | Local HTTP-only cookie session |
| Demo database | JSON file store |
| Production database blueprint | PostgreSQL |
| Package manager | pnpm 12 |
| Runtime requirement | Node.js 20 or newer |

---

## 8. Security and Privacy Position

### Current safeguards

- Passwords are stored as salted `scrypt` hashes.
- Sessions are represented by random identifiers.
- Session cookies are HTTP-only and use `SameSite=Lax`.
- Portal and permission checks are applied to protected APIs.
- Farmer application and facility records are filtered by authenticated user.
- Upload MIME types and file sizes are validated.
- Stored upload filenames are randomized.
- Original filenames are sanitized before being stored in metadata.
- Important workflow changes generate audit entries.
- OCR files are processed in the browser rather than uploaded by the OCR workflow.

### Current security limitations

The demo should not be used with real personal, land, financial, or banking data because:

- The JSON file store is not designed for concurrent production workloads.
- There is no managed secrets or session-secret configuration in active use.
- The demo has no production identity provider or multi-factor authentication.
- There is no malware scanning or content-disarm-and-reconstruction process for uploads.
- There is no formal document access/download service with production authorization controls.
- There is no encryption-at-rest design for the local data files.
- There is no comprehensive rate limiting, monitoring, alerting, or incident-response integration.
- The risk model has not been validated, calibrated, or approved for regulated credit decisions.
- Transactions are simulated and do not move money.

---

## 9. Current Limitations and Non-Implemented Areas

The following statements are important for an official report:

1. The system is a hackathon/demo implementation.
2. All included records and transactions are synthetic.
3. The active store is a local JSON file, not a production database.
4. Government land-record APIs are not connected.
5. Banking-core systems are not connected.
6. Payment gateways and UPI/bank-transfer providers are not connected.
7. Credit-bureau data is not connected.
8. Satellite, weather, and soil sensors are not connected to live data.
9. Climate values shown in the dashboard are demo/scenario inputs.
10. The risk engine is illustrative and not a validated credit score.
11. PDF OCR is not available in the six-step assessment wizard.
12. Regional-language OCR is not enabled.
13. Automated legal ownership verification is not available.
14. Insurance-policy validation and claim processing are not available.
15. Full repayment collection, overdue calculation, and reconciliation are not complete.
16. Portfolio analytics and reporting screens are not connected to a production analytics pipeline.
17. Notifications through SMS, email, WhatsApp, or push channels are not integrated.
18. No automatic funding decision is made by the current assessment wizard.

---

## 10. Recommended Future Integrations

### 10.1 Production identity and access management

Integrate a managed identity service or bank-approved authentication platform for:

- Verified farmer and officer identities
- Multi-factor authentication
- Password-reset workflows
- Device and session management
- Stronger role and branch-level authorization
- Single sign-on for bank staff
- Comprehensive authentication logs

### 10.2 Production database and storage

Replace the JSON store with PostgreSQL or an approved relational database. Add:

- Database migrations
- Transaction isolation
- Foreign keys and database constraints
- Row-level access policies
- Backup and recovery
- Read replicas where required
- Managed object storage for documents and evidence
- Encryption at rest and in transit

The existing `db/schema.sql` can be expanded into the first production migration set.

### 10.3 Government land-record integration

Subject to state and government approvals, integrate official services for:

- 7/12 record retrieval
- 8A record retrieval
- Survey/Gat number verification
- Ownership and cultivator status
- Mutation history
- Land-area consistency checks
- Digital-signature or source-verification metadata

OCR should remain a fallback for documents that cannot be retrieved electronically, rather than being treated as the authoritative ownership source.

### 10.4 Multilingual and production document intelligence

Improve document processing through:

- Marathi and other regional-language OCR
- PDF rendering and OCR
- Automatic page orientation and image enhancement
- Table and form-layout extraction
- Field-level confidence scores
- Duplicate-document detection
- Document classification
- Human review queues
- Tamper and forgery indicators
- Virus and malware scanning
- Encrypted document storage

### 10.5 Live climate and earth-observation integrations

Connect approved providers for:

- Satellite imagery and NDVI
- Soil-moisture estimates
- Weather forecasts
- Historical rainfall
- Temperature and heat-stress indicators
- Flood, drought, cyclone, and extreme-weather alerts
- Geospatial farm-boundary validation
- Crop-stage monitoring

The platform should store data source, timestamp, geographic resolution, confidence, and model version for every external signal.

### 10.6 Agricultural market integrations

Integrate trusted market and agricultural data for:

- Crop prices
- Market arrivals
- Commodity price trends
- Procurement and minimum-support-price references
- Local mandi prices
- Expected harvest timing
- Input-cost benchmarks

This will improve the revenue and market-shock portions of the scenario model.

### 10.7 Banking and payment integrations

Integrate with approved banking systems for:

- Customer and account verification
- Account ownership validation
- Facility creation in the core lending system
- Real disbursement instructions
- UPI or bank-transfer execution
- Payment status callbacks
- Transaction reconciliation
- Repayment posting
- Interest accrual
- Overdue and delinquency calculations
- Reversals and exception handling

The current demo ledger should be replaced with a controlled integration layer and immutable transaction references.

### 10.8 Credit and financial-data integrations

Potential integrations include:

- Credit bureau reports
- Open-banking or account-aggregator consent flows
- Existing-loan exposure
- Bank-statement analysis
- Income and cash-flow verification
- Farmer-producer organization records
- Government benefit and subsidy information

All such integrations should use explicit consent, data minimization, retention policies, and regulatory review.

### 10.9 Crop insurance and risk-transfer products

Integrate insurance providers or government crop-insurance services for:

- Policy discovery
- Policy validation
- Premium status
- Coverage details
- Weather-index triggers
- Claim initiation
- Claim status
- Insurance proceeds reconciliation

Insurance data can reduce uncovered climate exposure and support more responsible facility decisions.

### 10.10 Notifications and communication

Add:

- SMS application-status notifications
- Email notices
- WhatsApp notifications where permitted
- Push notifications
- Document-request reminders
- Tranche approval and release notifications
- Weather-risk alerts
- Repayment reminders
- Officer task queues and escalations

Messages should be multilingual and logged for compliance.

### 10.11 Analytics, reporting, and governance

Develop production reporting for:

- Approval and rejection rates
- Time to decision
- Document turnaround time
- Disbursement performance
- Repayment and delinquency
- Climate exposure
- Portfolio concentration
- Crop and district performance
- Farmer outcomes
- Model performance and calibration
- Fairness and adverse-impact monitoring

Reports should support export, role-based visibility, period filters, and reproducible data snapshots.

### 10.12 Model governance and responsible lending

Before using the risk engine for real credit decisions:

- Calibrate it against historical outcomes.
- Validate results by crop, district, season, and farmer segment.
- Test for bias and unintended exclusion.
- Add model versioning and approval controls.
- Preserve input and output snapshots for every decision.
- Provide explanation and appeal workflows.
- Define human approval requirements.
- Monitor drift and performance over time.
- Obtain legal, risk, compliance, and regulatory approval.

The current deterministic model is a useful explainability prototype, not a production underwriting model.

### 10.13 Operations and deployment

For production readiness, add:

- Containerized deployment
- Managed hosting
- CI/CD pipelines
- Automated tests
- Observability and distributed logs
- Error tracking
- Health checks
- Database backup monitoring
- Secrets management
- Web application firewall
- Rate limiting
- Disaster recovery
- Business continuity procedures
- Data-retention and deletion workflows

---

## 11. Suggested Implementation Roadmap

### Phase 1: Stabilize the demo

- Add automated unit and API tests.
- Add input validation coverage for all routes.
- Add clearer loading and error states.
- Add a formal demo reset/seed process.
- Separate demo data from developer-generated records.
- Complete the remaining officer review and reporting surfaces.

### Phase 2: Production foundation

- Migrate from JSON to PostgreSQL.
- Move files to encrypted object storage.
- Add managed sessions and identity management.
- Add background jobs for document processing.
- Add centralized logging and monitoring.
- Implement database migrations and backup procedures.

### Phase 3: Verified data integrations

- Integrate official land-record sources.
- Integrate approved climate and satellite providers.
- Integrate market-price data.
- Add source attribution and data-quality indicators.
- Introduce consent and data-governance workflows.

### Phase 4: Banking operations

- Integrate core banking or lending APIs.
- Add account verification and payment execution.
- Replace the demo ledger with reconciled transactions.
- Add repayments, interest, overdue, reversal, and exception workflows.

### Phase 5: Responsible production intelligence

- Calibrate and validate the risk model.
- Add model governance and monitoring.
- Add insurance and risk-transfer products.
- Add multilingual communication.
- Launch portfolio analytics and operational reporting.

---

## 12. Success Metrics

Recommended measures for evaluating future releases include:

### Farmer experience

- Application completion rate
- Average application completion time
- Percentage of fields prefilled by verified data
- Document-upload success rate
- Farmer status-view usage
- Farmer support requests

### Officer operations

- Average time from submission to decision
- Average time from approval to first release
- Evidence-review turnaround time
- Percentage of applications requiring rework
- Manual data-entry reduction

### Portfolio performance

- Repayment rate
- Delinquency and default rate
- Climate-event loss rate
- Facility utilization
- Tranche release completion
- Recovery rate

### Model governance

- Calibration error
- Predictive performance by crop and geography
- False-positive and false-negative rates
- Stability across seasons
- Fairness indicators
- Percentage of decisions with complete explanation and audit records

---

## 13. Conclusion

AgriRisk Intelligence provides a strong prototype for a transparent, climate-aware agricultural lending workflow. Its most important contributions are the separation of farmer and officer experiences, structured crop-cycle financing, explainable climate-adjusted assessment, evidence-based tranche controls, and visible audit-oriented records.

The current release demonstrates the intended product experience and domain workflow, but it remains a synthetic local demo. The next major step is to replace simulated data and local persistence with verified external data, production identity and storage, real banking and payment integrations, validated risk governance, and operational monitoring.

With those additions, the platform can evolve from a lending decision-support prototype into a production-grade agricultural finance system that supports responsible lending, better farmer transparency, and more resilient crop-cycle financing.

---

## Appendix A: Local Setup

### Requirements

- Node.js 20 or newer
- pnpm 12 or newer

### Commands

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

For a production-mode build:

```bash
pnpm build
pnpm start
```

### Demo data notice

The local environment uses `data/loan-store.json`. Records, uploads, facilities, and transactions in this environment are synthetic and must not be treated as bank, government, or payment-system records.

