import { ReactNode } from "react";

import { ImpactBarChart } from "@/components/impact/ImpactBarCharts";
import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  ImpactWaterActivityItem,
  ImpactWasteActivityItem,
  getImpactSummary,
} from "@/lib/api";

export default async function MunicipalImpactPage() {
  const summary = await getImpactSummary();
  const wasteChartData = [
    { label: "Recyclable", value: summary.recyclable_queries },
    { label: "Organic", value: summary.organic_queries },
    { label: "E-waste", value: summary.e_waste_queries },
    { label: "Hazardous", value: summary.hazardous_queries },
    { label: "Reuse", value: summary.reuse_or_donate_queries },
    { label: "General", value: summary.general_waste_queries },
    { label: "Unknown", value: summary.unknown_waste_queries },
  ];
  const waterStatusData = [
    { label: "Accepted", value: summary.accepted_meter_submissions },
    { label: "Review", value: summary.review_required_meter_submissions },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Community resource optimization
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              SustAInTech Impact Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A community-level view of water monitoring and waste-sorting awareness.
            </p>
          </header>

          <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              How can communities use AI to reduce waste and optimize essential resources?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              SustAInTech helps communities optimize essential resources by combining municipal
              water data, resident meter tracking, and household waste-sorting guidance.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Households monitored" value={summary.total_households} />
            <SummaryCard label="Water statements processed" value={summary.total_water_statements} />
            <SummaryCard label="Meter submissions" value={summary.total_meter_submissions} />
            <SummaryCard label="Waste sorting queries" value={summary.total_waste_queries} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Water Resource Monitoring
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Review-required readings help identify unusual usage patterns for follow-up.
                </p>
              </div>
              <p className="text-sm font-medium text-teal-700">
                Review rate: {summary.water_review_rate_percent.toFixed(1)}%
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Total water usage" value={`${summary.total_water_usage_kL.toFixed(1)} kL`} />
              <SummaryCard label="Average household usage" value={`${summary.average_household_water_usage_kL.toFixed(1)} kL`} />
              <SummaryCard label="Highest monthly household usage" value={`${summary.highest_household_monthly_usage_kL.toFixed(1)} kL`} />
              <SummaryCard label="Submissions needing review" value={summary.review_required_meter_submissions} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Waste Sorting Awareness
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Awareness diversion potential is educational guidance, not actual waste diverted.
                </p>
              </div>
              <p className="text-sm font-medium text-teal-700">
                Awareness diversion potential: {summary.waste_diversion_awareness_percent.toFixed(1)}%
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Total waste queries" value={summary.total_waste_queries} />
              <SummaryCard label="Recyclable guidance" value={summary.recyclable_queries} />
              <SummaryCard label="Organic guidance" value={summary.organic_queries} />
              <SummaryCard label="E-waste / hazardous guidance" value={summary.e_waste_queries + summary.hazardous_queries} />
              <SummaryCard label="Reuse or donation guidance" value={summary.reuse_or_donate_queries} />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ImpactBarChart
              title="Waste classifications"
              data={wasteChartData}
              emptyText="No waste sorting query data is available yet."
            />
            <ImpactBarChart
              title="Water submission status"
              data={waterStatusData}
              emptyText="No resident meter submissions are available yet."
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <WaterActivityTable activity={summary.recent_water_activity} />
            <WasteActivityTable activity={summary.recent_waste_activity} />
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function WaterActivityTable({ activity }: { activity: ImpactWaterActivityItem[] }) {
  return (
    <ActivityTable title="Recent Water Activity">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Household</th>
          <th className="px-4 py-3">Reading</th>
          <th className="px-4 py-3">Daily estimate</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {activity.length ? (
          activity.map((item) => (
            <tr key={`${item.household_id}-${item.submitted_at}`}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.submitted_at}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{item.customer_name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {item.submitted_reading_kL.toFixed(1)} kL
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {item.estimated_daily_usage_kL === null
                  ? "Not available"
                  : `${item.estimated_daily_usage_kL.toFixed(1)} kL`}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {labelize(item.validation_status)}
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5} text="No recent water activity is available." />
        )}
      </tbody>
    </ActivityTable>
  );
}

function WasteActivityTable({ activity }: { activity: ImpactWasteActivityItem[] }) {
  return (
    <ActivityTable title="Recent Waste Queries">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Household</th>
          <th className="px-4 py-3">Item</th>
          <th className="px-4 py-3">Classification</th>
          <th className="px-4 py-3">Confidence</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {activity.length ? (
          activity.map((item) => (
            <tr key={`${item.household_id}-${item.submitted_at}-${item.item_name}`}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.submitted_at}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.household_id}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{item.item_name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {labelize(item.classification)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {labelize(item.confidence_level)}
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={5} text="No recent waste queries are available." />
        )}
      </tbody>
    </ActivityTable>
  );
}

function ActivityTable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
      </div>
    </section>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-4 py-8 text-slate-500" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
