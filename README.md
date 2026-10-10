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
- Bank officers must explicitly run the persisted AgriRisk assessment before approval. Reports include a versioned input snapshot, explainable financial/climate drivers, synthetic-data provenance, warnings, a suggested amount, and an editable-estimate crop/repayment timeline.
- Application records support state/district/village, land reference, optional Google Maps coordinates/link, sowing and harvest dates, repayment structure, and shared farmer/officer status updates. Missing coordinates are surfaced as unavailable rather than inferred.
- All portal APIs require the HTTP-only local session cookie. Passwords are stored as salted scrypt hashes.
- Bank officer overview metrics, pipeline counts, climate exposure, and review rows are derived from the local application/facility store through `/api/dashboard`; they are not a second hard-coded dataset.
- When `DATABASE_URL` is configured, the app uses Neon/Postgres with a transactionally locked JSONB aggregate in `agririsk_store`. On first connection it seeds the aggregate from `data/loan-store.json`; later requests do not write to the deployed filesystem. Without `DATABASE_URL`, local development keeps using the JSON fallback.

### Vercel + Neon deployment

1. Create a Neon project and copy its pooled connection string, including `sslmode=require`.
2. In Vercel project settings, add `DATABASE_URL`, `SESSION_SECRET`, and optionally `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Production, Preview, and Development environments.
3. Deploy with `pnpm build` and `vercel --prod`.
4. The first authenticated request creates `agririsk_store` and seeds the demo aggregate. For a controlled migration, run the `CREATE TABLE` statement in `db/schema.sql` first.

Vercel's filesystem is read-only. On Vercel, uploaded files are written only to `/tmp` to avoid filesystem errors; `/tmp` is ephemeral. Use Vercel Blob or another object store before treating document uploads as durable production records.

## Demo acceptance walkthrough

1. Start from a clean checkout and run `pnpm install && pnpm dev`.
2. Sign in as `farmer.demo@agririsk.local` / `demo-pass-123`, create a loan application, provide a survey reference and (for map analysis) decimal latitude/longitude, then upload 7/12, 8A, or other JPG/PNG/PDF documents.
3. Sign out and sign in as `officer.demo@agririsk.local` / `demo-pass-123`. Open **Applications Review**; the submitted application is read from the same `data/loan-store.json` record.
4. Select **Run AgriRisk assessment**. Confirm the report shows the calculation version, observed/estimated/synthetic data labels, warnings, risk drivers, suggested amount, map status/water-distance result, and timeline. Approval is disabled until this step succeeds.
5. Approve with a limit no greater than the requested amount. Open **Loan Facilities**, approve the first eligible tranche only after its evidence is present, then use **Confirm DEMO release**. This creates an idempotent simulated ledger transaction; it does not move money.
6. Sign back in as the farmer, verify the facility/release and upload crop-progress evidence for the next tranche. Return to the officer portal, review the evidence, approve it, and authorize the next simulated release.
7. Negative checks: submit without a survey reference, use invalid coordinates, access another farmer's application, approve before assessment, upload an unsupported/oversized file, repeat a release with the same idempotency key, and configure tranches over the approved principal. Each should return an explicit error and leave the persisted record unchanged.

The demo accounts are generated by `ensureDemoAccounts()` at first login. No production credentials or payment integrations are present. Reset the demo state by restoring the tracked `data/loan-store.json` file and removing only the demo upload files under `data/uploads/`.

OCR notes:

- OCR runs in the browser. Selected image files are not sent to an application server.
- The first OCR run downloads the English Tesseract worker/trained data in the browser, so internet access is required unless those assets are self-hosted.
- OCR output is unverified and must be reviewed by an officer. PDF OCR and Marathi trained data are not enabled yet; use clear JPG or PNG scans with English-readable labels and numerals.
