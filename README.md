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
- Loan facilities with configurable crop-cycle tranches and DEMO disbursement states.
- Synthetic data only: uploads and transactions do not connect to government, banking or payment systems unless explicitly connected through a future production adapter.

### Google Maps and API restrictions

- This project is built with Next.js, so the browser key must be exposed as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- The farm map loads the Maps JavaScript API once with `@googlemaps/js-api-loader` and imports the Maps and marker libraries before initialization.
- The Google Cloud project that owns the key must have the Maps JavaScript API enabled and billing configured.
- Restrict the key to the Maps JavaScript API and allow the website referrers you use, including `http://localhost:3000/*`, the current Codespaces forwarded-port URL, and your production domain.
- Put the key in `.env.local`, not source control. Restart the development server after changing environment variables and hard-refresh the browser to clear any previously loaded Maps script.

## Portals

The shared sign-in page supports `Farmer` and `Bank Officer` accounts. Registration creates a local account and redirects to the matching portal.

- Farmers can submit applications, upload supporting documents, view decisions, track approved/disbursed/outstanding amounts, and upload crop-progress proof after a tranche is disbursed.
- Bank officers can review applications, request more documents, reject applications, approve facilities, and use the existing Loan Facilities workspace to review and release crop-stage tranches.
- All portal APIs require the HTTP-only local session cookie. Passwords are stored as salted scrypt hashes.
- The local JSON store is intended for this hackathon demo. Use PostgreSQL plus a managed session store before production deployment.

OCR notes:

- OCR runs in the browser. Selected image files are not sent to an application server.
- The first OCR run downloads the English Tesseract worker/trained data in the browser, so internet access is required unless those assets are self-hosted.
- OCR output is unverified and must be reviewed by an officer. PDF OCR and Marathi trained data are not enabled yet; use clear JPG or PNG scans with English-readable labels and numerals.
