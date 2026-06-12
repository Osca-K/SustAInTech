import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  getInsights,
  getInsightsSummary,
  WaterUsageInsightItem,
} from "@/lib/api";

type InsightsPageProps = {
  searchParams: Promise<{
    severity?: string;
    insight_type?: string;
  }>;
};

const severityOptions = [
  ["", "All severities"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
] as const;

const insightTypeOptions = [
  ["", "All insight types"],
  ["sudden_usage_spike", "Sudden usage spike"],
  ["sustained_high_usage", "Sustained high usage"],
  ["high_current_usage", "High current usage"],
  ["rapid_monthly_increase", "Rapid monthly increase"],
] as const;

const severityClasses = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-100 text-slate-700",
};

const severityLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const insightTypeLabels: Record<string, string> = Object.fromEntries(
  insightTypeOptions.slice(1),
);

function formatConsumption(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)} kL`;
}

function formatChange(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;
  const severity = params.severity ?? "";
  const insightType = params.insight_type ?? "";
  const [summary, insights] = await Promise.all([
    getInsightsSummary(),
    getInsights({
      severity: severity || undefined,
      insight_type: insightType || undefined,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Municipal review
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Insights
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review unusual water-usage patterns inferred from municipal statement
              data.
            </p>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Insights indicate accounts that may require review. They do not confirm
              that a leak exists.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Households requiring review"
              value={summary.households_requiring_review}
            />
            <SummaryCard
              label="High-severity insights"
              value={summary.high_severity_count}
            />
            <SummaryCard
              label="Medium-severity insights"
              value={summary.medium_severity_count}
            />
            <SummaryCard label="Total insights" value={summary.total_insights} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <form className="grid gap-3 md:grid-cols-[220px_280px_auto]">
              <label className="sr-only" htmlFor="severity">
                Severity
              </label>
              <select
                id="severity"
                name="severity"
                defaultValue={severity}
                className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {severityOptions.map(([value, label]) => (
                  <option key={value || "all"} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="insight_type">
                Insight type
              </label>
              <select
                id="insight_type"
                name="insight_type"
                defaultValue={insightType}
                className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {insightTypeOptions.map(([value, label]) => (
                  <option key={value || "all"} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Apply filters
                </button>
                <Link
                  href="/municipal/insights"
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </Link>
              </div>
            </form>
          </section>

          <InsightsTable insights={insights} />
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "high" | "medium" | "low" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}

function InsightsTable({ insights }: { insights: WaterUsageInsightItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Insight</th>
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Account number</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Statement month</th>
              <th className="px-4 py-3">Current usage</th>
              <th className="px-4 py-3">Previous usage</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Recommended action</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {insights.length ? (
              insights.map((insight) => (
                <tr key={insight.insight_id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <SeverityBadge severity={insight.severity} />
                  </td>
                  <td className="min-w-64 px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {insightTypeLabels[insight.insight_type] ?? insight.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{insight.summary}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {insight.customer_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {insight.account_number}
                  </td>
                  <td className="min-w-72 px-4 py-3 text-slate-600">
                    {insight.physical_address}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {insight.statement_month}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(insight.current_consumption_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(insight.previous_consumption_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatChange(insight.percentage_change)}
                  </td>
                  <td className="min-w-80 px-4 py-3 text-slate-600">
                    {insight.recommended_action}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/municipal/households/${insight.household_id}`}
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
                  No unusual water-usage patterns were detected from the available
                  monthly readings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
