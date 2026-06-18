"use client";

import { ReactNode, use } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const electricityAssetBase = "/assets/resident/electricity";

const devices = [
  { name: "Smart Meter", room: "Main Line", state: "Active", accent: "blue" },
  { name: "Air Conditioner", room: "Living Room", state: "Active", accent: "amber" },
  { name: "Fridge", room: "Kitchen", state: "Active", accent: "amber" },
  { name: "Washing Machine", room: "Laundry Room", state: "Standby", accent: "amber" },
  { name: "Water Heater", room: "Bathroom", state: "Scheduled", accent: "amber" },
];

const categories = [
  { label: "Cooling", value: 35, color: "#1478f2" },
  { label: "Lighting", value: 22, color: "#ffb300" },
  { label: "Kitchen", value: 18, color: "#18b75b" },
  { label: "Laundry", value: 12, color: "#7c3ff2" },
  { label: "Other", value: 13, color: "#a9adff" },
];

const anomalyBars = [12, 14, 18, 16, 20, 22, 25, 32, 72, 78, 66, 28, 16, 12];
const anomalyLabels = ["12 AM", "2 AM", "4 AM", "6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM", "12 AM"];

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen bg-[#f5f8ff] px-4 pb-8 pt-4 font-sans text-[#0b1744]">
        <ElectricityHeader />
        <UsageHero />
        <ElectricitySummaryCards />
        <ScanMeterCard />
        <RecentTrendCard />
        <DevicesCard />
        <CategoryCard />
        <AnomalyCard />
        <MonitoringCard />
        <QuickActions />
      </div>
    </ResidentMobileShell>
  );
}

function ElectricityHeader() {
  return (
    <header className="mb-5 flex items-center justify-between px-1">
      <div>
        <h1 className="text-[1.45rem] font-extrabold leading-none tracking-[-0.04em] text-[#0b1744]">
          Electricity
        </h1>
        <p className="mt-1.5 text-[0.76rem] font-medium tracking-[-0.02em] text-[#5d6885]">
          Monitor and manage your home energy
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.07)]">
          <ElectricIcon name="bell" className="h-4 w-4" />
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.07)]">
          <ElectricIcon name="settings" className="h-4 w-4" />
        </span>
      </div>
    </header>
  );
}

function UsageHero() {
  return (
    <section className="relative h-[19.2rem] overflow-hidden rounded-[1.65rem] bg-[#87a2f5] p-6 text-white shadow-[0_12px_30px_rgba(30,64,175,0.12)]">
      <AssetImage
        src={`${electricityAssetBase}/electricity-total-usage-house-background.png`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[57%_center]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#5f7ff0]/76 via-[#93aaf1]/20 to-white/0" />
      <div className="absolute inset-y-0 left-0 w-[58%] bg-[radial-gradient(circle_at_28%_31%,rgba(255,255,255,0.18),transparent_42%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#5578df]/18 to-transparent" />

      <div className="relative h-full">
        <div className="absolute left-8 top-[5rem] max-w-[11.6rem]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[-0.01em] text-white/95">
            Today&apos;s Total Usage
          </p>
          <p className="mt-2 flex items-end gap-2 text-[4.7rem] font-extrabold leading-[0.9] tracking-[-0.07em] drop-shadow-[0_5px_12px_rgba(39,68,146,0.22)]">
            <span>8.7</span>
            <span className="mb-2 text-[1.15rem] font-bold tracking-[-0.02em]">kWh</span>
          </p>
          <p className="mt-3 inline-flex max-w-fit items-center gap-2 rounded-full border border-white/28 bg-white/18 px-3 py-1.5 text-[0.68rem] font-medium leading-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-md">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[0.75rem] text-emerald-100">↓</span>
            8% lower than yesterday
          </p>
        </div>
      </div>
    </section>
  );
}
function ElectricitySummaryCards() {
  return (
    <section className="mt-5 grid grid-cols-2 gap-4">
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/electricity-total_device_icon.png`}
        label="Total Devices"
        value="18"
        subtext="devices"
        accent="text-indigo-500"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/electricity-active_device.png`}
        label="Active Devices"
        value="7"
        subtext="in use now"
        accent="text-emerald-600"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/electricity-overload-status.png`}
        label="Overload Status"
        value="Normal"
        subtext="All systems safe"
        accent="text-emerald-600"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/electricity-total-usage-cost.png`}
        label="Today's Cost"
        value="$2.64"
        subtext="estimated"
        accent="text-violet-500"
      />
    </section>
  );
}

function ElectricitySummaryCard({
  backgroundSrc,
  label,
  value,
  subtext,
  accent,
}: {
  backgroundSrc: string;
  label: string;
  value: string;
  subtext: string;
  accent: string;
}) {
  return (
    <article className="relative h-[9.65rem] overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-[0_12px_30px_rgba(30,64,175,0.08)]">
      <AssetImage
        src={backgroundSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-white/0 to-white/8" />
      <div className="relative flex h-full flex-col justify-end pb-0.5">
        <p className="text-[0.74rem] font-semibold tracking-[-0.03em] text-[#0b1744]">{label}</p>
        <p className={`mt-1 text-[2rem] font-extrabold leading-none tracking-[-0.06em] ${accent}`}>{value}</p>
        <p className="mt-1 text-[0.72rem] font-medium text-[#5d6885]">{subtext}</p>
      </div>
    </article>
  );
}

function ScanMeterCard() {
  return (
    <section className="relative mt-5 h-[17.2rem] overflow-hidden rounded-[1.75rem] border border-[rgba(130,150,200,0.12)] bg-white p-[1.375rem] shadow-[0_14px_35px_rgba(50,80,160,0.08)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[url('/assets/resident/electricity/electricity-meter.png')] bg-cover bg-[center_38%] bg-no-repeat opacity-[0.78]"
      />
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.14)_45%,rgba(255,255,255,0.74)_76%,rgba(255,255,255,0.94)_100%)]" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#0b1744]">
            Scan Your Meter
          </h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/70 bg-white/85 text-sm font-bold text-[#66708a] shadow-[0_5px_14px_rgba(30,64,175,0.12)]">
            i
          </span>
        </div>

        <div className="flex-1" />

        <button className="mx-auto flex h-[3.25rem] w-[82%] items-center justify-center gap-3 rounded-[1.15rem] bg-gradient-to-br from-[#3e6bff] to-[#6a63f6] text-[1.05rem] font-bold text-white shadow-[0_10px_24px_rgba(62,107,255,0.22)]">
          <ElectricIcon name="scan" className="h-5 w-5" />
          Scan Meter
        </button>
      </div>
    </section>
  );
}

function RecentTrendCard() {
  return (
    <SectionCard className="mt-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.9rem] font-black tracking-[-0.05em]">Recent Trend</h2>
        <div className="grid grid-cols-3 rounded-xl bg-slate-50 p-1 text-[0.56rem] font-bold text-slate-500">
          <span className="rounded-lg bg-white px-2.5 py-1 text-amber-600 shadow-sm">Daily</span>
          <span className="px-2.5 py-1">Weekly</span>
          <span className="px-2.5 py-1">Monthly</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[0.58rem] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-amber-400" />
          This Week
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-amber-200" />
          Last Week
        </span>
      </div>
      <div className="mt-2 h-36">
        <svg className="h-full w-full" viewBox="0 0 360 150" role="img" aria-label="Electricity usage recent trend">
          <defs>
            <linearGradient id="thisWeekArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f5ad16" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#f5ad16" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="lastWeekArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f5c862" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f5c862" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[20, 50, 80, 110].map((y) => (
            <line key={y} x1="24" x2="354" y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
          ))}
          <path
            d="M28 92 C58 106 72 98 94 86 C122 68 141 72 164 70 C190 68 202 30 226 36 C252 43 252 92 284 82 C312 72 320 58 350 70 L350 124 L28 124 Z"
            fill="url(#thisWeekArea)"
          />
          <path
            d="M28 118 C58 128 76 120 94 110 C122 92 142 102 164 96 C190 90 206 58 226 70 C252 82 254 120 284 106 C312 92 322 90 350 98 L350 124 L28 124 Z"
            fill="url(#lastWeekArea)"
          />
          <path
            d="M28 92 C58 106 72 98 94 86 C122 68 141 72 164 70 C190 68 202 30 226 36 C252 43 252 92 284 82 C312 72 320 58 350 70"
            fill="none"
            stroke="#f5ad16"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M28 118 C58 128 76 120 94 110 C122 92 142 102 164 96 C190 90 206 58 226 70 C252 82 254 120 284 106 C312 92 322 90 350 98"
            fill="none"
            stroke="#f5c862"
            strokeDasharray="5 5"
            strokeLinecap="round"
            strokeWidth="2"
          />
          {[28, 94, 164, 226, 284, 350].map((x, index) => (
            <circle key={x} cx={x} cy={[92, 86, 70, 36, 82, 70][index]} r="4" fill="#fff" stroke="#f5ad16" strokeWidth="2" />
          ))}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
            <text key={day} x={28 + index * 53} y="144" fill="#475569" fontSize="9" textAnchor="middle">
              {day}
            </text>
          ))}
          {[0, 4, 8, 12, 16].map((tick, index) => (
            <text key={tick} x="0" y={116 - index * 28} fill="#64748b" fontSize="8">
              {tick} kWh
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-2 rounded-2xl bg-slate-50 p-3 text-center">
        <div className="border-r border-slate-200">
          <p className="text-[0.55rem] font-semibold text-slate-500">Avg. This Week</p>
          <p className="text-lg font-black tracking-[-0.06em]">8.7 <span className="text-[0.6rem]">kWh</span></p>
        </div>
        <div>
          <p className="text-[0.55rem] font-semibold text-slate-500">vs Last Week</p>
          <p className="text-lg font-black tracking-[-0.06em] text-emerald-600">6%</p>
        </div>
      </div>
    </SectionCard>
  );
}

function DevicesCard() {
  return (
    <SectionCard className="mt-4">
      <SectionTitle icon="devices">Your Devices</SectionTitle>
      <div className="mt-3 divide-y divide-slate-100">
        {devices.map((device) => (
          <div key={device.name} className="flex items-center gap-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <ElectricIcon name="device" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.78rem] font-black tracking-[-0.04em]">{device.name}</p>
              <p className="text-[0.62rem] font-semibold text-slate-500">{device.room}</p>
            </div>
            <span className={`text-[0.62rem] font-bold ${device.state === "Standby" ? "text-amber-500" : "text-emerald-500"}`}>
              {device.state}
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
            </span>
            <span className={`h-6 w-10 rounded-full p-0.5 ${device.state === "Standby" ? "bg-slate-200" : "bg-blue-500"}`}>
              <span className={`block h-5 w-5 rounded-full bg-white shadow-sm ${device.state === "Standby" ? "" : "translate-x-4"}`} />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[0.7rem] font-black text-blue-600">
        <span>+ Add New Device</span>
        <span>View All Devices &gt;</span>
      </div>
    </SectionCard>
  );
}

function CategoryCard() {
  const conic = `conic-gradient(${categories
    .map((item, index) => {
      const start = categories.slice(0, index).reduce((total, row) => total + row.value, 0);
      return `${item.color} ${start}% ${start + item.value}%`;
    })
    .join(", ")})`;

  return (
    <SectionCard className="mt-3">
      <h2 className="text-[0.9rem] font-black tracking-[-0.05em]">Usage by Category</h2>
      <div className="mt-3 grid grid-cols-[7.5rem_1fr] items-center gap-4">
        <div className="relative h-28 w-28 rounded-full" style={{ background: conic }}>
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
            <p className="text-lg font-black tracking-[-0.06em]">18.4</p>
            <p className="text-[0.58rem] font-semibold">kWh</p>
          </div>
        </div>
        <div className="space-y-2">
          {categories.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[0.66rem] font-semibold">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span>{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AnomalyCard() {
  return (
    <SectionCard className="mt-3">
      <div className="flex items-start justify-between">
        <div className="flex gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
            <ElectricIcon name="alert" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[0.86rem] font-black tracking-[-0.04em]">Anomaly Detection</h2>
            <p className="text-[0.72rem] font-black text-red-500">High usage detected</p>
            <p className="max-w-[13rem] text-[0.62rem] leading-4 text-[#17224e]">
              Usage between 5-8 PM is higher than your usual average.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[0.6rem] font-semibold text-red-500">
          <span className="h-2 w-2 bg-red-500" />
          Anomaly %
        </span>
      </div>
      <div className="mt-3 flex h-28 items-end gap-1.5 border-l border-b border-slate-200 pl-2">
        {anomalyBars.map((value, index) => (
          <div key={value + index} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[0.45rem] font-bold text-[#17224e]">{value}%</span>
            <span
              className={`w-full rounded-t-md ${value >= 60 ? "bg-red-500" : "bg-amber-400"}`}
              style={{ height: `${Math.max(value * 0.72, 8)}px` }}
            />
            {index % 2 === 0 ? (
              <span className="text-[0.43rem] font-bold text-[#17224e]">{anomalyLabels[index]}</span>
            ) : null}
          </div>
        ))}
      </div>
      <button className="mt-3 w-full rounded-2xl bg-red-50 py-2 text-[0.8rem] font-black text-red-500">
        View details
      </button>
    </SectionCard>
  );
}

function MonitoringCard() {
  return (
    <SectionCard className="mt-3 overflow-hidden !rounded-[1.45rem] !p-4 text-left shadow-[0_10px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[1rem] font-black leading-none tracking-[-0.05em] text-slate-950">
          Load Monitoring
        </h2>
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-black text-slate-500 shadow-sm">
          i
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[5.8rem_1fr] items-center gap-3">
        <div className="relative flex h-[5.8rem] w-[5.8rem] items-center justify-center overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-amber-50 via-white to-amber-100/80 shadow-[0_10px_22px_rgba(245,158,11,0.14)]">
          <div className="absolute left-3 top-3 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} className="h-0.5 w-0.5 rounded-full bg-amber-200" />
            ))}
          </div>
          <span className="absolute inset-2 rounded-[1rem] bg-white/55 blur-sm" />
          <AssetImage
            src={`${electricityAssetBase}/electricity-magnifier-check.png`}
            alt=""
            className="relative h-[6.8rem] w-[6.8rem] object-cover object-center mix-blend-multiply"
          />
          <span className="pointer-events-none absolute inset-0 rounded-[1.35rem] ring-1 ring-amber-100" />
        </div>

        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[0.55rem] font-black uppercase tracking-[0.08em] text-slate-400">
            <span className="h-2 w-2 rotate-45 rounded-[0.12rem] bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]" />
            AI Confidence
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[2.25rem] font-black leading-none tracking-[-0.1em] text-emerald-600">
              97%
            </p>
            <span className="h-7 w-7 rounded-full bg-emerald-50 p-2">
              <span className="block h-full w-full rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-emerald-100 bg-white">
            <span className="block h-full w-[97%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(34,197,94,0.24)]" />
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[0.55rem] font-semibold text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <ElectricIcon name="check" className="h-2.5 w-2.5" />
            </span>
            No anomaly detected
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-[1.15rem] bg-gradient-to-br from-slate-50 to-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_18px_rgba(15,23,42,0.04)]">
        <p className="text-center text-[0.65rem] font-semibold leading-4 tracking-[-0.02em] text-slate-700">
          Monitoring your home <span className="font-black text-amber-500">24/7</span> for overload,
          draw, and efficiency drift.
        </p>
      </div>

      <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.15rem] bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 py-2.5 text-[0.74rem] font-black tracking-[-0.02em] text-white shadow-[0_10px_20px_rgba(245,158,11,0.2)]">
        <ElectricIcon name="bolt" className="h-4 w-4 fill-white stroke-white" />
        Run System Check
      </button>
    </SectionCard>
  );
}

function QuickActions() {
  return (
    <section className="mt-3">
      <h2 className="flex items-center gap-1 px-1 text-[0.86rem] font-black tracking-[-0.04em]">
        <ElectricIcon name="bolt" className="h-4 w-4 fill-amber-400 stroke-amber-400 text-amber-400" />
        Quick Actions
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <QuickAction icon="leaf" title="Power Saver" subtitle="Reduce usage" color="blue" />
        <QuickAction icon="power" title="Device Control" subtitle="Manage devices" color="green" />
        <QuickAction icon="chart" title="Usage History" subtitle="View trends" color="purple" />
      </div>
    </section>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: "leaf" | "power" | "chart";
  title: string;
  subtitle: string;
  color: "blue" | "green" | "purple";
}) {
  const styles = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    purple: "bg-violet-500",
  };

  return (
    <article className="rounded-2xl bg-white p-2.5 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${styles[color]}`}>
        <ElectricIcon name={icon} className="h-4 w-4" />
      </span>
      <p className="mt-2 text-[0.62rem] font-black tracking-[-0.04em]">{title}</p>
      <p className="text-[0.52rem] font-semibold text-slate-500">{subtitle}</p>
    </article>
  );
}

function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.45rem] bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.07)] ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ children, icon }: { children: ReactNode; icon: "devices" }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <ElectricIcon name={icon} className="h-4 w-4" />
      </span>
      <h2 className="text-[0.9rem] font-black tracking-[-0.05em]">{children}</h2>
    </div>
  );
}

function ElectricIcon({ name, className }: { name: string; className: string }) {
  const paths: Record<string, string> = {
    bolt: "M13 2 4 14h7l-1 8 10-13h-7l1-7Z",
    target: "M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Zm0-4a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0-8v3l2-2",
    coin: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0 4v10m3-7c0-1.2-1.1-2-3-2s-3 .8-3 2 1.1 2 3 2 3 .8 3 2-1.1 2-3 2-3-.8-3-2",
    calendar: "M5 4h14v16H5V4Zm0 5h14M8 2v4m8-4v4",
    devices: "M6 4h12v16H6V4Zm3 3h6M9 17h6",
    device: "M8 4h8v16H8V4Zm3 3h2m-2 10h2",
    alert: "M12 4 3 20h18L12 4Zm0 5v5m0 3h.01",
    shield: "M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Zm1 4-4 6h4l-2 4 5-7h-4l1-3Z",
    leaf: "M20 4C10 4 5 9 5 19c7 0 12-5 15-15ZM5 19c3-5 7-8 12-10",
    power: "M12 2v10m5.7-5.7a8 8 0 1 1-11.4 0",
    chart: "M5 19V9m7 10V5m7 14v-7",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4 11a2 2 0 0 1-4 0",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1",
    check: "m5 12 4 4L19 6",
    homeBolt: "M3 11 12 4l9 7v9h-6v-5H9v5H3v-9Zm10-1-3 5h3l-1 4 4-6h-3l1-3Z",
    scan: "M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3m13 5h3a2 2 0 0 0 2-2v-3M7 12h10",
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function AssetImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}
