# AgriRisk Intelligence

Climate-aware agricultural lending decision support with staged loan facilities and a synthetic OCR assessment workflow.

## Run locally

Requirements: Node.js 20+ and pnpm 12+.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build and run production mode

```bash
pnpm build
pnpm start
```

## Current demo capabilities

- Six-step farmer assessment with separate 7/12 and 8A uploads.
- Local Tesseract.js OCR for JPG/PNG scans of 7/12 and 8A records, with confidence and raw-text review.
- Climate-adjusted repayment scenario engine with explainable risk drivers.
- Live portfolio projection API that scores persisted applications with the same risk engine used by the simulator.
- Loan facilities with configurable crop-cycle tranches and DEMO disbursement states.
- Synthetic data only: uploads and transactions do not connect to government, banking or payment systems.

## Portals

The shared sign-in page supports `Farmer` and `Bank Officer` accounts. Registration creates a local account and redirects to the matching portal.

- Farmers can submit applications, upload supporting documents, view decisions, track approved/disbursed/outstanding amounts, and upload crop-progress proof after a tranche is disbursed.
- Bank officers can review applications, request more documents, reject applications, approve facilities, and use the existing Loan Facilities workspace to review and release crop-stage tranches.
- All portal APIs require the HTTP-only local session cookie. Passwords are stored as salted scrypt hashes.
- Bank officer overview metrics, pipeline counts, climate exposure, and review rows are derived from the local application/facility store through `/api/dashboard`; they are not a second hard-coded dataset.
- The local JSON store is intended for this hackathon demo. Use PostgreSQL plus a managed session store before production deployment.

OCR notes:

- OCR runs in the browser. Selected image files are not sent to an application server.
- The first OCR run downloads the English Tesseract worker/trained data in the browser, so internet access is required unless those assets are self-hosted.
- OCR output is unverified and must be reviewed by an officer. PDF OCR and Marathi trained data are not enabled yet; use clear JPG or PNG scans with English-readable labels and numerals.
