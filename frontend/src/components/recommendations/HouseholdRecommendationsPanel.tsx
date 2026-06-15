import Link from "next/link";

import { RecommendationItem } from "@/lib/api";


const severityClassNames = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-800",
};

export function HouseholdRecommendationsPanel({
  recommendations,
}: {
  recommendations: RecommendationItem[];
}) {
  return (
    <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Household Recommendations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Practical next steps across water, electricity, and waste.
          </p>
        </div>
      </div>

      {recommendations.length ? (
        <div className="mt-4 space-y-3">
          {recommendations.slice(0, 6).map((item) => (
            <article
              key={item.recommendation_id}
              className={`rounded-2xl border p-4 ${severityClassNames[item.severity]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase">
                  {labelize(item.module)}
                </p>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">
                  {labelize(item.severity)}
                </span>
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
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          No urgent recommendations right now.
        </p>
      )}
    </section>
  );
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
