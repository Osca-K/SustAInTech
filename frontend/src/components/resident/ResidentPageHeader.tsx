import { ReactNode } from "react";


export function ResidentPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  accent = "from-slate-100 via-white to-cyan-50",
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  accent?: string;
}) {
  return (
    <header className={`rounded-[2rem] border border-white/80 bg-gradient-to-br ${accent} p-6 shadow-sm`}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase text-slate-500">{eyebrow}</p>
      ) : null}
      <div className="mt-2 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-5 text-slate-600">{subtitle}</p>
        </div>
        {action}
      </div>
    </header>
  );
}
