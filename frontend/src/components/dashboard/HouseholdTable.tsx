import type { HouseholdListItem } from "@/lib/api";

type HouseholdTableProps = {
  households: HouseholdListItem[];
};

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
});

function formatConsumption(value: number | null) {
  return value === null ? "No reading" : `${value.toFixed(1)} kL`;
}

function formatCurrency(value: number | null) {
  return value === null ? "No statement" : currencyFormatter.format(value);
}

export function HouseholdTable({ households }: HouseholdTableProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Household Overview
        </h2>
      </div>
      {households.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">
          No households are available in the operational database yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Account number</th>
                <th className="px-5 py-3">Customer name</th>
                <th className="px-5 py-3">Physical address</th>
                <th className="px-5 py-3">Meter number</th>
                <th className="px-5 py-3">Latest month</th>
                <th className="px-5 py-3">Latest consumption</th>
                <th className="px-5 py-3">Latest total due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {households.map((household) => (
                <tr key={household.household_id}>
                  <td className="px-5 py-4 font-medium text-slate-950">
                    {household.account_number}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {household.customer_name}
                  </td>
                  <td className="max-w-xs px-5 py-4 text-slate-700">
                    {household.physical_address}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {household.meter_number ?? "Not linked"}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {household.latest_statement_month ?? "No statement"}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {formatConsumption(household.latest_consumption_kL)}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {formatCurrency(household.latest_total_due)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
