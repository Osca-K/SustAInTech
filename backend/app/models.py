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
    due_date: str
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


class WaterUsageInsightItem(BaseModel):
    insight_id: str
    insight_type: str
    severity: str
    title: str
    summary: str
    recommended_action: str
    household_id: str
    account_number: str
    customer_name: str
    physical_address: str
    meter_number: str | None
    statement_month: str
    current_consumption_kL: float
    previous_consumption_kL: float | None
    percentage_change: float | None
    months_evaluated: int


class InsightsSummary(BaseModel):
    total_insights: int
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int
    households_requiring_review: int


class MeterSubmissionResult(BaseModel):
    submission_id: str
    household_id: str
    meter_id: str
    submitted_at: str
    image_freshness_status: str
    submitted_reading_kL: float
    usage_since_previous_reading_kL: float | None
    estimated_daily_usage_kL: float | None
    reading_source: str
    validation_status: str
    validation_notes: list[str]
    resident_confirmed: bool


class MeterSubmissionHistoryItem(BaseModel):
    submission_id: str
    submitted_at: str
    submitted_reading_kL: float
    usage_since_previous_reading_kL: float | None
    estimated_daily_usage_kL: float | None
    image_freshness_status: str
    validation_status: str
    reading_source: str
    resident_confirmed: bool


class HouseholdTrackingSummary(BaseModel):
    latest_reading_kL: float | None
    latest_submission_at: str | None
    usage_since_previous_reading_kL: float | None
    estimated_daily_usage_kL: float | None
    accepted_submission_count: int
    review_required_count: int


class MunicipalMeterSubmissionListItem(BaseModel):
    submission_id: str
    household_id: str
    account_number: str
    customer_name: str
    physical_address: str
    meter_number: str
    submitted_at: str
    submitted_reading_kL: float
    usage_since_previous_reading_kL: float | None
    estimated_daily_usage_kL: float | None
    image_freshness_status: str
    validation_status: str


class MeterPhotoExtractionResponse(BaseModel):
    extraction_id: str
    household_id: str
    meter_id: str
    submitted_at: str
    image_freshness_status: str
    ai_extraction_status: str
    ai_extraction_method: str
    is_water_meter_image: bool
    suggested_meter_number: str | None
    suggested_reading_kL: float | None
    confidence_score: float
    image_quality_status: str
    extraction_notes: list[str]
    requires_resident_confirmation: bool
    resident_message: str


class MeterPhotoExtractionConfirmationRequest(BaseModel):
    confirmed_meter_number: str | None = None
    confirmed_reading_kL: float
    resident_corrected_value: bool
    resident_confirmed: bool


class WasteSortRequest(BaseModel):
    item_name: str
    item_description: str | None = None
    selected_category: str | None = None


class WasteSortResult(BaseModel):
    query_id: str
    household_id: str
    submitted_at: str
    item_name: str
    item_description: str | None
    selected_category: str | None
    classification: str
    disposal_guidance: str
    preparation_steps: list[str]
    confidence_level: str
    source: str


class WasteQueryHistoryItem(BaseModel):
    query_id: str
    household_id: str
    submitted_at: str
    item_name: str
    item_description: str | None
    selected_category: str | None
    classification: str
    disposal_guidance: str
    preparation_steps: list[str]
    confidence_level: str
    source: str


class WasteClassificationCount(BaseModel):
    classification: str
    count: int


class WasteCategoryCount(BaseModel):
    selected_category: str
    count: int


class WasteSummary(BaseModel):
    total_queries: int
    classification_counts: list[WasteClassificationCount]
    top_selected_categories: list[WasteCategoryCount]
    recent_queries: list[WasteQueryHistoryItem]


class ImpactWaterActivityItem(BaseModel):
    submitted_at: str
    household_id: str
    customer_name: str
    validation_status: str
    submitted_reading_kL: float
    estimated_daily_usage_kL: float | None


class ImpactWasteActivityItem(BaseModel):
    submitted_at: str
    household_id: str
    item_name: str
    classification: str
    confidence_level: str


class ImpactSummary(BaseModel):
    total_households: int
    total_water_statements: int
    total_meter_submissions: int
    accepted_meter_submissions: int
    review_required_meter_submissions: int
    total_water_usage_kL: float
    average_household_water_usage_kL: float
    highest_household_monthly_usage_kL: float
    water_review_rate_percent: float
    total_waste_queries: int
    recyclable_queries: int
    organic_queries: int
    e_waste_queries: int
    hazardous_queries: int
    reuse_or_donate_queries: int
    general_waste_queries: int
    unknown_waste_queries: int
    waste_diversion_awareness_percent: float
    recent_water_activity: list[ImpactWaterActivityItem]
    recent_waste_activity: list[ImpactWasteActivityItem]
