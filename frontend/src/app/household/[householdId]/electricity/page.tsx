"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import {
  getElectricityDeviceStatus,
  readResidentCustomElectricityDevices,
  readResidentElectricityDeviceState,
  ResidentCustomElectricityDevice,
  writeResidentCustomElectricityDevices,
  writeResidentElectricityDeviceState,
} from "@/lib/residentElectricityDeviceState";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const electricityAssetBase = "/assets/resident/electricity";

type ElectricityDevice = {
  name: string;
  room: string;
  state: string;
  iconSrc: string;
  enabled: boolean;
  storageKey?: "washingMachine" | "dishwasher";
};

const devices: ElectricityDevice[] = [
  { name: "Smart Meter", room: "Main Line", state: "Active", iconSrc: `${electricityAssetBase}/Smater%20Meter.png`, enabled: true },
  { name: "Air Conditioner", room: "Living Room", state: "Active", iconSrc: `${electricityAssetBase}/Air%20Conditioner.png`, enabled: true },
  { name: "Fridge", room: "Kitchen", state: "Active", iconSrc: `${electricityAssetBase}/Fridge.png`, enabled: true },
  { name: "Washing Machine", room: "Laundry Room", state: "Offline", iconSrc: `${electricityAssetBase}/Washing%20Machine.png`, enabled: false, storageKey: "washingMachine" },
  { name: "Water Heater", room: "Bathroom", state: "Scheduled", iconSrc: `${electricityAssetBase}/Water%20Heater.png`, enabled: true },
];

const categories = [
  { label: "Cooling", value: 35, color: "#5d8ff4" },
  { label: "Lighting", value: 22, color: "#f3bd55" },
  { label: "Kitchen", value: 18, color: "#82d8a8" },
  { label: "Laundry", value: 12, color: "#8b55ee" },
  { label: "Other", value: 13, color: "#aaa0f2" },
];

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);
  const [deviceStates, setDeviceStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(devices.map((device) => [device.name, device.enabled])),
  );
  const [customDevices, setCustomDevices] = useState<ResidentCustomElectricityDevice[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedState = readResidentElectricityDeviceState(householdId);

      setDeviceStates((currentStates) => ({
        ...currentStates,
        "Washing Machine": storedState.washingMachine,
      }));
      setCustomDevices(readResidentCustomElectricityDevices(householdId));
    });

    const refresh = () => setCustomDevices(readResidentCustomElectricityDevices(householdId));
    window.addEventListener("focus", refresh);
    window.addEventListener("resident-electricity-devices-updated", refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("resident-electricity-devices-updated", refresh);
    };
  }, [householdId]);

  const toggleDevice = (device: ElectricityDevice) => {
    const nextEnabled = !deviceStates[device.name];
    setDeviceStates((currentStates) => ({ ...currentStates, [device.name]: nextEnabled }));

    if (device.storageKey) {
      const storedState = readResidentElectricityDeviceState(householdId);
      writeResidentElectricityDeviceState(householdId, {
        ...storedState,
        [device.storageKey]: nextEnabled,
      });
    }
  };

  const toggleCustomDevice = (device: ResidentCustomElectricityDevice) => {
    const next = customDevices.map((item) =>
      item.id === device.id ? { ...item, isOn: !item.isOn } : item,
    );
    setCustomDevices(next);
    writeResidentCustomElectricityDevices(householdId, next);
  };

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen bg-[#f5f8ff] px-4 pb-8 pt-4 font-sans text-[#0b1744]">
        <ElectricityHeader />
        <UsageHero />
        <ElectricitySummaryCards />
        <ScanMeterCard />
        <RecentTrendCard />
        <DevicesCard
          householdId={householdId}
          deviceStates={deviceStates}
          customDevices={customDevices}
          onToggleDevice={toggleDevice}
          onToggleCustomDevice={toggleCustomDevice}
        />
        <CategoryCard />
        <MonitoringCard />
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
    <section className="mt-5 grid w-full grid-cols-2 gap-4">
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/Total%20Devices%20icon%20%2B%20Background.png`}
        label="Total Devices"
        value="18"
        subtext="devices"
        variant="total"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/Active%20Icon%20%2B%20Background.png`}
        label="Active Devices"
        value="7"
        subtext="in use now"
        variant="active"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/Status%2BBackground.png`}
        label="Overload Status"
        value="Normal"
        subtext="All systems safe"
        variant="status"
      />
      <ElectricitySummaryCard
        backgroundSrc={`${electricityAssetBase}/Cost%20icon%20%2Bbackground.png`}
        label="Today's Cost"
        value="$2.64"
        subtext="estimated"
        variant="cost"
      />
    </section>
  );
}

function ElectricitySummaryCard({
  backgroundSrc,
  label,
  value,
  subtext,
  variant,
}: {
  backgroundSrc: string;
  label: string;
  value: string;
  subtext: string;
  variant: "total" | "active" | "status" | "cost";
}) {
  const copyTop = "top-[41%]";
  const subtitleTop = "top-[53%]";
  const valueStyles = {
    total: "right-7 bottom-[1.875rem] text-[1.8125rem] text-[#5b5ef7]",
    active: "right-[1.875rem] bottom-[1.875rem] text-[1.8125rem] text-[#39a86b]",
    status: "right-6 bottom-[1.875rem] text-lg text-[#42b487]",
    cost: "right-6 bottom-[1.875rem] text-[1.1875rem] text-[#7657f6]",
  };

  return (
    <article
      className="relative h-[9.7rem] overflow-hidden rounded-[1.75rem]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <AssetImage
        src={backgroundSrc}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 h-full w-full rounded-[inherit] object-fill object-center select-none"
      />
      <div className="absolute inset-0 z-10">
        <p className={`absolute left-[1.875rem] ${copyTop} max-w-[5.8rem] whitespace-nowrap text-[0.8125rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-[#07184a]`}>
          {label}
        </p>
        <p className={`absolute left-[1.875rem] ${subtitleTop} max-w-[5.6rem] whitespace-nowrap text-[0.6875rem] font-medium leading-[1.05] tracking-[-0.015em] text-[#6f7c99]`}>
          {subtext}
        </p>
        <p className={`absolute whitespace-nowrap font-extrabold leading-none tracking-[-0.065em] ${valueStyles[variant]}`}>
          {value}
        </p>
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
    <section
      className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(145deg,#ffffff,#f4f5ff_58%,#f1f9ff)] p-[1.375rem] shadow-[0_18px_45px_rgba(79,70,190,0.11)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="pointer-events-none absolute right-0 top-0 z-0 h-[12.5rem] w-[74%] overflow-hidden opacity-95">
        <AssetImage
          src={`${electricityAssetBase}/Energy-Usage-Background%20on%20top.png`}
          alt=""
          className="h-full w-full object-cover object-top"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[12.75rem] bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.88)_39%,rgba(255,255,255,0.16)_76%,rgba(255,255,255,0.08)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[8.5rem] z-0 h-20 bg-gradient-to-b from-transparent to-[#f7f7ff]" />

      <div className="relative z-10">
        <h2 className="max-w-[13.5rem] text-[1.55rem] font-extrabold leading-[1.16] tracking-[-0.035em] text-[#07184a]">
          Energy Usage
        </h2>
        <p className="mt-1.5 max-w-[14rem] text-[0.82rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
          Your electricity usage overview
        </p>

        <div className="mt-3.5 flex items-center gap-5 text-[0.7rem] font-semibold text-[#7a86a3]">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-7 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#7457f6]" />
            This Week
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-7 rounded-full border-t-2 border-dashed border-[#a9a7f7]" />
            Last Week
          </span>
        </div>

        <div className="relative mt-[1.125rem] h-[18.8rem] overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/82 p-[1.125rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_14px_30px_rgba(79,70,190,0.09)] backdrop-blur-md">
          <svg className="h-full w-full" viewBox="0 0 360 280" role="img" aria-label="Electricity usage trend chart">
            <defs>
              <linearGradient id="electricityTrendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7457f6" stopOpacity="0.28" />
                <stop offset="58%" stopColor="#6f73f6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="electricityTrendStroke" x1="42" x2="348" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7457f6" />
              </linearGradient>
            </defs>
            {[36, 74, 112, 150, 188, 226].map((y) => (
              <line key={y} x1="34" x2="348" y1={y} y2={y} stroke="#e7eaf7" strokeDasharray="3 4" strokeWidth="1" />
            ))}
            <text x="4" y="18" fill="#7a86a3" fontSize="10" fontWeight="600">kWh</text>
            {[20, 16, 12, 8, 4, 0].map((tick, index) => (
              <text key={tick} x="6" y={40 + index * 38} fill="#9aa6bf" fontSize="10" textAnchor="start">
                {tick}
              </text>
            ))}
            <path
              d="M42 186 C66 170 78 156 96 142 C124 120 137 76 150 74 C176 70 179 44 202 36 C228 28 233 154 255 170 C278 190 294 116 312 106 C328 96 338 86 348 74 L348 236 L42 236 Z"
              fill="url(#electricityTrendArea)"
            />
            <path
              d="M42 214 C70 224 82 202 96 194 C120 178 135 156 150 150 C172 140 184 112 202 108 C224 104 240 186 255 198 C282 218 292 164 312 154 C330 144 340 138 348 132"
              fill="none"
              stroke="#a9a7f7"
              strokeOpacity="0.72"
              strokeDasharray="6 7"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M42 186 C66 170 78 156 96 142 C124 120 137 76 150 74 C176 70 179 44 202 36 C228 28 233 154 255 170 C278 190 294 116 312 106 C328 96 338 86 348 74"
              fill="none"
              stroke="url(#electricityTrendStroke)"
              strokeLinecap="round"
              strokeWidth="4"
            />
            {[
              [42, 186],
              [96, 142],
              [150, 74],
              [202, 36],
              [255, 170],
              [312, 106],
              [348, 74],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill="#fff" stroke="#685cf5" strokeWidth="3" />
            ))}
            {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"].map((label, index) => (
              <text key={label} x={42 + index * 51} y="268" fill="#7a86a3" fontSize="10" textAnchor="middle">
                {label}
              </text>
            ))}
          </svg>
        </div>

        <div className="mx-auto mt-3.5 grid h-11 w-full grid-cols-4 rounded-full bg-white/58 p-1 text-center text-[0.72rem] font-semibold text-[#46526f] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_9px_22px_rgba(79,70,190,0.07)] backdrop-blur-md">
          <span className="flex items-center justify-center rounded-full">Hourly</span>
          <span className="flex items-center justify-center rounded-full bg-white text-[#6658f5] shadow-[0_6px_16px_rgba(79,70,190,0.13)]">Daily</span>
          <span className="flex items-center justify-center rounded-full">Weekly</span>
          <span className="flex items-center justify-center rounded-full">Monthly</span>
        </div>

        <div className="mt-5 grid w-full grid-cols-3 items-center gap-1.5">
          <TrendStat
            backgroundSrc={`${electricityAssetBase}/average-this-week.png`}
            label="Average This Week"
            value="9.6"
            unit="kWh"
          />
          <TrendStat
            backgroundSrc={`${electricityAssetBase}/total-this-week.png`}
            label="Total This Week"
            value="67.2"
            unit="kWh"
          />
          <TrendStat
            backgroundSrc={`${electricityAssetBase}/highest-this-week.png`}
            label="Highest Day"
            value="18.3"
            unit="kWh"
            subtext="Friday"
          />
        </div>
      </div>
    </section>
  );
}

function TrendStat({
  backgroundSrc,
  label,
  value,
  unit,
  subtext,
}: {
  backgroundSrc: string;
  label: string;
  value: string;
  unit: string;
  subtext?: string;
}) {
  return (
    <article className="relative isolate h-28 w-full min-w-0 overflow-hidden rounded-[1.375rem] bg-transparent">
      <AssetImage
        src={backgroundSrc}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 h-full w-full rounded-[1.375rem] object-fill object-center select-none"
      />
      <div className="pointer-events-none absolute inset-0 z-10">
        <p className="absolute left-[3.25rem] right-2 top-[1.0625rem] text-[0.59375rem] font-bold leading-[1.15] tracking-[-0.01em] text-[#4e5978]">
          {label}
        </p>
        <p className="absolute bottom-7 left-4 flex items-baseline gap-[0.1875rem] whitespace-nowrap font-extrabold leading-none tracking-[-0.045em] text-[#07184a]">
          <span className="text-[1.5625rem]">{value}</span>
          <span className="whitespace-nowrap text-[0.59375rem] font-bold tracking-normal text-[#66738f]">{unit}</span>
        </p>
        {subtext ? (
          <p className="absolute bottom-3 left-4 text-[0.625rem] font-bold leading-none text-[#22c3ca]">
            {subtext}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DevicesCard({
  householdId,
  deviceStates,
  customDevices,
  onToggleDevice,
  onToggleCustomDevice,
}: {
  householdId: string;
  deviceStates: Record<string, boolean>;
  customDevices: ResidentCustomElectricityDevice[];
  onToggleDevice: (device: ElectricityDevice) => void;
  onToggleCustomDevice: (device: ResidentCustomElectricityDevice) => void;
}) {
  const builtInStatuses = devices.map((device) => {
    const enabled = deviceStates[device.name] ?? device.enabled;
    return !enabled ? "Off" : device.storageKey ? "Active" : device.state;
  });
  const customStatuses = customDevices.map((device) => getElectricityDeviceStatus(device));
  const statuses = [...builtInStatuses, ...customStatuses];
  const summary = {
    devices: statuses.length,
    active: statuses.filter((status) => status === "Active").length,
    scheduled: statuses.filter((status) => status === "Scheduled").length,
    offline: statuses.filter((status) => status === "Off" || status === "Offline").length,
  };

  return (
    <section
      className="mt-5 rounded-[2rem] border border-[rgba(220,230,255,0.7)] bg-[linear-gradient(145deg,#ffffff,#f6f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-[0_14px_30px_rgba(60,120,255,0.16)] ring-1 ring-blue-100/70 backdrop-blur">
          <AssetImage
            src={`${electricityAssetBase}/Device.png`}
            alt=""
            className="h-10 w-10 object-contain"
          />
        </span>
        <h2 className="mt-4 text-[1.65rem] font-extrabold leading-none tracking-[-0.045em] text-[#07184a]">
          Your Devices
        </h2>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 rounded-[1.45rem] bg-white/78 p-2 shadow-[0_12px_30px_rgba(30,64,175,0.08)] ring-1 ring-slate-100/80">
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Total%20Devices.png`} label="Devices" value={String(summary.devices)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Active.png`} label="Active" value={String(summary.active)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Schedule.png`} label="Schedule" value={String(summary.scheduled)} />
        <DeviceSummaryCard iconSrc={`${electricityAssetBase}/Ofline.png`} label="Offline" value={String(summary.offline)} />
      </div>

      <div className="mt-5 space-y-3">
        {devices.map((device) => {
          const enabled = deviceStates[device.name] ?? device.enabled;
          const displayedState = device.storageKey && enabled ? "Active" : device.state;

          return (
            <article
              key={device.name}
              className="flex min-h-[5.2rem] items-center gap-2.5 rounded-[1.45rem] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,64,175,0.07)] ring-1 ring-slate-100/80"
            >
            <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.375rem] bg-[linear-gradient(145deg,#f7faff,#eef4ff)] shadow-[0_8px_18px_rgba(124,145,201,0.12)] ring-1 ring-blue-50/80">
              <span className="flex h-[3.625rem] w-[3.625rem] items-center justify-center overflow-hidden rounded-[1.125rem]">
                <AssetImage
                  src={device.iconSrc}
                  alt=""
                  className="block h-14 w-14 scale-110 object-contain object-center"
                />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="whitespace-normal text-[0.88rem] font-bold leading-[1.08rem] tracking-[-0.025em] text-[#07184a]">{device.name}</p>
              <p className="mt-1 whitespace-nowrap text-[0.72rem] font-medium text-[#7a86a3]">{device.room}</p>
            </div>
            <DeviceStatusDot state={displayedState} />
            <Link
              href={`/household/${householdId}/electricity/devices?preset=${encodeURIComponent(device.name)}`}
              aria-label={`Edit ${device.name}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3c78ff] shadow-[0_8px_18px_rgba(30,64,175,0.10)] ring-1 ring-slate-100"
            >
              <ElectricIcon name="edit" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? "Turn off" : "Turn on"} ${device.name}`}
              onClick={() => onToggleDevice(device)}
              className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${enabled ? "bg-gradient-to-r from-[#557dff] to-[#3362f5]" : "bg-[#dce3f2]"}`}
            >
              <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.16)] transition-transform ${enabled ? "translate-x-5" : ""}`} />
            </button>
          </article>
          );
        })}
        {customDevices.map((device) => {
          const status = getElectricityDeviceStatus(device);
          return (
            <article key={device.id} className="flex min-h-[5.2rem] items-center gap-2.5 rounded-[1.45rem] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,64,175,0.07)] ring-1 ring-slate-100/80">
              <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.375rem] bg-[#f5f8ff]">
                <AssetImage src={`${electricityAssetBase}/appliances/${device.icon}`} alt="" className="h-16 w-16 object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-bold text-[#07184a]">{device.name}</p>
                <p className="mt-1 text-[0.72rem] font-medium text-[#7a86a3]">{device.category}</p>
              </div>
              <DeviceStatusDot state={status} />
              <Link href={`/household/${householdId}/electricity/devices?edit=${device.id}`} aria-label={`Edit ${device.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3c78ff] shadow-sm ring-1 ring-slate-100"><ElectricIcon name="edit" className="h-4 w-4" /></Link>
              <button type="button" role="switch" aria-checked={device.isOn} onClick={() => onToggleCustomDevice(device)} className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors ${device.isOn ? "bg-gradient-to-r from-[#557dff] to-[#3362f5]" : "bg-[#dce3f2]"}`}><span className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${device.isOn ? "translate-x-5" : ""}`} /></button>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_1fr] gap-3">
        <Link href={`/household/${householdId}/electricity/devices`} className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[1.05rem] bg-gradient-to-br from-[#6b8cff] to-[#3d63f3] px-2 text-[0.78rem] font-bold text-white shadow-[0_12px_24px_rgba(61,99,243,0.22)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <ElectricIcon name="plus" className="h-4 w-4" />
          </span>
          Add New Device
        </Link>
        <Link href={`/household/${householdId}/electricity/devices?view=all`} className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-[1.05rem] bg-white px-2 text-[0.76rem] font-bold text-[#316bff] shadow-[0_10px_24px_rgba(30,64,175,0.06)] ring-1 ring-slate-100">
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

function MonitoringCard() {
  const confidence = 97;
  const statusTitle = "System stable";
  const statusMessage = "No anomaly detected";
  const description = "Monitoring your home";
  const buttonLabel = "Run System Check";

  return (
    <section
      className="mt-5 overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#f7f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div>
        <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.045em] text-[#07184a]">
          Overload Monitoring
        </h2>
      </div>

      <div className="mt-5 grid grid-cols-[8.3rem_1fr] items-center gap-4">
        <div className="relative flex h-[8.3rem] w-[8.3rem] items-center justify-center overflow-hidden rounded-[1.65rem] bg-[linear-gradient(145deg,#fffdf9,#f4f7ff)] shadow-[0_16px_32px_rgba(124,145,201,0.12)] ring-1 ring-[#edf0ff]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.92),transparent_36%),radial-gradient(circle_at_76%_74%,rgba(169,214,226,0.16),transparent_40%),radial-gradient(circle_at_42%_70%,rgba(237,217,181,0.16),transparent_44%)]" />
          <div className="absolute inset-3 rounded-[1.25rem] bg-white/36 blur-sm" />
          <AssetImage
            src={`${electricityAssetBase}/Shield.png`}
            alt=""
            className="relative h-[7.35rem] w-[7.35rem] object-contain opacity-[0.94] saturate-[0.82]"
          />
        </div>

        <div className="min-w-0">
          <div className="relative mx-auto flex h-[9.7rem] w-[9.7rem] shrink-0 items-center justify-center overflow-hidden rounded-full">
            <AssetImage
              src={`${electricityAssetBase}/Ring.png`}
              alt=""
              className="pointer-events-none absolute inset-0 block h-full w-full scale-[1.06] object-contain object-center opacity-95"
            />
            <div className="relative z-[2] flex translate-y-0.5 flex-col items-center justify-center text-center">
              <p className="text-[2.22rem] font-extrabold leading-none tracking-[-0.055em] text-[#07184a]">
                {confidence}%
              </p>
              <p className="mt-1 text-[0.63rem] font-semibold leading-none tracking-[-0.015em] text-[#8a97b5]">
                AI Confidence
              </p>
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border border-emerald-100 bg-white/80 shadow-[inset_0_1px_3px_rgba(30,64,175,0.08)]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#7ce1b0] to-[#63d7aa] shadow-[0_4px_14px_rgba(39,184,111,0.22)]"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-full border border-emerald-100 bg-white/80 px-3 py-2.5 shadow-[0_10px_24px_rgba(39,184,111,0.08)]">
        <AssetImage src={`${electricityAssetBase}/check.png`} alt="" className="h-8 w-8 shrink-0 object-contain" />
        <span className="whitespace-nowrap text-[0.78rem] font-extrabold tracking-[-0.02em] text-[#42b883]">
          {statusTitle}
        </span>
        <span className="h-6 w-px shrink-0 bg-emerald-100" />
        <span className="min-w-0 text-[0.72rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
          {statusMessage}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[1.35rem] border border-slate-100 bg-white/78 px-4 py-3 shadow-[0_12px_28px_rgba(30,64,175,0.06)]">
        <AssetImage src={`${electricityAssetBase}/home.png`} alt="" className="h-10 w-10 shrink-0 object-contain" />
        <p className="text-[0.82rem] font-medium leading-5 tracking-[-0.02em] text-[#7a86a3]">
          {description} <span className="font-extrabold text-[#7a8df6]">24/7</span> for overload,
          draw, and efficiency drift.
        </p>
      </div>

      <button className="mt-5 flex h-14 w-full items-center justify-center rounded-[1.25rem] bg-gradient-to-r from-[#7fb0ff] via-[#8d8df7] to-[#b58cf3] text-[1rem] font-extrabold tracking-[-0.02em] text-white shadow-[0_14px_30px_rgba(126,141,246,0.28)]">
        {buttonLabel}
      </button>
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
