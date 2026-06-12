"use client";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";

export default function InsightsError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-rose-700">
              Backend unavailable
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Insights could not be loaded
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Start the FastAPI backend and try again. Insights are inferred
              dynamically from operational monthly water readings.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
