export default function HouseholdPortalLoading() {
  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <div className="border-b border-emerald-100 bg-white/90 px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-28 rounded bg-emerald-100" />
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-80 max-w-full rounded bg-slate-200" />
        <div className="mt-4 h-4 w-96 max-w-full rounded bg-slate-200" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {["one", "two", "three"].map((item) => (
            <div
              key={item}
              className="h-72 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
