export function DashboardHeader() {
  return (
    <header className="flex flex-col gap-2">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-teal-700">
        SustAInTech
      </p>
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">
          Municipal Resource Dashboard
        </h1>
        <p className="mt-1 text-lg text-slate-700">
          Star Village / New Protea Pilot
        </p>
      </div>
      <p className="text-sm text-slate-500">
        Water usage monitoring for Protea Glen Ext.28
      </p>
    </header>
  );
}
