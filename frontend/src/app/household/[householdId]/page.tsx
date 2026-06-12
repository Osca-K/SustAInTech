import Link from "next/link";
import { notFound } from "next/navigation";

import { RecentMeterTrackingChart } from "@/components/household/RecentMeterTrackingChart";
import { ResidentUsageChart } from "@/components/household/ResidentUsageChart";
import {
  ApiError,
  getHousehold,
  getHouseholdInsights,
  getHouseholdMeterSubmissions,
  getHouseholdMeterTrackingSummary,
  getHouseholdMonthlyUsage,
  HouseholdTrackingSummary,
  HouseholdDetails,
  HouseholdMonthlyUsageItem,
  MeterSubmissionHistoryItem,
  WaterUsageInsightItem,
} from "@/lib/api";
import {
  residentInsightSummary,
  residentRecommendedStep,
  residentUsageStatus,
} from "@/lib/householdPortal";

type ResidentDashboardPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

function firstName(customerName: string) {
  return customerName.split(" ")[0] || customerName;
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `R ${value.toFixed(2)}`;
}

function formatConsumption(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value.toFixed(1)} kL`;
}

function usageStats(history: HouseholdMonthlyUsageItem[]) {
  const latest = history.at(-1);
  const total = history.reduce((sum, item) => sum + item.consumption_kL, 0);
  return {
    latest,
    averageUsage: history.length ? total / history.length : null,
  };
}

export default async function ResidentDashboardPage({
  params,
}: ResidentDashboardPageProps) {
  const { householdId } = await params;
  let household: HouseholdDetails;
  let monthlyUsage: HouseholdMonthlyUsageItem[];
  let insights: WaterUsageInsightItem[];
  let trackingSummary: HouseholdTrackingSummary;
  let meterSubmissions: MeterSubmissionHistoryItem[];

  try {
    [household, monthlyUsage, insights, trackingSummary, meterSubmissions] = await Promise.all([
      getHousehold(householdId),
      getHouseholdMonthlyUsage(householdId),
      getHouseholdInsights(householdId),
      getHouseholdMeterTrackingSummary(householdId),
      getHouseholdMeterSubmissions(householdId),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const history = [...monthlyUsage].sort((left, right) =>
    left.statement_month.localeCompare(right.statement_month),
  );
  const stats = usageStats(history);

  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <ResidentNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <Link
            href="/household"
            className="text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            Switch household
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Welcome back, {firstName(household.customer_name)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Here is your latest household water-usage summary.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Latest water usage"
            value={formatConsumption(stats.latest?.consumption_kL)}
          />
          <SummaryCard
            label="Average monthly usage"
            value={formatConsumption(stats.averageUsage)}
          />
          <SummaryCard
            label="Latest municipal bill"
            value={formatCurrency(stats.latest?.total_due)}
          />
          <SummaryCard
            label="Meter number"
            value={household.meter_number ?? "Not available"}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <ResidentUsageChart data={history} />
          <LatestBillCard latest={stats.latest} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ResidentInsightsCard insights={insights} />
          <MeterUploadCard householdId={householdId} />
        </div>

        <ResidentTrackingSection
          summary={trackingSummary}
          submissions={meterSubmissions}
        />
      </div>
    </main>
  );
}

function ResidentNav() {
  return (
    <nav className="border-b border-emerald-100 bg-white/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-slate-950">SustAInTech</p>
        <p className="text-sm font-medium text-teal-700">Household Portal</p>
      </div>
    </nav>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function LatestBillCard({ latest }: { latest: HouseholdMonthlyUsageItem | undefined }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Latest Municipal Statement
      </h2>
      {latest ? (
        <dl className="mt-4 divide-y divide-slate-100 text-sm">
          <BillRow label="Statement month" value={latest.statement_month_label} />
          <BillRow label="Water usage" value={formatConsumption(latest.consumption_kL)} />
          <BillRow
            label="Water total"
            value={formatCurrency(latest.water_total_including_vat)}
          />
          <BillRow label="Municipal total due" value={formatCurrency(latest.total_due)} />
          <BillRow label="Due date" value={latest.due_date} />
          <BillRow label="Invoice number" value={latest.invoice_number} />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No municipal statement history is available yet.
        </p>
      )}
      <p className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
        Your municipal total may include water, sanitation, property rates, and
        refuse charges.
      </p>
    </section>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ResidentInsightsCard({
  insights,
}: {
  insights: WaterUsageInsightItem[];
}) {
  const status = residentUsageStatus(insights);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Usage Insights</h2>
          <p className="mt-1 text-sm text-slate-500">
            Helpful guidance based on your monthly municipal readings.
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {insights.length ? (
        <div className="mt-4 space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.insight_id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {residentInsightSummary(insight)}
              </p>
              <p className="mt-3 text-xs font-medium uppercase text-slate-500">
                Recommended next step
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {residentRecommendedStep(insight)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Your recent water usage appears stable.
        </p>
      )}
    </section>
  );
}

function MeterUploadCard({ householdId }: { householdId: string }) {
  return (
    <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Track Daily Water Usage
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Upload a recent meter photo to monitor your water consumption between
        municipal statements.
      </p>
      <Link
        href={`/household/${householdId}/meter-upload`}
        className="mt-5 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Upload meter photo
      </Link>
    </section>
  );
}

function ResidentTrackingSection({
  summary,
  submissions,
}: {
  summary: HouseholdTrackingSummary;
  submissions: MeterSubmissionHistoryItem[];
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Recent Water Tracking
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryMini label="Latest meter reading" value={formatConsumption(summary.latest_reading_kL)} />
          <SummaryMini label="Latest upload date" value={summary.latest_submission_at ?? "No uploads yet"} />
          <SummaryMini label="Usage since previous reading" value={formatConsumption(summary.usage_since_previous_reading_kL)} />
          <SummaryMini label="Estimated daily usage" value={formatConsumption(summary.estimated_daily_usage_kL)} />
          <SummaryMini label="Validation status" value={submissions[0]?.validation_status ?? "No submissions"} />
        </div>
      </div>
      <RecentMeterTrackingChart submissions={submissions} />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Meter reading</th>
              <th className="px-4 py-3">Usage since previous reading</th>
              <th className="px-4 py-3">Estimated daily usage</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.length ? (
              submissions.map((submission) => (
                <tr key={submission.submission_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {submission.submitted_at}
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
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                    {submission.validation_status}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No household meter photos have been submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
