-- PostgreSQL-compatible operational schema for future Supabase migration.
-- This file is not executed by the local prototype yet.

CREATE TABLE IF NOT EXISTS ingestion_batches (
  batch_id TEXT PRIMARY KEY,
  input_folder TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  total_pdf_files INTEGER NOT NULL CHECK (total_pdf_files >= 0),
  import_ready_count INTEGER NOT NULL CHECK (import_ready_count >= 0),
  review_required_count INTEGER NOT NULL CHECK (review_required_count >= 0),
  failed_count INTEGER NOT NULL CHECK (failed_count >= 0),
  duplicate_skipped_count INTEGER NOT NULL CHECK (duplicate_skipped_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS statement_uploads (
  upload_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES ingestion_batches(batch_id),
  source_pdf_filename TEXT NOT NULL,
  file_hash_sha256 TEXT UNIQUE,
  processing_status TEXT NOT NULL,
  extraction_status TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  requires_manual_review BOOLEAN NOT NULL,
  review_reasons_json JSONB NOT NULL,
  extracted_json_path TEXT,
  imported_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS households (
  household_id TEXT PRIMARY KEY,
  account_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  stand_number TEXT NOT NULL,
  township TEXT NOT NULL,
  region TEXT NOT NULL,
  ward TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_meters (
  meter_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(household_id),
  meter_number TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL CHECK (resource_type = 'water'),
  unit TEXT NOT NULL CHECK (unit = 'kL'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_water_readings (
  reading_id TEXT PRIMARY KEY,
  meter_id TEXT NOT NULL REFERENCES water_meters(meter_id),
  household_id TEXT NOT NULL REFERENCES households(household_id),
  statement_month TEXT NOT NULL,
  reading_period_start DATE NOT NULL,
  reading_period_end DATE NOT NULL,
  billing_days INTEGER NOT NULL CHECK (billing_days > 0),
  opening_reading_kL NUMERIC NOT NULL CHECK (opening_reading_kL >= 0),
  closing_reading_kL NUMERIC NOT NULL CHECK (closing_reading_kL >= opening_reading_kL),
  consumption_kL NUMERIC NOT NULL CHECK (consumption_kL >= 0),
  average_daily_consumption_kL NUMERIC NOT NULL CHECK (average_daily_consumption_kL >= 0),
  reading_type TEXT NOT NULL,
  source_upload_id TEXT NOT NULL REFERENCES statement_uploads(upload_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meter_id, statement_month)
);

CREATE TABLE IF NOT EXISTS monthly_statements (
  statement_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(household_id),
  source_upload_id TEXT NOT NULL REFERENCES statement_uploads(upload_id),
  invoice_number TEXT NOT NULL UNIQUE,
  statement_month TEXT NOT NULL,
  statement_month_label TEXT NOT NULL,
  statement_date DATE NOT NULL,
  due_date DATE NOT NULL,
  next_reading_date DATE NOT NULL,
  water_charge_excluding_vat NUMERIC NOT NULL CHECK (water_charge_excluding_vat >= 0),
  extended_social_package_grant NUMERIC NOT NULL CHECK (extended_social_package_grant >= 0),
  demand_management_levy NUMERIC NOT NULL CHECK (demand_management_levy >= 0),
  sewer_monthly_charge NUMERIC NOT NULL CHECK (sewer_monthly_charge >= 0),
  water_vat NUMERIC NOT NULL CHECK (water_vat >= 0),
  water_total_including_vat NUMERIC NOT NULL CHECK (water_total_including_vat >= 0),
  property_rates_total NUMERIC NOT NULL CHECK (property_rates_total >= 0),
  refuse_total NUMERIC NOT NULL CHECK (refuse_total >= 0),
  current_charges_excluding_vat NUMERIC NOT NULL CHECK (current_charges_excluding_vat >= 0),
  current_vat_total NUMERIC NOT NULL CHECK (current_vat_total >= 0),
  current_charges_including_vat NUMERIC NOT NULL CHECK (current_charges_including_vat >= 0),
  previous_account_balance NUMERIC NOT NULL CHECK (previous_account_balance >= 0),
  incoming_payment NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  total_due NUMERIC NOT NULL CHECK (total_due >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, statement_month)
);
