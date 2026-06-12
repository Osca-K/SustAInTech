import Link from "next/link";

export default function ResidentDashboardNotFound() {
  return (
    <main className="min-h-screen bg-emerald-50/40 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
          Household Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Household not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          This demo household profile could not be found.
        </p>
        <Link
          href="/household"
          className="mt-5 inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Switch household
        </Link>
      </section>
    </main>
  );
}
