import Link from "next/link";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";

export default function HouseholdNotFound() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Household records
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Household not found
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              The selected household could not be found in the operational
              database.
            </p>
            <Link
              href="/municipal/households"
              className="mt-5 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Back to households
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
