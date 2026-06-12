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

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Backend request failed for ${path}: ${response.status} ${response.statusText}`,
    );
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

export function getHouseholds() {
  return apiGet<HouseholdListItem[]>("/api/households");
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
