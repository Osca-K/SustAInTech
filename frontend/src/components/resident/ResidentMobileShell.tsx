"use client";

import { ReactNode } from "react";

import { ResidentBottomNav } from "@/components/resident/ResidentBottomNav";


export function ResidentMobileShell({
  householdId,
  children,
}: {
  householdId: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-200 text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-slate-50 shadow-sm">
        <div className="w-full pb-[calc(9rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
      <ResidentBottomNav householdId={householdId} />
    </main>
  );
}
