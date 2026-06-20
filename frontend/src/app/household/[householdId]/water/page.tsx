import Link from "next/link";
import { ReactNode } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { WaterUsageChartCard } from "@/components/water/WaterUsageChartCard";


type WaterPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const waterAssetBase = "/assets/resident/water";

export default async function HouseholdWaterPage({ params }: WaterPageProps) {
  const { householdId } = await params;

  return (
    <ResidentMobileShell householdId={householdId}>
      <div
        className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f1f6ff_55%,#f8fbff_100%)] px-4 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#07184a]"
        style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <div className="space-y-4">
          <WaterHeader />
          <WaterHero />
          <WaterMetricGrid />
          <WaterMeterCard householdId={householdId} />
          <WaterUsageChartCard />
        </div>
      </div>
    </ResidentMobileShell>
  );
}

function WaterHeader() {
  return (
    <header className="flex items-center gap-3 px-1 pb-1">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white bg-white/85 text-[#5e96f8] shadow-[0_10px_25px_rgba(56,107,255,0.11)] backdrop-blur">
        <DropletIcon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-[2rem] font-extrabold leading-none tracking-[-0.045em] text-[#07184a]">
          Water
        </h1>
        <p className="mt-1.5 text-[0.72rem] font-medium leading-4 text-[#71809f]">
          Stay aware of usage and make every litre count.
        </p>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white bg-white/85 text-[#263866] shadow-[0_8px_22px_rgba(56,86,160,0.10)] backdrop-blur"
      >
        <BellIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function WaterHero() {
  return (
    <section
      className="relative h-[17.5rem] overflow-hidden rounded-[1.75rem] border border-white/80 bg-cover bg-center shadow-[0_18px_42px_rgba(40,103,210,0.16)]"
      style={{ backgroundImage: `url("${waterAssetBase}/water-hero-ripple.png")` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,70,180,0.56)_0%,rgba(35,106,216,0.22)_47%,rgba(255,255,255,0.04)_75%)]" />
      <div className="relative z-10 flex h-full flex-col items-start px-7 py-6 text-white">
        <p className="text-[1.05rem] font-semibold tracking-[-0.02em]">Total Today Usage</p>
        <p className="mt-3 flex items-end font-extrabold leading-none tracking-[-0.055em]">
          <span className="text-[5.25rem]">248</span>
          <span className="mb-2 ml-2 text-[2.4rem] font-semibold tracking-[-0.03em]">L</span>
        </p>
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-[0.78rem] font-semibold text-[#53627e] shadow-[0_9px_22px_rgba(24,76,170,0.14)] backdrop-blur">
          <DropletIcon className="h-3.5 w-3.5 text-[#6f9ff7]" />
          <span className="text-[#35a874]">{"\u2191 12%"}</span>
          <span>vs yesterday</span>
        </div>
      </div>
    </section>
  );
}

function WaterMetricGrid() {
  return (
    <section className="grid grid-cols-2 gap-2.5">
      <WaterMetricCard
        background="water-active-fixtures-card.png"
        title="Active Fixtures"
        value="3"
        supporting="Running now"
        valueClassName="text-[#3978f5]"
      />
      <WaterMetricCard
        background="water-leak-status-card.png"
        title="Leak Status"
        value="All Clear"
        supporting="No leaks detected"
        valueClassName="text-[#45b89a]"
        compactValue
      />
      <WaterMetricCard
        background="water-cost-card.png"
        title="Today's Cost"
        value="$0.86"
        supporting={"\u2193 8% vs yesterday"}
        valueClassName="text-[#715bf2]"
        supportingClassName="text-[#42a979]"
      />
      <WaterMetricCard
        background="water-weekly-average-card.png"
        title="Weekly Average"
        value="196 L"
        supporting={"\u2193 5% vs last week"}
        valueClassName="text-[#3978f5]"
        supportingClassName="text-[#42a979]"
        compactValue
      />
    </section>
  );
}

function WaterMetricCard({
  background,
  title,
  value,
  supporting,
  valueClassName,
  supportingClassName = "text-[#71809f]",
  compactValue = false,
}: {
  background: string;
  title: string;
  value: string;
  supporting: string;
  valueClassName: string;
  supportingClassName?: string;
  compactValue?: boolean;
}) {
  return (
    <article
      className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-[1.55rem] bg-transparent bg-cover bg-center bg-no-repeat shadow-[0_12px_28px_rgba(48,93,170,0.09)]"
      style={{ backgroundImage: `url("${waterAssetBase}/${background}")` }}
    >
      <div className="absolute inset-y-0 left-[43%] right-2 flex flex-col justify-center pt-1">
        <h2 className="text-[0.7rem] font-bold leading-tight text-[#0b1744]">{title}</h2>
        <p className={`mt-2 font-extrabold leading-none tracking-[-0.04em] ${compactValue ? "text-[1.3rem]" : "text-[1.85rem]"} ${valueClassName}`}>
          {value}
        </p>
        <p className={`mt-2 whitespace-nowrap text-[0.64rem] font-medium ${supportingClassName}`}>
          {supporting}
        </p>
      </div>
    </article>
  );
}

function WaterMeterCard({ householdId }: { householdId: string }) {
  return (
    <section
      className="relative h-[12rem] overflow-hidden rounded-[1.75rem] border border-white/90 bg-cover bg-center shadow-[0_16px_36px_rgba(43,102,198,0.13)]"
      style={{ backgroundImage: `url("${waterAssetBase}/water-meter-scan.png")` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,253,255,0.98)_0%,rgba(244,249,255,0.91)_36%,rgba(239,247,255,0.17)_68%,transparent_100%)]" />
      <div className="relative z-10 flex h-full w-[47%] flex-col items-start justify-center px-5">
        <h2 className="whitespace-nowrap text-[1.15rem] font-extrabold tracking-[-0.03em] text-[#07184a]">
          Scan Meter
        </h2>
        <p className="mt-2 text-[0.72rem] font-medium leading-5 text-[#66738f]">
          Scan your water meter<br />to update usage
        </p>
        <Link
          href={`/household/${householdId}/meter-upload`}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6d75ef] to-[#5bcbea] px-4 text-[0.75rem] font-bold text-white shadow-[0_10px_22px_rgba(73,116,229,0.25)]"
        >
          <ScanIcon className="h-4 w-4" />
          Scan Now
        </Link>
      </div>
    </section>
  );
}

function IconShell({ className, children }: { className: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function DropletIcon({ className }: { className: string }) {
  return (
    <IconShell className={className}>
      <path d="M12 2.8S6.8 8.4 6.8 13a5.2 5.2 0 0 0 10.4 0C17.2 8.4 12 2.8 12 2.8Z" fill="currentColor" stroke="none" />
      <path d="M9.2 14.2c.3 1.5 1.4 2.3 2.8 2.6" stroke="white" strokeOpacity=".72" />
    </IconShell>
  );
}

function BellIcon({ className }: { className: string }) {
  return (
    <IconShell className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </IconShell>
  );
}

function ScanIcon({ className }: { className: string }) {
  return (
    <IconShell className={className}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 12h10" />
    </IconShell>
  );
}
