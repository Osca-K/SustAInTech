import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import { RecommendationItem, RecommendationModule, getMunicipalRecommendations } from "@/lib/api";


const modules: { key: RecommendationModule; label: string }[] = [
  { key: "water", label: "Water" },
  { key: "electricity", label: "Electricity" },
  { key: "waste", label: "Waste" },
  { key: "combined", label: "Combined" },
];

const severityClassNames = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-800",
};

export default async function MunicipalRecommendationsPage() {
  const { recommendations } = await getMunicipalRecommendations();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Rule-based alerts
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Community Recommendations
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Rule-based alerts and opportunities across water, electricity, and waste.
            </p>
          </header>

          <section className="grid gap-6 xl:grid-cols-2">
            {modules.map((module) => (
              <RecommendationGroup
                key={module.key}
                title={module.label}
                recommendations={recommendations.filter(
                  (item) => item.module === module.key,
                )}
              />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

function RecommendationGroup({
  title,
  recommendations,
}: {
  title: string;
  recommendations: RecommendationItem[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {recommendations.length ? (
          recommendations.map((item) => (
            <article
              key={item.recommendation_id}
              className={`rounded-lg border p-4 ${severityClassNames[item.severity]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase">
                  {labelize(item.severity)}
                </p>
                <p className="text-xs font-semibold uppercase">
                  {labelize(item.status)}
                </p>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-700">{item.message}</p>
              <Link
                href={item.action_url}
                className="mt-4 inline-flex text-sm font-semibold text-teal-800 hover:text-teal-950"
              >
                {item.action_label}
              </Link>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No active {title.toLowerCase()} recommendations.
          </p>
        )}
      </div>
    </section>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
