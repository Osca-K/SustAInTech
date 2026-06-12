import type { UploadStatusSummary } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  import_ready: "Imported and ready",
  review_required: "Needs review",
  failed: "Failed",
  duplicate_skipped: "Duplicate skipped",
};

type UploadStatusPanelProps = {
  statuses: UploadStatusSummary[];
};

export function UploadStatusPanel({ statuses }: UploadStatusPanelProps) {
  const counts = new Map(
    statuses.map((status) => [status.processing_status, status.count]),
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Statement Uploads
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div
            key={status}
            className="rounded-md border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {(counts.get(status) ?? 0).toLocaleString("en-ZA")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
