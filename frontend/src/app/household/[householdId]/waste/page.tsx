"use client";

import { FormEvent, use, useEffect, useState } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { ResidentPageHeader } from "@/components/resident/ResidentPageHeader";
import { ResidentSectionCard } from "@/components/resident/ResidentSectionCard";
import {
  WasteQueryHistoryItem,
  WasteSortResult,
  getHouseholdWasteQueries,
  sortHouseholdWasteItem,
} from "@/lib/api";

type WastePageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const categories = [
  "Plastic",
  "Glass",
  "Paper/Cardboard",
  "Food/Organic",
  "Electronics",
  "Battery",
  "Clothing",
  "Chemical/Paint",
  "Other",
];

export default function HouseholdWastePage({ params }: WastePageProps) {
  const { householdId } = use(params);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [result, setResult] = useState<WasteSortResult | null>(null);
  const [history, setHistory] = useState<WasteQueryHistoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHouseholdWasteQueries(householdId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [householdId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemName.trim()) {
      setError("Enter an item name before requesting guidance.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const nextResult = await sortHouseholdWasteItem(householdId, {
        item_name: itemName.trim(),
        item_description: itemDescription.trim() || null,
        selected_category: selectedCategory || null,
      });
      setResult(nextResult);
      setHistory((current) => [nextResult, ...current]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Waste sorting failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="space-y-5 bg-[radial-gradient(circle_at_top,#bbf7d0_0,#f0fdf4_42%,#f8fafc_78%)] px-4 py-5">
        <ResidentPageHeader
          eyebrow="Recycling"
          title="Waste Sorting"
          subtitle="Check how to sort household waste before throwing it away."
          accent="from-emerald-100 via-white to-lime-50"
        />

        <section className="space-y-5">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm"
          >
            <label className="block text-sm font-medium text-slate-700">
              Item name
              <input
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="plastic bottle"
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Short description
              <textarea
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
                placeholder="Add a short note if it helps identify the item."
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Optional category selector
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Checking..." : "Get sorting guidance"}
            </button>

            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This guidance is for awareness only. Check local municipal rules for final disposal instructions.
            </p>
          </form>

          <div className="space-y-5">
            {result ? <ResultCard result={result} /> : <EmptyResultCard />}
            <HistoryTable history={history} />
          </div>
        </section>
      </div>
    </ResidentMobileShell>
  );
}

function ResultCard({ result }: { result: WasteSortResult }) {
  return (
    <ResidentSectionCard>
      <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
        Classification
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        {labelize(result.classification)}
      </h2>
      <dl className="mt-4 space-y-4 text-sm">
        <ResultRow label="Guidance" value={result.disposal_guidance} />
        <div>
          <dt className="font-medium text-slate-700">Preparation steps</dt>
          <dd className="mt-2">
            <ul className="list-disc space-y-1 pl-5 text-slate-600">
              {result.preparation_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </dd>
        </div>
        <ResultRow label="Confidence" value={labelize(result.confidence_level)} />
      </dl>
    </ResidentSectionCard>
  );
}

function EmptyResultCard() {
  return (
    <ResidentSectionCard>
      <h2 className="text-lg font-semibold text-slate-950">Sorting guidance</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter a waste item to see whether it should be recycled, composted,
        donated, handled safely, or placed in general waste.
      </p>
    </ResidentSectionCard>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-slate-700">{label}</dt>
      <dd className="mt-1 text-slate-600">{value}</dd>
    </div>
  );
}

function HistoryTable({ history }: { history: WasteQueryHistoryItem[] }) {
  return (
    <ResidentSectionCard>
      <h2 className="text-lg font-semibold text-slate-950">Recent sorting checks</h2>
      <div className="mt-4 space-y-3">
        {history.length ? (
          history.map((query) => (
            <article key={query.query_id} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{query.item_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{query.submitted_at}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {labelize(query.classification)}
                </span>
              </div>
              <p className="mt-3 text-slate-600">
                Confidence: <span className="font-semibold text-slate-900">{labelize(query.confidence_level)}</span>
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No waste sorting queries have been saved yet.
          </p>
        )}
      </div>
    </ResidentSectionCard>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
