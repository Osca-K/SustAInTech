import { ReactNode } from "react";


export function ResidentMetricStrip({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {children}
    </section>
  );
}
