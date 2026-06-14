import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import { MunicipalElectricityTopupItem, getMunicipalElectricitySummary } from "@/lib/api";

export default async function MunicipalElectricityPage() {
  const summary = await getMunicipalElectricitySummary();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Prepaid electricity
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Electricity Trends
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Aggregate view of household prepaid top-ups and low-balance situations.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard label="Households with top-ups" value={summary.total_households_with_topups} />
            <SummaryCard label="Total top-ups" value={summary.total_topups} />
            <SummaryCard label="Total spend" value={`R ${summary.total_spend_zar.toFixed(2)}`} />
            <SummaryCard label="Total units" value={`${summary.total_units_kWh.toFixed(1)} kWh`} />
            <SummaryCard label="Average cost per kWh" value={`R ${summary.average_cost_per_kWh.toFixed(3)}`} />
            <SummaryCard label="Low-balance households" value={summary.low_balance_households} />
          </section>

          <RecentTopupsTable topups={summary.recent_topups} />
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RecentTopupsTable({ topups }: { topups: MunicipalElectricityTopupItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Recent top-ups</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Household</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topups.length ? (
              topups.map((topup) => (
                <tr key={topup.topup_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {topup.purchase_date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/municipal/households/${topup.household_id}`}
                      className="font-medium text-teal-700 hover:text-teal-900"
                    >
                      {topup.household_id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    R {topup.amount_zar.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {topup.units_kWh.toFixed(1)} kWh
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {topup.meter_balance_kWh === null
                      ? "Not entered"
                      : `${topup.meter_balance_kWh.toFixed(1)} kWh`}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={5}>
                  No prepaid electricity top-ups have been submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
