export default function ResidentDashboardLoading() {
  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <div className="border-b border-emerald-100 bg-white/90 px-4 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-4 w-28 rounded bg-emerald-100" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-36 rounded-xl border border-emerald-100 bg-white shadow-sm" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["usage", "average", "bill", "meter"].map((item) => (
            <div
              key={item}
              className="h-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div className="h-96 rounded-xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-96 rounded-xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}
