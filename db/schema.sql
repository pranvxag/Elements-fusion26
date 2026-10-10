-- PostgreSQL migration blueprint for production deployment.
-- The runnable hackathon environment uses data/loan-store.json and the same domain invariants.
CREATE TABLE IF NOT EXISTS agririsk_store (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The application initializes this table from data/loan-store.json on first connection.
-- The normalized tables below are a future reporting/migration blueprint.
CREATE TABLE loan_facilities (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  farmer_name TEXT NOT NULL,
  district TEXT NOT NULL,
  crop TEXT NOT NULL,
  farm_area_ha NUMERIC(12, 2) NOT NULL,
  approved_limit_minor BIGINT NOT NULL,
  annual_rate NUMERIC(8, 4) NOT NULL,
  repayment_structure TEXT NOT NULL,
  status TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE tranches (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES loan_facilities(id),
  sequence_no INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  crop_stage TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  planned_date DATE NOT NULL,
  status TEXT NOT NULL,
  UNIQUE (facility_id, sequence_no)
);
CREATE TABLE disbursements (
  id TEXT PRIMARY KEY,
  tranche_id TEXT NOT NULL UNIQUE REFERENCES tranches(id),
  facility_id TEXT NOT NULL REFERENCES loan_facilities(id),
  transaction_id TEXT NOT NULL UNIQUE,
  amount_minor BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  payment_method TEXT NOT NULL,
  destination_reference TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  demo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE repayments (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES loan_facilities(id),
  amount_minor BIGINT NOT NULL,
  principal_minor BIGINT NOT NULL,
  interest_minor BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  demo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES loan_facilities(id),
  entry_type TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  principal_minor BIGINT NOT NULL,
  interest_minor BIGINT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  immutable BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL
);
