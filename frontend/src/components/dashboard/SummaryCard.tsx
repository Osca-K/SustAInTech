type SummaryCardProps = {
  label: string;
  value: number;
};

export function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">
        {value.toLocaleString("en-ZA")}
      </p>
    </section>
  );
}
