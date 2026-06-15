import { ReactNode } from "react";


export function ResidentHeroCard({
  children,
  accent = "from-slate-100 via-white to-cyan-50",
  className = "",
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br ${accent} p-6 shadow-sm ${className}`}
    >
      <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/35" />
      <div className="relative">{children}</div>
    </section>
  );
}
