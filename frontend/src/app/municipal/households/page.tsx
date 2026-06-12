import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import { getHouseholds, HouseholdListItem } from "@/lib/api";

type HouseholdsPageProps = {
  searchParams: Promise<{
    search?: string;
  }>;
};

function formatCurrency(value: number | null) {
  return value === null ? "Not available" : `R ${value.toFixed(2)}`;
}

function formatConsumption(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)} kL`;
}

export default async function HouseholdsPage({
  searchParams,
}: HouseholdsPageProps) {
  const { search = "" } = await searchParams;
  const trimmedSearch = search.trim();
  const households = await getHouseholds({
    limit: 200,
    offset: 0,
    search: trimmedSearch,
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Municipal accounts
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Households
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Monitor household water accounts and monthly usage.
            </p>
          </header>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="sr-only" htmlFor="household-search">
                Search households
              </label>
              <input
                id="household-search"
                name="search"
                type="search"
                defaultValue={trimmedSearch}
                placeholder="Search by account, customer name, or address"
                className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Search
              </button>
              <Link
                href="/municipal/households"
                className="rounded-md border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear search
              </Link>
            </form>
            <p className="mt-4 text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {households.length}
              </span>{" "}
              household{households.length === 1 ? "" : "s"}
              {trimmedSearch ? ` matching "${trimmedSearch}"` : ""}.
            </p>
          </section>

          <HouseholdTable households={households} />
        </div>
      </main>
    </div>
  );
}

function HouseholdTable({ households }: { households: HouseholdListItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Account number</th>
              <th className="px-4 py-3">Customer name</th>
              <th className="px-4 py-3">Physical address</th>
              <th className="px-4 py-3">Meter number</th>
              <th className="px-4 py-3">Latest statement month</th>
              <th className="px-4 py-3">Latest consumption</th>
              <th className="px-4 py-3">Latest total due</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {households.length ? (
              households.map((household) => (
                <tr key={household.household_id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {household.account_number}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {household.customer_name}
                  </td>
                  <td className="min-w-72 px-4 py-3 text-slate-600">
                    {household.physical_address}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {household.meter_number ?? "Not available"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {household.latest_statement_month ?? "Not available"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatConsumption(household.latest_consumption_kL)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatCurrency(household.latest_total_due)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/municipal/households/${household.household_id}`}
                      className="font-medium text-teal-700 hover:text-teal-900"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={8}>
                  No households found. Try a different account number, name, or
                  address.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
