import { ReactNode } from "react";


export function ResidentSectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}
