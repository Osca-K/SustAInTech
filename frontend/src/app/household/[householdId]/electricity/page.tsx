"use client";

import Link from "next/link";
import { FormEvent, ReactNode, use, useEffect, useState } from "react";

import {
  ElectricityTopupHistoryItem,
  HouseholdElectricitySummary,
  createHouseholdElectricityTopup,
  getHouseholdElectricitySummary,
} from "@/lib/api";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const emptySummary: HouseholdElectricitySummary = {
  household_id: "",
  total_spend: 0,
  total_units: 0,
  average_cost_per_kWh: 0,
  estimated_daily_spend: 0,
  estimated_daily_usage_kWh: 0,
  latest_balance_kWh: null,
  low_balance_warning: false,
  recent_topups: [],
};
const inputClass =
  "min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);
  const [summary, setSummary] = useState<HouseholdElectricitySummary>(emptySummary);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [balance, setBalance] = useState("");
  const [supplier, setSupplier] = useState("");
  const [tokenLast4, setTokenLast4] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHouseholdElectricitySummary(householdId)
      .then(setSummary)
      .catch(() => setSummary({ ...emptySummary, household_id: householdId }));
  }, [householdId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountValue = Number(amount);
    const unitsValue = Number(units);
    const balanceValue = balance.trim() ? Number(balance) : null;

    if (!purchaseDate || Number.isNaN(amountValue) || Number.isNaN(unitsValue)) {
      setError("Enter a purchase date, amount paid, and units bought.");
      return;
    }
    if (
      amountValue < 0 ||
      unitsValue < 0 ||
      (balanceValue !== null && (Number.isNaN(balanceValue) || balanceValue < 0))
    ) {
      setError("Electricity values must be zero or greater.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await createHouseholdElectricityTopup(householdId, {
        purchase_date: purchaseDate,
        amount_zar: amountValue,
        units_kWh: unitsValue,
        meter_balance_kWh: balanceValue,
        supplier: supplier.trim() || null,
        token_reference_last4: tokenLast4.trim() ? tokenLast4.trim().slice(-4) : null,
        notes: notes.trim() || null,
      });
      setAmount("");
      setUnits("");
      setBalance("");
      setSupplier("");
      setTokenLast4("");
      setNotes("");
      setMessage("Electricity purchase saved.");
      setSummary(await getHouseholdElectricitySummary(householdId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Electricity purchase could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <nav className="border-b border-emerald-100 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-lg font-semibold text-slate-950">SustAInTech</p>
          <p className="text-sm font-medium text-teal-700">Household Portal</p>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <Link
            href={`/household/${householdId}`}
            className="text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            Return to household dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Prepaid Electricity Tracker
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Record prepaid electricity purchases and monitor estimated household usage.
          </p>
        </header>

        {summary.low_balance_warning ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Latest entered meter balance is below 10 kWh. Consider topping up soon.
          </p>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Total spend" value={formatCurrency(summary.total_spend)} />
          <SummaryCard label="Total units" value={`${summary.total_units.toFixed(1)} kWh`} />
          <SummaryCard label="Average cost per kWh" value={`R ${summary.average_cost_per_kWh.toFixed(3)}`} />
          <SummaryCard label="Estimated daily spend" value={formatCurrency(summary.estimated_daily_spend)} />
          <SummaryCard label="Estimated daily usage" value={`${summary.estimated_daily_usage_kWh.toFixed(1)} kWh`} />
          <SummaryCard
            label="Latest balance"
            value={
              summary.latest_balance_kWh === null
                ? "Not entered"
                : `${summary.latest_balance_kWh.toFixed(1)} kWh`
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">
              Save electricity purchase
            </h2>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Do not enter your full prepaid token number. Only the last 4 digits may be saved for reference.
            </p>

            <Field label="Purchase date">
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Amount paid (R)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Units bought (kWh)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Current meter balance (optional)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Supplier (optional)">
              <input
                type="text"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Token ref last 4 (optional)">
              <input
                type="text"
                maxLength={4}
                value={tokenLast4}
                onChange={(event) => setTokenLast4(event.target.value.slice(-4))}
                className={inputClass}
              />
            </Field>
            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={`${inputClass} py-2`}
              />
            </Field>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Saving..." : "Save electricity purchase"}
            </button>
          </form>

          <HistoryTable topups={summary.recent_topups} />
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HistoryTable({ topups }: { topups: ElectricityTopupHistoryItem[] }) {
  return (
    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Units</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Token ref</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {topups.length ? (
            topups.map((topup) => (
              <tr key={topup.topup_id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {topup.purchase_date}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatCurrency(topup.amount_zar)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {topup.units_kWh.toFixed(1)} kWh
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {topup.meter_balance_kWh === null
                    ? "Not entered"
                    : `${topup.meter_balance_kWh.toFixed(1)} kWh`}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {topup.supplier ?? "Not entered"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {topup.token_reference_last4 ?? "Not saved"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={6}>
                No electricity purchases have been saved yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function formatCurrency(value: number) {
  return `R ${value.toFixed(2)}`;
}
