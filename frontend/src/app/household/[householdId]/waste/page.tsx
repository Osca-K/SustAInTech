"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";

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
            Waste Sorting Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Check how to sort common household waste before throwing it away.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <label className="block text-sm font-medium text-slate-700">
              Item name
              <input
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="plastic bottle"
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Short description
              <textarea
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
                placeholder="Add a short note if it helps identify the item."
                rows={4}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Optional category selector
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
              className="mt-5 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Checking..." : "Get sorting guidance"}
            </button>

            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This guidance is for awareness only. Check local municipal rules for final disposal instructions.
            </p>
          </form>

          <div className="space-y-6">
            {result ? <ResultCard result={result} /> : <EmptyResultCard />}
            <HistoryTable history={history} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultCard({ result }: { result: WasteSortResult }) {
  return (
    <section className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
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
    </section>
  );
}

function EmptyResultCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Sorting guidance</h2>
      <p className="mt-2 text-sm text-slate-600">
        Enter a waste item to see whether it should be recycled, composted,
        donated, handled safely, or placed in general waste.
      </p>
    </section>
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
    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Classification</th>
            <th className="px-4 py-3">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.length ? (
            history.map((query) => (
              <tr key={query.query_id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {query.submitted_at}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {query.item_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {labelize(query.classification)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {labelize(query.confidence_level)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={4}>
                No waste sorting queries have been saved yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
