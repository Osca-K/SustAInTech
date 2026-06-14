import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            SustAInTech
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Community Resource Tools
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Open the municipal dashboard, review water and waste trends, or view
            the combined impact story.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/municipal/impact"
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              View Impact Dashboard
            </Link>
            <Link
              href="/municipal/dashboard"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Municipal dashboard
            </Link>
            <Link
              href="/household"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Household portal
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
