from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    application: str
    version: str


class DashboardSummary(BaseModel):
    household_count: int
    water_meter_count: int
    monthly_reading_count: int
    monthly_statement_count: int
    statement_upload_count: int
    ingestion_batch_count: int
    latest_statement_month: str | None


class MonthlyCommunityUsage(BaseModel):
    statement_month: str
    statement_month_label: str
    total_consumption_kL: float
    average_household_consumption_kL: float
    household_count: int


class HouseholdListItem(BaseModel):
    household_id: str
    account_number: str
    customer_name: str
    physical_address: str
    township: str
    region: str
    ward: str
    meter_number: str | None
    latest_statement_month: str | None
    latest_consumption_kL: float | None
    latest_total_due: float | None


class HouseholdDetails(BaseModel):
    household_id: str
    account_number: str
    customer_name: str
    physical_address: str
    stand_number: str
    township: str
    region: str
    ward: str
    meter_id: str | None
    meter_number: str | None
    resource_type: str | None
    unit: str | None


class HouseholdMonthlyUsageItem(BaseModel):
    statement_month: str
    statement_month_label: str
    reading_period_start: str
    reading_period_end: str
    billing_days: int
    opening_reading_kL: float
    closing_reading_kL: float
    consumption_kL: float
    average_daily_consumption_kL: float
    reading_type: str
    water_total_including_vat: float
    current_charges_including_vat: float
    total_due: float
    invoice_number: str


class StatementUploadSummary(BaseModel):
    processing_status: str
    count: int


class StatementUploadFileResult(BaseModel):
    source_pdf_filename: str
    processing_status: str
    validation_status: str
    requires_manual_review: bool
    review_reasons: list[str]


class StatementUploadResponse(BaseModel):
    batch_id: str
    total_files: int
    import_ready_count: int
    review_required_count: int
    failed_count: int
    duplicate_skipped_count: int
    imported_count: int
    files: list[StatementUploadFileResult]


class UploadBatchHistoryItem(BaseModel):
    batch_id: str
    processed_at: str
    total_pdf_files: int
    import_ready_count: int
    review_required_count: int
    failed_count: int
    duplicate_skipped_count: int
