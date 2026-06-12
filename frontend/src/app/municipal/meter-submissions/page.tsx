import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  getMunicipalMeterSubmissions,
  MunicipalMeterSubmissionListItem,
} from "@/lib/api";

type MeterSubmissionsPageProps = {
  searchParams: Promise<{
    validation_status?: string;
  }>;
};

const statusOptions = [
  ["", "All statuses"],
  ["accepted", "Accepted"],
  ["review_required", "Needs review"],
  ["retake_required", "Retake required"],
  ["rejected", "Rejected"],
  ["duplicate_image", "Duplicate images"],
] as const;

function formatConsumption(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)} kL`;
}

export default async function MunicipalMeterSubmissionsPage({
  searchParams,
}: MeterSubmissionsPageProps) {
  const params = await searchParams;
  const validationStatus = params.validation_status ?? "";
  const [allSubmissions, filteredSubmissions] = await Promise.all([
    getMunicipalMeterSubmissions({ limit: 200 }),
    getMunicipalMeterSubmissions({
      limit: 200,
      validation_status: validationStatus || undefined,
    }),
  ]);
  const counts = countStatuses(allSubmissions);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Resident submissions
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Household Meter Submissions
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review recent resident-submitted meter readings.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Summary label="Total submissions" value={allSubmissions.length} />
            <Summary label="Accepted" value={counts.accepted} />
            <Summary label="Needs review" value={counts.review_required} />
            <Summary label="Retake required" value={counts.retake_required} />
            <Summary label="Rejected" value={counts.rejected} />
            <Summary label="Duplicate images" value={counts.duplicate_image} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <form className="flex flex-wrap gap-3">
              <label className="sr-only" htmlFor="validation_status">
                Validation status
              </label>
              <select
                id="validation_status"
                name="validation_status"
                defaultValue={validationStatus}
                className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {statusOptions.map(([value, label]) => (
                  <option key={value || "all"} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Apply filter
              </button>
              <Link
                href="/municipal/meter-submissions"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </Link>
            </form>
          </section>

          <SubmissionsTable submissions={filteredSubmissions} />
        </div>
      </main>
    </div>
  );
}

function countStatuses(submissions: MunicipalMeterSubmissionListItem[]) {
  return submissions.reduce(
    (counts, submission) => ({
      ...counts,
      [submission.validation_status]:
        counts[submission.validation_status as keyof typeof counts] + 1,
    }),
    {
      accepted: 0,
      review_required: 0,
      retake_required: 0,
      rejected: 0,
      duplicate_image: 0,
    },
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SubmissionsTable({
  submissions,
}: {
  submissions: MunicipalMeterSubmissionListItem[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Submitted at</th>
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Account number</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Meter number</th>
              <th className="px-4 py-3">Reading</th>
              <th className="px-4 py-3">Usage since previous reading</th>
              <th className="px-4 py-3">Estimated daily usage</th>
              <th className="px-4 py-3">Freshness</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.length ? (
              submissions.map((submission) => (
                <tr key={submission.submission_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {submission.submitted_at}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {submission.customer_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {submission.account_number}
                  </td>
                  <td className="min-w-72 px-4 py-3 text-slate-600">
                    {submission.physical_address}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {submission.meter_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(submission.submitted_reading_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(submission.usage_since_previous_reading_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(submission.estimated_daily_usage_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {submission.image_freshness_status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                    {submission.validation_status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/municipal/households/${submission.household_id}`}
                      className="font-medium text-teal-700 hover:text-teal-900"
                    >
                      View household
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={11}>
                  No resident meter submissions are available for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
