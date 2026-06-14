import Link from "next/link";
import { ReactNode } from "react";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import { WasteQueryHistoryItem, getWasteSummary } from "@/lib/api";

export default async function MunicipalWastePage() {
  const summary = await getWasteSummary();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Household waste
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Waste Sorting Trends
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Simple aggregate view of resident waste-sorting queries.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total queries" value={summary.total_queries} />
            {summary.classification_counts.slice(0, 3).map((item) => (
              <SummaryCard
                key={item.classification}
                label={labelize(item.classification)}
                value={item.count}
              />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Classification counts">
              {summary.classification_counts.length ? (
                <CountList
                  items={summary.classification_counts.map((item) => ({
                    label: labelize(item.classification),
                    value: item.count,
                  }))}
                />
              ) : (
                <EmptyText text="No waste sorting queries have been submitted yet." />
              )}
            </Panel>

            <Panel title="Common selected categories">
              {summary.top_selected_categories.length ? (
                <CountList
                  items={summary.top_selected_categories.map((item) => ({
                    label: item.selected_category,
                    value: item.count,
                  }))}
                />
              ) : (
                <EmptyText text="No category selections are available yet." />
              )}
            </Panel>
          </section>

          <RecentQueriesTable queries={summary.recent_queries} />
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CountList({ items }: { items: { label: string; value: number }[] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 py-3">
          <dt className="font-medium text-slate-700">{item.label}</dt>
          <dd className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

function RecentQueriesTable({ queries }: { queries: WasteQueryHistoryItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Submitted at</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">Selected category</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {queries.length ? (
              queries.map((query) => (
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
                    {query.selected_category ?? "Not selected"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {labelize(query.confidence_level)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/municipal/households/${query.household_id}`}
                      className="font-medium text-teal-700 hover:text-teal-900"
                    >
                      View household
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={6}>
                  No recent waste sorting queries are available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
