import { ReactNode } from "react";


export function ResidentAlertCard({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success" | "danger";
}) {
  const toneClass = {
    info: "border-sky-100 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  }[tone];

  return (
    <div className={`rounded-3xl border px-4 py-3 text-sm leading-5 ${toneClass}`}>
      {children}
    </div>
  );
}
