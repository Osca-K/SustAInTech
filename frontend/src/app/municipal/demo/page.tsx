import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import { DemoScenarioStep, getDemoScenario } from "@/lib/api";


export default async function MunicipalDemoScenarioPage() {
  const scenario = await getDemoScenario();
  const metrics = scenario.summary_metrics;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Demo mode
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              SustAInTech Demo Scenario
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A guided walkthrough of the community resource optimisation story.
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Pilot area" value={scenario.pilot_area} />
            <SummaryCard label="Demo household" value={scenario.demo_household_id || "Not available"} />
            <SummaryCard label="Households monitored" value={metrics.households_monitored} />
            <SummaryCard label="Active recommendations" value={metrics.active_recommendations} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
                {scenario.community_name}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {scenario.scenario_title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {scenario.scenario_subtitle}
              </p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Water statements" value={metrics.water_statements_processed} />
              <SummaryCard label="Meter submissions" value={metrics.meter_submissions} />
              <SummaryCard label="Waste queries" value={metrics.waste_queries} />
              <SummaryCard label="Electricity top-ups" value={metrics.electricity_topups} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Demo Path</h2>
            <div className="mt-5 space-y-4">
              {scenario.steps.map((step) => (
                <DemoStepCard key={step.step_number} step={step} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Quick Links</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scenario.quick_links.map((link) => (
                <Link
                  key={link.label}
                  href={link.url}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DemoStepCard({ step }: { step: DemoScenarioStep }) {
  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[96px_minmax(0,1fr)]">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">Step</p>
        <p className="mt-1 text-3xl font-semibold text-teal-700">
          {step.step_number}
        </p>
      </div>
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-700">
              {labelize(step.module)}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">
              {step.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={step.primary_url}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Open page
            </Link>
            {step.secondary_url ? (
              <Link
                href={step.secondary_url}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View related page
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{step.description}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {step.talking_points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </article>
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

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
