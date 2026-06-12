import Link from "next/link";
import { notFound } from "next/navigation";

import { HouseholdUsageChart } from "@/components/households/HouseholdUsageChart";
import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  ApiError,
  getHousehold,
  getHouseholdInsights,
  getHouseholdMonthlyUsage,
  HouseholdDetails,
  HouseholdMonthlyUsageItem,
  WaterUsageInsightItem,
} from "@/lib/api";

type HouseholdDetailsPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `R ${value.toFixed(2)}`;
}

function formatConsumption(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value.toFixed(1)} kL`;
}

function formatReading(value: number) {
  return `${value.toFixed(1)} kL`;
}

function usageStats(history: HouseholdMonthlyUsageItem[]) {
  const latest = history.at(-1);
  const totalConsumption = history.reduce(
    (sum, item) => sum + item.consumption_kL,
    0,
  );
  const highest = history.reduce<number | null>(
    (max, item) => (max === null ? item.consumption_kL : Math.max(max, item.consumption_kL)),
    null,
  );

  return {
    latestConsumption: latest?.consumption_kL,
    averageConsumption: history.length ? totalConsumption / history.length : null,
    highestConsumption: highest,
    latestTotalDue: latest?.total_due,
  };
}

export default async function HouseholdDetailsPage({
  params,
}: HouseholdDetailsPageProps) {
  const { householdId } = await params;
  let household: HouseholdDetails;
  let monthlyUsage: HouseholdMonthlyUsageItem[];
  let insights: WaterUsageInsightItem[];

  try {
    [household, monthlyUsage, insights] = await Promise.all([
      getHousehold(householdId),
      getHouseholdMonthlyUsage(householdId),
      getHouseholdInsights(householdId),
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
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <Link
              href="/municipal/households"
              className="text-sm font-medium text-teal-700 hover:text-teal-900"
            >
              Back to households
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">
              Household Details
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-800">
              {household.customer_name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Account {household.account_number} · {household.physical_address}
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <InfoCard
              title="Household profile"
              rows={[
                ["Customer name", household.customer_name],
                ["Account number", household.account_number],
                ["Physical address", household.physical_address],
                ["Stand number", household.stand_number],
                ["Township", household.township],
                ["Region", household.region],
                ["Ward", household.ward],
              ]}
            />
            <InfoCard
              title="Water meter"
              rows={[
                ["Meter number", household.meter_number ?? "Not available"],
                ["Resource type", household.resource_type ?? "Not available"],
                ["Unit", household.unit ?? "Not available"],
              ]}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Latest consumption"
              value={formatConsumption(stats.latestConsumption)}
            />
            <MetricCard
              label="Average monthly consumption"
              value={formatConsumption(stats.averageConsumption)}
            />
            <MetricCard
              label="Highest monthly consumption"
              value={formatConsumption(stats.highestConsumption)}
            />
            <MetricCard
              label="Latest total due"
              value={formatCurrency(stats.latestTotalDue)}
            />
          </section>

          <HouseholdUsageChart data={history} />
          <HouseholdInsightsPanel insights={insights} />
          <MonthlyUsageTable history={history} />
        </div>
      </main>
    </div>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <dl className="mt-4 divide-y divide-slate-100">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]"
          >
            <dt className="font-medium text-slate-500">{label}</dt>
            <dd className="text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HouseholdInsightsPanel({
  insights,
}: {
  insights: WaterUsageInsightItem[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Usage Insights</h2>
        <Link
          href="/municipal/insights"
          className="text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          View all insights
        </Link>
      </div>
      {insights.length ? (
        <div className="mt-4 space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.insight_id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
              <p className="mt-1 text-sm text-slate-600">{insight.summary}</p>
              <p className="mt-2 text-xs font-medium uppercase text-slate-500">
                {insight.severity} severity - {insight.statement_month}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No unusual patterns detected from the available monthly readings.
        </p>
      )}
    </section>
  );
}

function MonthlyUsageTable({ history }: { history: HouseholdMonthlyUsageItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-950">
          Monthly usage and billing history
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Statement month</th>
              <th className="px-4 py-3">Reading period</th>
              <th className="px-4 py-3">Opening reading</th>
              <th className="px-4 py-3">Closing reading</th>
              <th className="px-4 py-3">Consumption</th>
              <th className="px-4 py-3">Average daily usage</th>
              <th className="px-4 py-3">Water total</th>
              <th className="px-4 py-3">Municipal total due</th>
              <th className="px-4 py-3">Invoice number</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.length ? (
              history.map((item) => (
                <tr key={item.invoice_number}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {item.statement_month_label}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {item.reading_period_start} to {item.reading_period_end}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatReading(item.opening_reading_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatReading(item.closing_reading_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(item.consumption_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(item.average_daily_consumption_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatCurrency(item.water_total_including_vat)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatCurrency(item.total_due)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {item.invoice_number}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={9}>
                  No monthly usage records are available for this household.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
