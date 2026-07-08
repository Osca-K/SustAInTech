"use client";

import { use, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import {
  getElectricityDeviceStatus,
  readResidentCustomElectricityDevices,
  ResidentCustomElectricityDevice,
  writeResidentCustomElectricityDevices,
} from "@/lib/residentElectricityDeviceState";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const electricityAssetBase = "/assets/resident/electricity";

const categories = [
  { label: "Cooling", value: 35, color: "#5d8ff4" },
  { label: "Lighting", value: 22, color: "#f3bd55" },
  { label: "Kitchen", value: 18, color: "#82d8a8" },
  { label: "Laundry", value: 12, color: "#8b55ee" },
  { label: "Other", value: 13, color: "#aaa0f2" },
];

type EnergyRecommendation = {
  id: string;
  deviceId?: string;
  deviceName?: string;
  title: string;
  shortDescription: string;
  estimatedSaving?: string;
  confidence: "High" | "Medium" | "Low";
  actionType: "viewDevice" | "editSchedule" | "askAI" | "trackSavings";
  icon: string;
  suggestedSchedule?: string;
};

const energyRecommendations: EnergyRecommendation[] = [
  {
    id: "water-heater-smart-runtime",
    deviceId: "water-heater",
    deviceName: "Water Heater",
    title: "Schedule water heater for smarter runtime",
    shortDescription: "Run between 23:00-06:00 to reduce unnecessary peak-time usage.",
    estimatedSaving: "R8.40/month",
    confidence: "High",
    actionType: "editSchedule",
    suggestedSchedule: "23:00-06:00",
    icon: `${electricityAssetBase}/appliances/water-heater.png`,
  },
  {
    id: "washing-machine-eco-load",
    deviceId: "washing-machine",
    deviceName: "Washing Machine",
    title: "Use full-load eco wash",
    shortDescription: "Eco mode and full loads can reduce laundry energy use.",
    estimatedSaving: "R12.60/month",
    confidence: "Medium",
    actionType: "viewDevice",
    icon: `${electricityAssetBase}/appliances/washing-machine.png`,
  },
  {
    id: "air-conditioner-evening-peak",
    deviceId: "air-conditioner",
    deviceName: "Air Conditioner",
    title: "Reduce evening cooling peak",
    shortDescription: "Cooling is driving higher usage between 18:00-21:00.",
    estimatedSaving: "R24.00/month",
    confidence: "Medium",
    actionType: "viewDevice",
    icon: `${electricityAssetBase}/appliances/air-conditioner.png`,
  },
  {
    id: "fridge-runtime-check",
    deviceId: "fridge",
    deviceName: "Fridge",
    title: "Check fridge runtime",
    shortDescription: "Your fridge appears to be running longer than usual.",
    confidence: "Low",
    actionType: "viewDevice",
    icon: `${electricityAssetBase}/appliances/fridge.png`,
  },
  {
    id: "budget-usage-balance",
    title: "Balance high-load evenings",
    shortDescription: "Spread heavy appliance use to keep your estimated bill steadier.",
    estimatedSaving: "R18.00/month",
    confidence: "Medium",
    actionType: "askAI",
    icon: `${electricityAssetBase}/energy-save-assistant-icon.png`,
  },
];

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);
  const [managedDevices, setManagedDevices] = useState<ResidentCustomElectricityDevice[]>([]);
  const [usageMode, setUsageMode] = useState<UsageMode>("daily");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setManagedDevices(readResidentCustomElectricityDevices(householdId));
    });

    const refresh = () => setManagedDevices(readResidentCustomElectricityDevices(householdId));
    window.addEventListener("focus", refresh);
    window.addEventListener("resident-electricity-devices-updated", refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("resident-electricity-devices-updated", refresh);
    };
  }, [householdId]);

  const toggleDevice = (device: ResidentCustomElectricityDevice) => {
    const next = managedDevices.map((item) =>
      item.id === device.id ? { ...item, isOn: !item.isOn } : item,
    );
    setManagedDevices(next);
    writeResidentCustomElectricityDevices(householdId, next);
  };

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen bg-[#f5f8ff] px-4 pb-8 pt-4 font-sans text-[#0b1744]">
        <ElectricityHeader />
        <BudgetUsageCard />
        <ElectricitySummaryStrip />
        <QuickActions />
        <RecentTrendCard mode={usageMode} onModeChange={setUsageMode} />
        <DevicesCard
          householdId={householdId}
          devices={managedDevices}
          onToggleDevice={toggleDevice}
        />
        <CategoryCard />
        <EnergySaveAssistantCard householdId={householdId} />
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
      </div>
    </header>
  );
}

function BudgetUsageCard() {
  return (
    <section className="relative overflow-hidden rounded-[1.55rem] border border-white/85 bg-white/90 px-4 py-4 shadow-[0_16px_36px_rgba(30,64,175,0.09)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-[#61dce0]/18 blur-2xl" />
      <div className="pointer-events-none absolute -right-14 -bottom-20 h-44 w-44 rounded-full bg-[#7a6bf4]/12 blur-2xl" />

      <div className="relative">
        <div className="grid grid-cols-[1.08fr_1fr_0.95fr] items-stretch gap-0">
          <BudgetMetric
            label="Monthly Budget"
            value="R1,400"
            detail={
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#dbe6ff] bg-white/82 px-2.5 text-[0.64rem] font-bold text-[#3c78ff] shadow-[0_8px_18px_rgba(30,64,175,0.08)]"
              >
                <ElectricIcon name="edit" className="h-3 w-3" />
                Edit Budget
              </button>
            }
            primary
          />
          <BudgetMetric label="Used This Month" value="R892.40" detail="63% of budget" />
          <BudgetMetric label="Estimated Bill" value="R1,260" detail="by 31 May 2025" />
        </div>

        <div className="mt-4">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-[#edf2fb] shadow-[inset_0_1px_3px_rgba(30,64,175,0.08)]">
            <span className="block h-full w-[63%] rounded-full bg-gradient-to-r from-[#47d7dc] to-[#6978f7] shadow-[0_5px_16px_rgba(71,215,220,0.32)]" />
            <span className="absolute left-[63%] top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-[0_5px_14px_rgba(73,91,160,0.18)]" />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <p className="whitespace-nowrap text-[0.72rem] font-semibold tracking-[-0.01em] text-[#5f6c86]">
              <span className="text-[1.15rem] font-extrabold tracking-[-0.05em] text-[#39c8cf]">
                63%
              </span>{" "}
              used
            </p>
            <p className="min-w-0 text-right text-[0.68rem] font-semibold leading-4 tracking-[-0.01em] text-[#5f6c86]">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#52c978] shadow-[0_0_10px_rgba(82,201,120,0.45)]" />
              You&apos;re <span className="text-[#5f58d8]">on track</span> to stay under budget.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BudgetMetric({
  label,
  value,
  detail,
  primary = false,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  primary?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-between px-2.5 ${primary ? "pl-0" : "border-l border-[#e6ebf5]"}`}>
      <p className="text-[0.64rem] font-semibold leading-4 tracking-[-0.01em] text-[#5e6984]">
        {label}
      </p>
      <p
        className={`mt-1.5 whitespace-nowrap font-extrabold leading-none tracking-[-0.052em] text-[#07184a] ${
          primary ? "text-[1.28rem]" : "text-[1.28rem]"
        }`}
      >
        {value}
      </p>
      <div className="mt-2.5 text-[0.64rem] font-medium leading-4 tracking-[-0.01em] text-[#67738d]">
        {detail}
      </div>
    </div>
  );
}

function ElectricitySummaryStrip() {
  const projectedSupplyDays = 18;
  const depletionTone =
    projectedSupplyDays <= 3 ? "critical" : projectedSupplyDays < 10 ? "warning" : "comfortable";
  const depletionMetric = {
    label: "Depletes In",
    value: `${projectedSupplyDays} days`,
    detail: "Usage-based",
    tone: depletionTone,
  };
  const items = [
    { label: "Today Usage", value: "18.7 kWh", detail: "R28.65" },
    { label: "Current Load", value: "2.34 kW", detail: "Moderate", accent: true },
    { label: "Devices On", value: "7", detail: "of 12" },
    depletionMetric,
  ];

  return (
    <section className="mt-3.5 grid grid-cols-2 overflow-hidden rounded-[1.35rem] border border-white/90 bg-white/84 shadow-[0_12px_28px_rgba(30,64,175,0.07)] backdrop-blur-xl min-[390px]:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-h-[4.25rem] border-[#e7ecf7] px-2.5 py-2.5 text-center ${
            index % 2 === 1 ? "border-l" : ""
          } ${index > 0 ? "min-[390px]:border-l" : ""} ${
            index > 1 ? "border-t min-[390px]:border-t-0" : ""
          }`}
        >
          <p className="text-[0.62rem] font-semibold leading-4 tracking-[-0.01em] text-[#59657e]">
            {item.label}
          </p>
          <p
            className={`mt-1.5 text-[0.95rem] font-extrabold leading-[1.05] tracking-[-0.04em] ${
              "tone" in item && item.tone === "critical"
                ? "text-[#dc2626]"
                : "tone" in item && item.tone === "warning"
                  ? "text-[#d97706]"
                  : "text-[#07184a]"
            }`}
          >
            {item.value}
          </p>
          <p
            className={`mt-1.5 text-[0.64rem] font-semibold leading-none tracking-[-0.01em] ${
              "tone" in item && item.tone === "critical"
                ? "text-[#b91c1c]"
                : "tone" in item && item.tone === "warning"
                  ? "text-[#b45309]"
                  : "tone" in item && item.tone === "comfortable"
                    ? "text-[#4cae77]"
                : "accent" in item && item.accent
                  ? "text-[#5e59d8]"
                  : "text-[#64708b]"
            }`}
          >
            {item.detail}
          </p>
        </div>
      ))}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: "AI Tips", icon: "sparkles" },
    { label: "Set Target", icon: "target" },
    { label: "Scan Meter", icon: "scan" },
    { label: "Set Budget", icon: "wallet" },
  ];

  return (
    <section className="mt-3.5 overflow-hidden rounded-[1.35rem] border border-white/90 bg-white/82 p-1.5 shadow-[0_12px_28px_rgba(30,64,175,0.08)] backdrop-blur-xl">
      <div className="grid grid-cols-4 divide-x divide-[#e8edf8] overflow-hidden rounded-[1.05rem] bg-white/42">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="flex h-[3.75rem] flex-col items-center justify-center gap-1.5 px-1 text-center text-[0.63rem] font-extrabold leading-3 tracking-[-0.01em] text-[#273354] transition-colors hover:bg-white/70"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#edf6ff] to-[#f4f9ff] text-[#2f7df6] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_rgba(47,125,246,0.12)] ring-1 ring-[#dbeafe]/80"
            >
              <ElectricIcon name={action.icon} className="h-3.5 w-3.5 stroke-[1.9]" />
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

type UsageMode = "daily" | "weekly" | "monthly";

const usageModes: UsageMode[] = ["daily", "weekly", "monthly"];

const usageChartData: Record<
  UsageMode,
  {
    labels: string[];
    ticks: number[];
    areaPath: string;
    linePath: string;
    stats: { total: string; peak: string; average: string; cost: string };
  }
> = {
  daily: {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
    ticks: [3, 2, 1, 0],
    areaPath:
      "M42 178 C64 172 74 176 92 170 C118 160 122 124 146 132 C165 138 171 112 192 118 C214 124 222 52 244 46 C267 40 269 122 292 132 C315 142 320 162 342 158 L342 204 L42 204 Z",
    linePath:
      "M42 178 C64 172 74 176 92 170 C118 160 122 124 146 132 C165 138 171 112 192 118 C214 124 222 52 244 46 C267 40 269 122 292 132 C315 142 320 162 342 158",
    stats: { total: "18.7", peak: "2.68", average: "0.78", cost: "R28.65" },
  },
  weekly: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ticks: [26, 18, 10, 0],
    areaPath:
      "M42 168 C74 148 88 144 108 152 C132 162 147 94 174 100 C202 106 214 68 238 78 C264 88 274 122 300 112 C322 104 334 116 342 108 L342 204 L42 204 Z",
    linePath:
      "M42 168 C74 148 88 144 108 152 C132 162 147 94 174 100 C202 106 214 68 238 78 C264 88 274 122 300 112 C322 104 334 116 342 108",
    stats: { total: "126", peak: "24.4", average: "18.0", cost: "R193" },
  },
  monthly: {
    labels: ["W1", "W2", "W3", "W4"],
    ticks: [140, 95, 50, 0],
    areaPath:
      "M42 156 C88 136 112 146 146 122 C178 100 205 108 230 92 C262 72 300 86 342 68 L342 204 L42 204 Z",
    linePath:
      "M42 156 C88 136 112 146 146 122 C178 100 205 108 230 92 C262 72 300 86 342 68",
    stats: { total: "492", peak: "134", average: "16.4", cost: "R754" },
  },
};

function RecentTrendCard({
  mode,
  onModeChange,
}: {
  mode: UsageMode;
  onModeChange: (mode: UsageMode) => void;
}) {
  const chart = usageChartData[mode];

  return (
    <section
      className="relative mt-5 overflow-hidden rounded-[1.75rem] border border-white/90 bg-[linear-gradient(145deg,#ffffff,#f5f7ff_60%,#f2faff)] p-4 shadow-[0_16px_40px_rgba(79,70,190,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="pointer-events-none absolute right-0 top-0 z-0 h-[11.5rem] w-[66%] overflow-hidden opacity-70">
        <AssetImage
          src={`${electricityAssetBase}/Energy-Usage-Background%20on%20top.png`}
          alt=""
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[12.75rem] bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.88)_39%,rgba(255,255,255,0.16)_76%,rgba(255,255,255,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[8.5rem] z-0 h-20 bg-gradient-to-b from-transparent to-[#f7f7ff]" />

      <div className="relative z-10">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h2 className="whitespace-nowrap text-[1.22rem] font-extrabold leading-tight tracking-[-0.035em] text-[#07184a]">
              Electricity Usage
            </h2>
            <p className="mt-1 whitespace-nowrap text-[0.74rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
              Your electricity usage overview
            </p>
          </div>

          <div className="grid h-9 w-full grid-cols-3 rounded-full bg-white/60 p-1 text-center text-[0.68rem] font-semibold text-[#5e6984] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_8px_20px_rgba(79,70,190,0.07)] backdrop-blur-md">
            {usageModes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onModeChange(item)}
                className={`flex items-center justify-center rounded-full capitalize transition ${
                  item === mode
                    ? "bg-white text-[#2f7df6] shadow-[0_6px_16px_rgba(47,125,246,0.13)]"
                    : "text-[#5e6984]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-3.5 h-[15rem] overflow-hidden rounded-[1.5rem] border border-white/90 bg-white/84 p-[1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_26px_rgba(79,70,190,0.08)] backdrop-blur-md">
          <svg className="h-full w-full" viewBox="0 0 360 238" role="img" aria-label="Electricity usage trend chart">
            <defs>
              <linearGradient id="electricityTrendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f7df6" stopOpacity="0.26" />
                <stop offset="58%" stopColor="#4aa8ff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="electricityTrendStroke" x1="42" x2="348" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1d6ff2" />
                <stop offset="100%" stopColor="#38a8ff" />
              </linearGradient>
            </defs>
            {[34, 68, 102, 136, 170].map((y) => (
              <line key={y} x1="34" x2="348" y1={y} y2={y} stroke="#e7eaf7" strokeDasharray="3 4" strokeWidth="1" />
            ))}
            <text x="4" y="18" fill="#7a86a3" fontSize="10" fontWeight="600">kWh</text>
            {chart.ticks.map((tick, index) => (
              <text key={tick} x="6" y={72 + index * 44} fill="#9aa6bf" fontSize="10" textAnchor="start">
                {tick}
              </text>
            ))}
            <path
              d={chart.areaPath}
              fill="url(#electricityTrendArea)"
            />
            <path
              d={chart.linePath}
              fill="none"
              stroke="url(#electricityTrendStroke)"
              strokeLinecap="round"
              strokeWidth="3.5"
            />
            {chart.labels.map((label, index) => (
              <text
                key={label}
                x={chart.labels.length === 4 ? 54 + index * 92 : 42 + index * 50}
                y="228"
                fill="#7a86a3"
                fontSize="10"
                textAnchor="middle"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>

        <div className="mt-3.5 grid grid-cols-4 divide-x divide-[#e7ecf7] rounded-[1.15rem] border border-white/90 bg-white/64 px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_9px_22px_rgba(79,70,190,0.06)]">
          <TrendStat label="Total" value={chart.stats.total} unit="kWh" />
          <TrendStat label="Peak" value={chart.stats.peak} unit={mode === "daily" ? "kW" : "kWh"} />
          <TrendStat label="Average" value={chart.stats.average} unit={mode === "daily" ? "kW" : "kWh"} />
          <TrendStat label="Cost" value={chart.stats.cost} />
        </div>
      </div>
    </section>
  );
}

function TrendStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <article className="min-w-0 px-1">
      <p className="text-[0.61rem] font-semibold leading-none tracking-[-0.01em] text-[#7a86a3]">
        {label}
      </p>
      <p className="mt-2 flex min-w-0 items-baseline justify-center gap-0.5 whitespace-nowrap font-extrabold leading-none tracking-[-0.04em] text-[#07184a]">
        <span className="text-[1rem]">{value}</span>
        {unit ? (
          <span className="text-[0.58rem] font-bold tracking-normal text-[#626f8a]">{unit}</span>
        ) : null}
      </p>
    </article>
  );
}

function DevicesCard({
  householdId,
  devices,
  onToggleDevice,
}: {
  householdId: string;
  devices: ResidentCustomElectricityDevice[];
  onToggleDevice: (device: ResidentCustomElectricityDevice) => void;
}) {
  const statuses = devices.map((device) => getElectricityDeviceStatus(device));
  const summary = {
    devices: statuses.length,
    active: statuses.filter((status) => status === "Active").length,
    scheduled: statuses.filter((status) => status === "Scheduled").length,
    offline: statuses.filter((status) => status === "Off" || status === "Offline").length,
  };

  return (
    <section
      id="devices"
      className="mt-5 rounded-[2rem] border border-[rgba(220,230,255,0.7)] bg-[linear-gradient(145deg,#ffffff,#f6f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="text-center">
        <h2 className="text-[1.45rem] font-extrabold leading-none tracking-[-0.045em] text-[#07184a]">
          Your Devices
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 rounded-[1.45rem] bg-white/78 p-2 shadow-[0_12px_30px_rgba(30,64,175,0.08)] ring-1 ring-slate-100/80">
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Total%20Devices.png`} label="Devices" value={String(summary.devices)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Active.png`} label="Active" value={String(summary.active)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Schedule.png`} label="Schedule" value={String(summary.scheduled)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Ofline.png`} label="Offline" value={String(summary.offline)} />
      </div>

      <div className="mt-5 space-y-3">
        {devices.map((device) => {
          const status = getElectricityDeviceStatus(device);
          return (
            <article key={device.id} className="flex min-h-[5.2rem] items-center gap-2.5 rounded-[1.45rem] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,64,175,0.07)] ring-1 ring-slate-100/80">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-white bg-white/90 shadow-[0_7px_16px_rgba(75,102,170,0.10)]">
                <AssetImage src={`${electricityAssetBase}/appliances/${device.icon}`} alt="" className="h-[52px] w-[52px] rounded-[16px] object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-bold text-[#07184a]">{device.name}</p>
                <p className="mt-1 text-[0.72rem] font-medium text-[#7a86a3]">{device.category}</p>
              </div>
              <DeviceStatusDot state={status} />
              <Link href={`/household/${householdId}/electricity/devices?edit=${device.id}&return=main`} aria-label={`Edit ${device.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3c78ff] shadow-sm ring-1 ring-slate-100"><ElectricIcon name="edit" className="h-4 w-4" /></Link>
              <button type="button" role="switch" aria-checked={device.isOn} onClick={() => onToggleDevice(device)} className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${device.isOn ? "bg-gradient-to-r from-[#557dff] to-[#3362f5]" : "bg-[#dce3f2]"}`}><span className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${device.isOn ? "translate-x-5" : ""}`} /></button>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href={`/household/${householdId}/electricity/devices?return=main`} className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-[#6b8cff] to-[#3d63f3] px-3 text-[0.78rem] font-bold text-white shadow-[0_10px_22px_rgba(61,99,243,0.22)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <ElectricIcon name="plus" className="h-4 w-4" />
          </span>
          Add New Device
        </Link>
        <Link href={`/household/${householdId}/electricity/devices?view=all`} className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3 text-[0.76rem] font-bold text-[#316bff] shadow-[0_8px_20px_rgba(30,64,175,0.08)] ring-1 ring-slate-100">
          <ElectricIcon name="grid" className="h-4 w-4" />
          View All Devices
          <ElectricIcon name="chevronRight" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function DeviceSummaryCard({
  iconSrc,
  label,
  value,
}: {
  iconSrc: string;
  label: string;
  value: string;
}) {
  return (
    <article className="flex min-h-[5.6rem] flex-col items-center justify-between rounded-[1rem] bg-white px-1.5 py-2.5 text-center shadow-[0_8px_18px_rgba(30,64,175,0.06)] ring-1 ring-slate-100/90">
      <p className="text-[0.7rem] font-semibold leading-none text-[#415071]">{label}</p>
      <AssetImage src={iconSrc} alt="" className="h-7 w-7 object-contain" />
      <p className="text-[1.55rem] font-extrabold leading-none tracking-[-0.05em] text-[#07184a]">{value}</p>
    </article>
  );
}

function DeviceStatusDot({ state }: { state: string }) {
  const statusAssets: Record<string, string> = {
    Active: `${electricityAssetBase}/Active.png`,
    Scheduled: `${electricityAssetBase}/Schedule.png`,
    Offline: `${electricityAssetBase}/Ofline.png`,
    Off: `${electricityAssetBase}/Ofline.png`,
  };

  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      <AssetImage src={statusAssets[state]} alt="" className="h-3.5 w-3.5 object-contain" />
    </span>
  );
}

function CategoryCard() {
  return (
    <section
      className="mt-5 overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#f7f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div>
        <h2 className="text-[1.18rem] font-extrabold leading-tight tracking-[-0.035em] text-[#07184a]">
          Electricity Usage by Category
        </h2>
        <p className="mt-1.5 text-[0.82rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
          Live breakdown of your energy use
        </p>
      </div>

      <div className="mt-5 grid grid-cols-[9.8rem_1fr] items-center gap-4">
        <SegmentedUsageDonut />

        <div className="space-y-2.5">
          {categories.map((item) => (
            <div
              key={item.label}
              className="flex min-h-[2.45rem] items-center justify-between gap-2 rounded-full bg-white/88 px-3 py-2 shadow-[0_9px_20px_rgba(30,64,175,0.06)] ring-1 ring-white/90"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_12px_rgba(120,140,220,0.18)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-[0.76rem] font-semibold tracking-[-0.02em] text-[#263153]">
                  {item.label}
                </span>
              </span>
              <span className="text-[0.82rem] font-extrabold tracking-[-0.03em] text-[#07184a]">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SegmentedUsageDonut() {
  const radius = 56;
  const strokeWidth = 19;
  const circumference = 2 * Math.PI * radius;
  const gap = 3.8;
  const segments = categories.map((item, index) => {
    const previousTotal = categories
      .slice(0, index)
      .reduce((total, category) => total + category.value, 0);

    return {
      ...item,
      dashOffset: -((previousTotal / 100) * circumference),
      length: (item.value / 100) * circumference - gap,
    };
  });

  return (
    <div className="relative flex h-[9.8rem] w-[9.8rem] items-center justify-center rounded-full bg-[radial-gradient(circle,#ffffff_43%,rgba(236,242,255,0.8)_58%,rgba(255,255,255,0)_69%)] shadow-[0_18px_38px_rgba(80,112,190,0.12)]">
      <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.95),rgba(240,245,255,0.45)_54%,rgba(255,255,255,0)_70%)] blur-[1px]" />
      <svg className="relative h-full w-full -rotate-90 overflow-visible" viewBox="0 0 160 160" aria-hidden="true">
        <defs>
          <filter id="categoryDonutGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth={strokeWidth + 5}
        />
        {segments.map((item) => (
          <circle
            key={item.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeDasharray={`${Math.max(item.length, 0)} ${circumference}`}
            strokeDashoffset={item.dashOffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            filter="url(#categoryDonutGlow)"
          />
        ))}
      </svg>
      <div className="absolute inset-[2.85rem] rounded-full bg-white shadow-[inset_0_6px_16px_rgba(80,112,190,0.08),0_8px_18px_rgba(80,112,190,0.08)]" />
      <div className="absolute text-center">
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.07em] text-[#07184a]">18.4</p>
        <p className="mt-1 text-[0.78rem] font-medium tracking-[-0.02em] text-[#8a97b5]">kWh</p>
      </div>
    </div>
  );
}

function EnergySaveAssistantCard({ householdId }: { householdId: string }) {
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [activeRecommendation, setActiveRecommendation] = useState(0);
  const assistantHref = `/household/${householdId}/electricity/assistant`;
  const promptChips = [
    { label: "How can I save today?", icon: "leaf" },
    { label: "Best time to run appliances", icon: "clock" },
    { label: "Why is my usage high?", icon: "trend" },
    { label: "Optimize my settings", icon: "settings" },
  ];

  const openAssistant = (value?: string) => {
    const query = value?.trim() ? `?prompt=${encodeURIComponent(value.trim())}` : "";
    router.push(`${assistantHref}${query}`);
  };

  const handleSend = () => {
    if (prompt.trim()) {
      openAssistant(prompt);
      return;
    }
    openAssistant();
  };

  const handleMic = () => {
    if (listening) {
      setListening(false);
      setPrompt("How can I reduce my bill this month?");
      return;
    }
    setListening(true);
  };

  const handleCarouselScroll = () => {
    const element = carouselRef.current;
    if (!element) return;
    const cardWidth = element.clientWidth;
    if (!cardWidth) return;
    setActiveRecommendation(Math.round(element.scrollLeft / cardWidth));
  };

  return (
    <section
      className="mt-5 overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#f8fbff_58%,#f4f7ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] bg-white shadow-[0_10px_24px_rgba(47,125,246,0.12)] ring-1 ring-blue-100/80">
          <AssetImage
            src={`${electricityAssetBase}/energy-save-assistant-icon.png`}
            alt=""
            className="h-10 w-10 object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.2rem] font-extrabold leading-tight tracking-[-0.04em] text-[#07184a]">
            Energy Save Assistant
          </h2>
          <p className="mt-1 text-[0.76rem] font-medium leading-4 tracking-[-0.01em] text-[#7a86a3]">
            Get smart electricity recommendations and ask AI.
          </p>
        </div>
        <span className="text-[#a6b7ff]">
          <ElectricIcon name="sparkles" className="h-5 w-5" />
        </span>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {energyRecommendations.map((recommendation, index) => (
          <Link
            key={recommendation.id}
            href={`${assistantHref}/recommendations/${recommendation.id}`}
            className="grid min-w-full snap-center grid-cols-[4.35rem_1fr_2.25rem] items-center gap-3 rounded-[1.45rem] border border-[#e4ebff] bg-[linear-gradient(145deg,#ffffff,#f7f9ff)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_28px_rgba(30,64,175,0.07)]"
            aria-label={`Open recommendation ${index + 1}: ${recommendation.title}`}
          >
            <span className="flex h-[4.35rem] w-[4.35rem] items-center justify-center overflow-hidden rounded-[1.15rem] bg-white shadow-[0_10px_22px_rgba(47,125,246,0.10)] ring-1 ring-blue-50">
              <AssetImage src={recommendation.icon} alt="" className="h-16 w-16 object-cover" />
            </span>
            <span className="min-w-0">
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#f2efff] px-2.5 py-1 text-[0.6rem] font-bold text-[#6b61df]">
                <ElectricIcon name="sparkles" className="h-3 w-3 shrink-0" />
                <span className="truncate">{index === 0 ? "Top Recommendation" : "Device Recommendation"}</span>
              </span>
              <span className="mt-2 line-clamp-2 block text-[0.88rem] font-extrabold leading-5 tracking-[-0.025em] text-[#07184a]">
                {recommendation.title}
              </span>
              <span className="mt-1 line-clamp-2 block text-[0.7rem] font-medium leading-4 text-[#6f7c99]">
                {recommendation.shortDescription}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                {recommendation.estimatedSaving ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white/80 px-2 py-1 text-[0.58rem] font-bold text-[#2f7df6]">
                    <ElectricIcon name="clock" className="h-3 w-3" />
                    {recommendation.estimatedSaving}
                  </span>
                ) : null}
                <span className="inline-flex rounded-full bg-[#eef6ff] px-2 py-1 text-[0.58rem] font-bold text-[#4772c8]">
                  {recommendation.confidence}
                </span>
              </span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.10)]">
              <ElectricIcon name="chevronRight" className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {energyRecommendations.map((recommendation, index) => (
          <button
            key={recommendation.id}
            type="button"
            aria-label={`Show recommendation ${index + 1}`}
            onClick={() => {
              carouselRef.current?.scrollTo({
                left: (carouselRef.current?.clientWidth ?? 0) * index,
                behavior: "smooth",
              });
              setActiveRecommendation(index);
            }}
            className={`h-1.5 rounded-full transition-all ${
              activeRecommendation === index ? "w-5 bg-[#2f7df6]" : "w-1.5 bg-[#cfd9ef]"
            }`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/90 bg-white/86 p-1.5 shadow-[0_12px_28px_rgba(30,64,175,0.08)]">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          placeholder={listening ? "Listening... Tap mic to stop" : "Ask anything about your electricity usage..."}
          className="min-w-0 flex-1 bg-transparent px-3 text-[0.76rem] font-medium text-[#07184a] outline-none placeholder:text-[#9aa6bf]"
        />
        <button
          type="button"
          onClick={handleMic}
          aria-label={listening ? "Stop listening" : "Start voice input"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.10)] ${listening ? "ring-2 ring-blue-200" : ""}`}
        >
          <ElectricIcon name="mic" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleSend}
          aria-label="Send prompt"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8cff] to-[#4b5ff2] text-white shadow-[0_10px_22px_rgba(47,125,246,0.24)]"
        >
          <ElectricIcon name="send" className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {promptChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => openAssistant(chip.label)}
            className="flex min-h-12 items-center gap-2 rounded-[1rem] border border-white/90 bg-white/72 px-3 text-left text-[0.68rem] font-bold leading-4 text-[#52617e] shadow-[0_8px_18px_rgba(30,64,175,0.06)]"
          >
            <ElectricIcon name={chip.icon} className="h-4 w-4 shrink-0 text-[#2f7df6]" />
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[1rem] bg-[#f3f5ff] px-3 py-2.5 text-[0.7rem] font-semibold text-[#687493]">
        <span className="inline-flex min-w-0 items-center gap-2">
          <ElectricIcon name="sparkles" className="h-4 w-4 shrink-0 text-[#7767f2]" />
          <span className="truncate">AI tip: Small changes in timing can help reduce high-load periods.</span>
        </span>
        <Link href={assistantHref} className="ml-2 shrink-0 text-[#2f7df6]">
          Learn more
        </Link>
      </div>

      <button
        type="button"
        onClick={() => openAssistant()}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-gradient-to-r from-[#4f8cff] to-[#4b5ff2] text-[0.92rem] font-extrabold tracking-[-0.02em] text-white shadow-[0_14px_30px_rgba(47,125,246,0.24)]"
      >
        <ElectricIcon name="sparkles" className="h-4 w-4" />
        Ask AI Assistant
      </button>

      {listening ? (
        <p className="mt-2 text-center text-[0.68rem] font-semibold text-[#2f7df6]">
          Listening... Tap to stop
        </p>
      ) : null}
    </section>
  );
}

function ElectricIcon({ name, className }: { name: string; className: string }) {
  const paths: Record<string, string> = {
    bolt: "M13 2 4 14h7l-1 8 10-13h-7l1-7Z",
    target: "M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Zm0-4a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0-8v3l2-2",
    coin: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0 4v10m3-7c0-1.2-1.1-2-3-2s-3 .8-3 2 1.1 2 3 2 3 .8 3 2-1.1 2-3 2-3-.8-3-2",
    dollar: "M12 3v18m4-13c0-1.7-1.7-3-4-3s-4 1.3-4 3 1.7 3 4 3 4 1.3 4 3-1.7 3-4 3-4-1.3-4-3",
    calendar: "M5 4h14v16H5V4Zm0 5h14M8 2v4m8-4v4",
    wallet: "M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3M16 13h5",
    sparkles: "M12 3l1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm14 1 .8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
    leaf: "M11 20A7 7 0 0 1 4 13c0-5 4-9 12-9h4v4c0 8-4 12-9 12Zm0 0c0-4 2-7 6-9",
    clock: "M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Zm0-14v5l3 2",
    trend: "M4 17 10 11l4 4 6-8M14 7h6v6",
    bot: "M12 8V5m-5 5h10a3 3 0 0 1 3 3v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a3 3 0 0 1 3-3Zm2 5h.01M10 15h.01",
    mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm7 9a7 7 0 0 1-14 0m7 7v3m-4 0h8",
    send: "m22 2-7 20-4-9-9-4 20-7Zm-11 11 11-11",
    plug: "M9 2v6m6-6v6M7 8h10v4a5 5 0 0 1-10 0V8Zm5 9v5",
    activeDot: "M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0",
    shieldCheck: "M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-5",
    devices: "M6 4h12v16H6V4Zm3 3h6M9 17h6",
    device: "M8 4h8v16H8V4Zm3 3h2m-2 10h2",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4 11a2 2 0 0 1-4 0",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1",
    check: "m5 12 4 4L19 6",
    scan: "M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3m13 5h3a2 2 0 0 0 2-2v-3M7 12h10",
    meter: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h4m-4 10h4",
    ac: "M5 6h14v7H5V6Zm3 10v2m4-2v2m4-2v2M8 10h8",
    fridge: "M8 3h8a2 2 0 0 1 2 2v16H6V5a2 2 0 0 1 2-2Zm-2 9h12m-3-5v2m0 6v2",
    washer: "M7 3h10a2 2 0 0 1 2 2v16H5V5a2 2 0 0 1 2-2Zm3 4h4m-2 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    heater: "M9 3h6a2 2 0 0 1 2 2v12a5 5 0 0 1-10 0V5a2 2 0 0 1 2-2Zm3 4v7m-2 5h4",
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm11-13 2 2",
    plus: "M12 5v14M5 12h14",
    chevronRight: "m9 18 6-6-6-6",
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
