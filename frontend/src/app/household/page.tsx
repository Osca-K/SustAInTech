import Link from "next/link";

import {
  getHouseholds,
  getInsights,
  HouseholdListItem,
  WaterUsageInsightItem,
} from "@/lib/api";
import { residentUsageStatus } from "@/lib/householdPortal";

function formatCurrency(value: number | null) {
  return value === null ? "Not available" : `R ${value.toFixed(2)}`;
}

function formatConsumption(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)} kL`;
}

function maskAccount(accountNumber: string) {
  return `•••• ${accountNumber.slice(-5)}`;
}

function groupInsightsByHousehold(insights: WaterUsageInsightItem[]) {
  const grouped = new Map<string, WaterUsageInsightItem[]>();
  for (const insight of insights) {
    grouped.set(insight.household_id, [
      ...(grouped.get(insight.household_id) ?? []),
      insight,
    ]);
  }
  return grouped;
}

export default async function HouseholdPortalPage() {
  const [households, insights] = await Promise.all([
    getHouseholds({ limit: 200 }),
    getInsights(),
  ]);
  const insightsByHousehold = groupInsightsByHousehold(insights);

  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <nav className="border-b border-emerald-100 bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-lg font-semibold text-slate-950">SustAInTech</p>
            <p className="text-sm text-teal-700">Household Portal</p>
          </div>
          <Link
            href="/municipal/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-teal-700"
          >
            Municipal dashboard
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            Resident demo access
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
            SustAInTech Household Portal
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Understand your water usage and manage your household resources more
            efficiently.
          </p>
          <p className="mt-4 rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Select a household profile to explore the resident experience.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {households.map((household) => (
            <HouseholdDemoCard
              key={household.household_id}
              household={household}
              insights={insightsByHousehold.get(household.household_id) ?? []}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function HouseholdDemoCard({
  household,
  insights,
}: {
  household: HouseholdListItem;
  insights: WaterUsageInsightItem[];
}) {
  const status = residentUsageStatus(insights);

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {household.customer_name}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {household.physical_address}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <InfoRow label="Account" value={maskAccount(household.account_number)} />
        <InfoRow
          label="Latest statement"
          value={household.latest_statement_month ?? "Not available"}
        />
        <InfoRow
          label="Latest consumption"
          value={formatConsumption(household.latest_consumption_kL)}
        />
        <InfoRow
          label="Latest total due"
          value={formatCurrency(household.latest_total_due)}
        />
      </dl>

      <Link
        href={`/household/${household.household_id}`}
        className="mt-6 inline-flex justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
      >
        Open household portal
      </Link>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
