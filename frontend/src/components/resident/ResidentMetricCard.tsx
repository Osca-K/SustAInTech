export function ResidentMetricCard({
  label,
  value,
  accent = "text-slate-950",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase leading-4 text-slate-500">
        {label}
      </p>
      <p className={`mt-2 break-words text-xl font-semibold leading-7 ${accent}`}>
        {value}
      </p>
    </article>
  );
}
