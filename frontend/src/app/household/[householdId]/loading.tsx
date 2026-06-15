export default function ResidentDashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-200 text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-slate-50 px-4 py-5">
        <div className="h-40 rounded-[2rem] border border-white/80 bg-white shadow-sm" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          {["usage", "average", "bill", "meter"].map((item) => (
            <div
              key={item}
              className="h-28 rounded-3xl border border-white/80 bg-white shadow-sm"
            />
          ))}
        </div>
        <div className="mt-5 space-y-5">
          <div className="h-80 rounded-3xl border border-white/80 bg-white shadow-sm" />
          <div className="h-64 rounded-3xl border border-white/80 bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}
