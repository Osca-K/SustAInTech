"use client";

import { FormEvent, ReactNode, use, useEffect, useState } from "react";

import { ResidentAlertCard } from "@/components/resident/ResidentAlertCard";
import { ResidentMetricCard } from "@/components/resident/ResidentMetricCard";
import { ResidentMetricStrip } from "@/components/resident/ResidentMetricStrip";
import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { ResidentPageHeader } from "@/components/resident/ResidentPageHeader";
import { ResidentSectionCard } from "@/components/resident/ResidentSectionCard";
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
  "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

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
    <ResidentMobileShell householdId={householdId}>
      <div className="space-y-5 bg-[radial-gradient(circle_at_top,#fde68a_0,#fff7ed_42%,#f8fafc_78%)] px-4 py-5">
        <ResidentPageHeader
          eyebrow="Electricity"
          title="Prepaid Tracker"
          subtitle="Record prepaid purchases and monitor estimated household usage."
          accent="from-amber-100 via-white to-orange-50"
        />

        {summary.low_balance_warning ? (
          <ResidentAlertCard tone="warning">
            Latest entered meter balance is below 10 kWh. Consider topping up soon.
          </ResidentAlertCard>
        ) : null}

        <ResidentMetricStrip>
          <ResidentMetricCard label="Total spend" value={formatCurrency(summary.total_spend)} accent="text-amber-800" />
          <ResidentMetricCard label="Total units" value={`${summary.total_units.toFixed(1)} kWh`} />
          <ResidentMetricCard label="Daily spend" value={formatCurrency(summary.estimated_daily_spend)} />
          <ResidentMetricCard
            label="Latest balance"
            value={
              summary.latest_balance_kWh === null
                ? "Not entered"
                : `${summary.latest_balance_kWh.toFixed(1)} kWh`
            }
          />
        </ResidentMetricStrip>

        <section className="space-y-5">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">
              Save electricity purchase
            </h2>
            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Saving..." : "Save electricity purchase"}
            </button>
          </form>

          <HistoryTable topups={summary.recent_topups} />
        </section>
      </div>
    </ResidentMobileShell>
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

function HistoryTable({ topups }: { topups: ElectricityTopupHistoryItem[] }) {
  return (
    <ResidentSectionCard>
      <h2 className="text-lg font-semibold text-slate-950">Purchase history</h2>
      <div className="mt-4 space-y-3">
        {topups.length ? (
          topups.map((topup) => (
            <article key={topup.topup_id} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-950">{topup.purchase_date}</p>
                <p className="font-semibold text-amber-800">{formatCurrency(topup.amount_zar)}</p>
              </div>
              <dl className="mt-3 space-y-2 text-slate-600">
                <HistoryRow label="Units" value={`${topup.units_kWh.toFixed(1)} kWh`} />
                <HistoryRow
                  label="Balance"
                  value={
                    topup.meter_balance_kWh === null
                      ? "Not entered"
                      : `${topup.meter_balance_kWh.toFixed(1)} kWh`
                  }
                />
                <HistoryRow label="Supplier" value={topup.supplier ?? "Not entered"} />
                <HistoryRow label="Token ref" value={topup.token_reference_last4 ?? "Not saved"} />
              </dl>
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No electricity purchases have been saved yet.
          </p>
        )}
      </div>
    </ResidentSectionCard>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function formatCurrency(value: number) {
  return `R ${value.toFixed(2)}`;
}
