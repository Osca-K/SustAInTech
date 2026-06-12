import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HouseholdTable } from "@/components/dashboard/HouseholdTable";
import { MonthlyWaterUsageChart } from "@/components/dashboard/MonthlyWaterUsageChart";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { UploadStatusPanel } from "@/components/dashboard/UploadStatusPanel";
import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  getDashboardSummary,
  getHouseholds,
  getMonthlyWaterUsage,
  getUploadStatuses,
} from "@/lib/api";

export default async function MunicipalDashboardPage() {
  const [summary, monthlyUsage, uploadStatuses, households] = await Promise.all([
    getDashboardSummary(),
    getMonthlyWaterUsage(),
    getUploadStatuses(),
    getHouseholds(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardHeader />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Households" value={summary.household_count} />
            <SummaryCard label="Water meters" value={summary.water_meter_count} />
            <SummaryCard
              label="Monthly readings"
              value={summary.monthly_reading_count}
            />
            <SummaryCard
              label="Municipal statements"
              value={summary.monthly_statement_count}
            />
          </section>

          <p className="text-sm text-slate-500">
            Latest statement month:{" "}
            <span className="font-medium text-slate-700">
              {summary.latest_statement_month ?? "Not available"}
            </span>
          </p>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <MonthlyWaterUsageChart data={monthlyUsage} />
            <UploadStatusPanel statuses={uploadStatuses} />
          </div>

          <HouseholdTable households={households} />
        </div>
      </main>
    </div>
  );
}
