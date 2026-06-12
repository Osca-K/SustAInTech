const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const UPLOAD_TIMEOUT_MS = 30_000;

export type DashboardSummary = {
  household_count: number;
  water_meter_count: number;
  monthly_reading_count: number;
  monthly_statement_count: number;
  statement_upload_count: number;
  ingestion_batch_count: number;
  latest_statement_month: string | null;
};

export type MonthlyWaterUsage = {
  statement_month: string;
  statement_month_label: string;
  total_consumption_kL: number;
  average_household_consumption_kL: number;
  household_count: number;
};

export type UploadStatusSummary = {
  processing_status: string;
  count: number;
};

export type HouseholdListItem = {
  household_id: string;
  account_number: string;
  customer_name: string;
  physical_address: string;
  township: string;
  region: string;
  ward: string;
  meter_number: string | null;
  latest_statement_month: string | null;
  latest_consumption_kL: number | null;
  latest_total_due: number | null;
};

export type HouseholdDetails = {
  household_id: string;
  account_number: string;
  customer_name: string;
  physical_address: string;
  stand_number: string;
  township: string;
  region: string;
  ward: string;
  meter_id: string | null;
  meter_number: string | null;
  resource_type: string | null;
  unit: string | null;
};

export type HouseholdMonthlyUsageItem = {
  statement_month: string;
  statement_month_label: string;
  reading_period_start: string;
  reading_period_end: string;
  billing_days: number;
  opening_reading_kL: number;
  closing_reading_kL: number;
  consumption_kL: number;
  average_daily_consumption_kL: number;
  reading_type: string;
  water_total_including_vat: number;
  current_charges_including_vat: number;
  total_due: number;
  due_date: string;
  invoice_number: string;
};

export type HouseholdListParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(path: string, response: Response) {
    super(
      `Backend request failed for ${path}: ${response.status} ${response.statusText}`,
    );
    this.name = "ApiError";
    this.status = response.status;
  }
}

export type StatementUploadFileResult = {
  source_pdf_filename: string;
  processing_status: string;
  validation_status: string;
  requires_manual_review: boolean;
  review_reasons: string[];
};

export type StatementUploadResponse = {
  batch_id: string;
  total_files: number;
  import_ready_count: number;
  review_required_count: number;
  failed_count: number;
  duplicate_skipped_count: number;
  imported_count: number;
  files: StatementUploadFileResult[];
};

export type UploadBatchHistoryItem = {
  batch_id: string;
  processed_at: string;
  total_pdf_files: number;
  import_ready_count: number;
  review_required_count: number;
  failed_count: number;
  duplicate_skipped_count: number;
};

export type WaterUsageInsightItem = {
  insight_id: string;
  insight_type: string;
  severity: "high" | "medium" | "low";
  title: string;
  summary: string;
  recommended_action: string;
  household_id: string;
  account_number: string;
  customer_name: string;
  physical_address: string;
  meter_number: string | null;
  statement_month: string;
  current_consumption_kL: number;
  previous_consumption_kL: number | null;
  percentage_change: number | null;
  months_evaluated: number;
};

export type InsightsSummary = {
  total_insights: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  households_requiring_review: number;
};

export type InsightsParams = {
  severity?: string;
  insight_type?: string;
  household_id?: string;
};

export type MeterSubmissionResult = {
  submission_id: string;
  household_id: string;
  meter_id: string;
  submitted_at: string;
  image_freshness_status: string;
  submitted_reading_kL: number;
  usage_since_previous_reading_kL: number | null;
  estimated_daily_usage_kL: number | null;
  reading_source: string;
  validation_status: string;
  validation_notes: string[];
  resident_confirmed: boolean;
};

export type MeterPhotoExtractionResponse = {
  extraction_id: string;
  household_id: string;
  meter_id: string;
  submitted_at: string;
  image_freshness_status: string;
  ai_extraction_status: string;
  ai_extraction_method: string;
  is_water_meter_image: boolean;
  suggested_meter_number: string | null;
  suggested_reading_kL: number | null;
  confidence_score: number;
  image_quality_status: string;
  requires_resident_confirmation: boolean;
  resident_message: string;
};

export type MeterPhotoExtractionConfirmationPayload = {
  confirmed_meter_number: string | null;
  confirmed_reading_kL: number;
  resident_corrected_value: boolean;
  resident_confirmed: boolean;
};

export type MeterSubmissionHistoryItem = {
  submission_id: string;
  submitted_at: string;
  submitted_reading_kL: number;
  usage_since_previous_reading_kL: number | null;
  estimated_daily_usage_kL: number | null;
  image_freshness_status: string;
  validation_status: string;
  reading_source: string;
  resident_confirmed: boolean;
};

export type HouseholdTrackingSummary = {
  latest_reading_kL: number | null;
  latest_submission_at: string | null;
  usage_since_previous_reading_kL: number | null;
  estimated_daily_usage_kL: number | null;
  accepted_submission_count: number;
  review_required_count: number;
};

export type MunicipalMeterSubmissionListItem = {
  submission_id: string;
  household_id: string;
  account_number: string;
  customer_name: string;
  physical_address: string;
  meter_number: string;
  submitted_at: string;
  submitted_reading_kL: number;
  usage_since_previous_reading_kL: number | null;
  estimated_daily_usage_kL: number | null;
  image_freshness_status: string;
  validation_status: string;
};

export type MunicipalMeterSubmissionsParams = {
  validation_status?: string;
  household_id?: string;
  limit?: number;
  offset?: number;
};

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(path, response);
  }

  return response.json() as Promise<T>;
}

export function getDashboardSummary() {
  return apiGet<DashboardSummary>("/api/dashboard/summary");
}

export function getMonthlyWaterUsage() {
  return apiGet<MonthlyWaterUsage[]>("/api/dashboard/monthly-water-usage");
}

export function getUploadStatuses() {
  return apiGet<UploadStatusSummary[]>("/api/dashboard/upload-statuses");
}

export function getHouseholds(params: HouseholdListParams = {}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set("offset", String(params.offset));
  }
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiGet<HouseholdListItem[]>(`/api/households${suffix}`);
}

export function getHousehold(householdId: string) {
  return apiGet<HouseholdDetails>(`/api/households/${householdId}`);
}

export function getHouseholdMonthlyUsage(householdId: string) {
  return apiGet<HouseholdMonthlyUsageItem[]>(
    `/api/households/${householdId}/monthly-usage`,
  );
}

export async function uploadStatements(
  files: File[],
): Promise<StatementUploadResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const response = await fetch(`${API_BASE_URL}/api/uploads/statements`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await readableError(response);
      throw new Error(message || `Upload failed: ${response.status}`);
    }

    return response.json() as Promise<StatementUploadResponse>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Upload timed out. Check that the backend is running and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getUploadBatches() {
  return apiGet<UploadBatchHistoryItem[]>("/api/uploads/batches");
}

export function getInsightsSummary() {
  return apiGet<InsightsSummary>("/api/insights/summary");
}

export function getInsights(params: InsightsParams = {}) {
  const query = new URLSearchParams();
  if (params.severity) {
    query.set("severity", params.severity);
  }
  if (params.insight_type) {
    query.set("insight_type", params.insight_type);
  }
  if (params.household_id) {
    query.set("household_id", params.household_id);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiGet<WaterUsageInsightItem[]>(`/api/insights${suffix}`);
}

export function getHouseholdInsights(householdId: string) {
  return apiGet<WaterUsageInsightItem[]>(
    `/api/households/${householdId}/insights`,
  );
}

export async function submitHouseholdMeterReading(
  householdId: string,
  formData: FormData,
): Promise<MeterSubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/households/${householdId}/meter-submissions`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const message = await readableError(response);
    throw new Error(message || `Meter submission failed: ${response.status}`);
  }

  return response.json() as Promise<MeterSubmissionResult>;
}

export async function extractHouseholdMeterPhoto(
  householdId: string,
  formData: FormData,
): Promise<MeterPhotoExtractionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/households/${householdId}/meter-photo-extractions`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const message = await readableError(response);
    throw new Error(message || `Meter photo analysis failed: ${response.status}`);
  }

  return response.json() as Promise<MeterPhotoExtractionResponse>;
}

export async function confirmHouseholdMeterExtraction(
  householdId: string,
  extractionId: string,
  payload: MeterPhotoExtractionConfirmationPayload,
): Promise<MeterSubmissionResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/households/${householdId}/meter-photo-extractions/${extractionId}/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message = await readableError(response);
    throw new Error(message || `Meter confirmation failed: ${response.status}`);
  }

  return response.json() as Promise<MeterSubmissionResult>;
}

export function getHouseholdMeterSubmissions(householdId: string) {
  return apiGet<MeterSubmissionHistoryItem[]>(
    `/api/households/${householdId}/meter-submissions`,
  );
}

export function getHouseholdMeterTrackingSummary(householdId: string) {
  return apiGet<HouseholdTrackingSummary>(
    `/api/households/${householdId}/meter-tracking-summary`,
  );
}

export function getMunicipalMeterSubmissions(
  params: MunicipalMeterSubmissionsParams = {},
) {
  const query = new URLSearchParams();
  if (params.validation_status) {
    query.set("validation_status", params.validation_status);
  }
  if (params.household_id) {
    query.set("household_id", params.household_id);
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiGet<MunicipalMeterSubmissionListItem[]>(`/api/meter-submissions${suffix}`);
}

async function readableError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) {
    return "";
  }

  try {
    const data = JSON.parse(text) as { detail?: unknown };
    return typeof data.detail === "string" ? data.detail : text;
  } catch {
    return text;
  }
}
