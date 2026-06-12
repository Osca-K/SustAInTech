export default function MeterUploadLoading() {
  return (
    <main className="min-h-screen bg-emerald-50/40 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-36 rounded-xl border border-emerald-100 bg-white shadow-sm" />
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="h-72 rounded-xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-96 rounded-xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </main>
  );
}
