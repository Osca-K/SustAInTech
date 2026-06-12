PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ingestion_batches (
  batch_id TEXT PRIMARY KEY,
  input_folder TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  total_pdf_files INTEGER NOT NULL CHECK (total_pdf_files >= 0),
  import_ready_count INTEGER NOT NULL CHECK (import_ready_count >= 0),
  review_required_count INTEGER NOT NULL CHECK (review_required_count >= 0),
  failed_count INTEGER NOT NULL CHECK (failed_count >= 0),
  duplicate_skipped_count INTEGER NOT NULL CHECK (duplicate_skipped_count >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statement_uploads (
  upload_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  source_pdf_filename TEXT NOT NULL,
  file_hash_sha256 TEXT UNIQUE,
  processing_status TEXT NOT NULL,
  extraction_status TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  requires_manual_review INTEGER NOT NULL CHECK (requires_manual_review IN (0, 1)),
  review_reasons_json TEXT NOT NULL,
  extracted_json_path TEXT,
  imported_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES ingestion_batches(batch_id)
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS water_meters (
  meter_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  meter_number TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL CHECK (resource_type = 'water'),
  unit TEXT NOT NULL CHECK (unit = 'kL'),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(household_id)
);

CREATE TABLE IF NOT EXISTS monthly_water_readings (
  reading_id TEXT PRIMARY KEY,
  meter_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  statement_month TEXT NOT NULL,
  reading_period_start TEXT NOT NULL,
  reading_period_end TEXT NOT NULL,
  billing_days INTEGER NOT NULL CHECK (billing_days > 0),
  opening_reading_kL REAL NOT NULL CHECK (opening_reading_kL >= 0),
  closing_reading_kL REAL NOT NULL CHECK (closing_reading_kL >= opening_reading_kL),
  consumption_kL REAL NOT NULL CHECK (consumption_kL >= 0),
  average_daily_consumption_kL REAL NOT NULL CHECK (average_daily_consumption_kL >= 0),
  reading_type TEXT NOT NULL,
  source_upload_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (meter_id, statement_month),
  FOREIGN KEY (meter_id) REFERENCES water_meters(meter_id),
  FOREIGN KEY (household_id) REFERENCES households(household_id),
  FOREIGN KEY (source_upload_id) REFERENCES statement_uploads(upload_id)
);

CREATE TABLE IF NOT EXISTS monthly_statements (
  statement_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  source_upload_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  statement_month TEXT NOT NULL,
  statement_month_label TEXT NOT NULL,
  statement_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  next_reading_date TEXT NOT NULL,
  water_charge_excluding_vat REAL NOT NULL CHECK (water_charge_excluding_vat >= 0),
  extended_social_package_grant REAL NOT NULL CHECK (extended_social_package_grant >= 0),
  demand_management_levy REAL NOT NULL CHECK (demand_management_levy >= 0),
  sewer_monthly_charge REAL NOT NULL CHECK (sewer_monthly_charge >= 0),
  water_vat REAL NOT NULL CHECK (water_vat >= 0),
  water_total_including_vat REAL NOT NULL CHECK (water_total_including_vat >= 0),
  property_rates_total REAL NOT NULL CHECK (property_rates_total >= 0),
  refuse_total REAL NOT NULL CHECK (refuse_total >= 0),
  current_charges_excluding_vat REAL NOT NULL CHECK (current_charges_excluding_vat >= 0),
  current_vat_total REAL NOT NULL CHECK (current_vat_total >= 0),
  current_charges_including_vat REAL NOT NULL CHECK (current_charges_including_vat >= 0),
  previous_account_balance REAL NOT NULL CHECK (previous_account_balance >= 0),
  incoming_payment REAL NOT NULL,
  subtotal REAL NOT NULL CHECK (subtotal >= 0),
  total_due REAL NOT NULL CHECK (total_due >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (household_id, statement_month),
  FOREIGN KEY (household_id) REFERENCES households(household_id),
  FOREIGN KEY (source_upload_id) REFERENCES statement_uploads(upload_id)
);

CREATE TABLE IF NOT EXISTS household_meter_submissions (
  submission_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_original_filename TEXT NOT NULL,
  image_content_type TEXT NOT NULL,
  image_size_bytes INTEGER NOT NULL CHECK (image_size_bytes > 0),
  image_hash_sha256 TEXT NOT NULL UNIQUE,
  browser_last_modified_at TEXT,
  exif_datetime_original TEXT,
  image_age_minutes REAL,
  image_freshness_status TEXT NOT NULL CHECK (image_freshness_status IN ('recent', 'stale', 'metadata_missing', 'metadata_inconsistent')),
  submitted_reading_kL REAL NOT NULL CHECK (submitted_reading_kL >= 0),
  usage_since_previous_reading_kL REAL,
  elapsed_hours_since_previous_reading REAL,
  estimated_daily_usage_kL REAL,
  reading_source TEXT NOT NULL CHECK (reading_source IN ('resident_manual', 'ai_extracted_resident_confirmed', 'ai_extracted_resident_corrected')),
  validation_status TEXT NOT NULL CHECK (validation_status IN ('accepted', 'review_required', 'rejected', 'duplicate_image', 'retake_required')),
  validation_notes_json TEXT NOT NULL,
  resident_confirmed INTEGER NOT NULL CHECK (resident_confirmed IN (0, 1)),
  resident_corrected_value REAL,
  ai_extracted_meter_number TEXT,
  ai_extracted_reading_kL REAL,
  ai_confidence_score REAL,
  ai_extraction_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (ai_extraction_status IN ('not_requested', 'pending', 'completed', 'low_confidence', 'failed')),
  ai_extraction_notes_json TEXT NOT NULL DEFAULT '[]',
  ai_extraction_method TEXT,
  ai_extracted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(household_id),
  FOREIGN KEY (meter_id) REFERENCES water_meters(meter_id)
);
