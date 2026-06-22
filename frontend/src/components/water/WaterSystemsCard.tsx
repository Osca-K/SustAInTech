"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  defaultResidentElectricityDeviceState,
  getResidentElectricityDeviceStateKey,
  readResidentElectricityDeviceState,
} from "@/lib/residentElectricityDeviceState";

const systemsAssetBase = "/assets/resident/water/systems";

type WaterSystemStatus = "Active" | "Normal" | "Fault";

type WaterSystem = {
  name: string;
  category: string;
  icon: string;
  status: WaterSystemStatus;
  lastSync: string;
};

const fixedWaterSystems: WaterSystem[] = [
  {
    name: "Main Water Meter",
    category: "Main Line / Outside",
    icon: "water-meter.png",
    status: "Normal",
    lastSync: "2 min ago",
  },
  {
    name: "Bathroom Shower",
    category: "Bathroom",
    icon: "bathroom-shower.png",
    status: "Active",
    lastSync: "5 min ago",
  },
  {
    name: "Toilet Cistern",
    category: "Bathroom",
    icon: "toilet-cistern.png",
    status: "Normal",
    lastSync: "12 min ago",
  },
  {
    name: "Kitchen Sink",
    category: "Kitchen",
    icon: "kitchen-sink.png",
    status: "Normal",
    lastSync: "25 min ago",
  },
  {
    name: "Bathroom Sink",
    category: "Bathroom",
    icon: "bathroom-sink.png",
    status: "Normal",
    lastSync: "41 min ago",
  },
  {
    name: "Bathtub",
    category: "Bathroom",
    icon: "bathtub.png",
    status: "Normal",
    lastSync: "2h ago",
  },
  {
    name: "Exterior Tap",
    category: "Outdoor",
    icon: "exterior-tap.png",
    status: "Fault",
    lastSync: "1 day ago",
  },
];

const statusStyles: Record<WaterSystemStatus, string> = {
  Active: "bg-[#edf9f2] text-[#2f9d62] before:bg-[#57c982]",
  Normal: "bg-[#f1f5fb] text-[#687895] before:bg-[#a5b1c7]",
  Fault: "bg-[#fff0f2] text-[#d85663] before:bg-[#ee6f7a]",
};

export function WaterSystemsCard({ householdId }: { householdId: string }) {
  const [electricityState, setElectricityState] = useState(
    defaultResidentElectricityDeviceState,
  );

  useEffect(() => {
    const syncElectricityState = () => {
      setElectricityState(readResidentElectricityDeviceState(householdId));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === getResidentElectricityDeviceStateKey(householdId)) {
        syncElectricityState();
      }
    };

    const frame = window.requestAnimationFrame(syncElectricityState);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", handleStorage);
    };
  }, [householdId]);

  const waterSystems = useMemo<WaterSystem[]>(
    () => [
      ...fixedWaterSystems.slice(0, -1),
      {
        name: "Dishwasher",
        category: "Kitchen",
        icon: "dishwasher.png",
        status: electricityState.dishwasher ? "Active" : "Normal",
        lastSync: "2h ago",
      },
      {
        name: "Washing Machine",
        category: "Laundry",
        icon: "washing-machine.png",
        status: electricityState.washingMachine ? "Active" : "Normal",
        lastSync: "1 day ago",
      },
      fixedWaterSystems[fixedWaterSystems.length - 1],
    ],
    [electricityState],
  );

  const statusCounts = waterSystems.reduce(
    (counts, system) => ({
      ...counts,
      [system.status]: counts[system.status] + 1,
    }),
    { Active: 0, Normal: 0, Fault: 0 } as Record<WaterSystemStatus, number>,
  );

  return (
    <section
      aria-labelledby="water-systems-title"
      className="rounded-[2rem] border border-[rgba(220,230,255,0.7)] bg-[linear-gradient(145deg,#ffffff,#f6f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header className="flex flex-col items-center text-center">
        <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/90 shadow-[0_14px_30px_rgba(60,120,255,0.16)] ring-1 ring-blue-100/70 backdrop-blur">
          <Image
            src={`${systemsAssetBase}/fixtures.png`}
            alt=""
            fill
            sizes="64px"
            className="scale-125 object-cover"
          />
        </span>
        <h2
          id="water-systems-title"
          className="mt-4 text-[1.65rem] font-extrabold leading-none tracking-[-0.045em] text-[#07184a]"
        >
          Water Systems
        </h2>
        <p className="mt-2 text-[0.7rem] font-medium leading-4 text-[#71809f]">
          Household systems linked to your water usage.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-4 gap-2 rounded-[1.45rem] bg-white/78 p-2 shadow-[0_12px_30px_rgba(30,64,175,0.08)] ring-1 ring-slate-100/80">
        <SummaryCard
          label="Fixtures"
          value={waterSystems.length}
          detail="Total"
          icon="fixtures.png"
        />
        <SummaryCard label="Active" value={statusCounts.Active} detail="In use" tone="active" />
        <SummaryCard label="Normal" value={statusCounts.Normal} detail="Ready" tone="normal" />
        <SummaryCard
          label="Fault"
          value={statusCounts.Fault}
          detail="Attention"
          icon="fault.png"
        />
      </div>

      <div className="mt-5 space-y-3">
        {waterSystems.map((system) => (
          <article
            key={system.name}
            className="flex min-h-[5.2rem] items-center gap-2.5 rounded-[1.45rem] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(30,64,175,0.07)] ring-1 ring-slate-100/80"
          >
            <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.375rem] bg-[linear-gradient(145deg,#f7faff,#eef4ff)] shadow-[0_8px_18px_rgba(124,145,201,0.12)] ring-1 ring-blue-50/80">
              <span className="relative flex h-[3.625rem] w-[3.625rem] items-center justify-center overflow-hidden rounded-[1.125rem]">
                <Image
                  src={`${systemsAssetBase}/${system.icon}`}
                  alt=""
                  fill
                  sizes="58px"
                  className="scale-110 object-cover object-center"
                />
              </span>
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-[0.88rem] font-bold leading-[1.08rem] tracking-[-0.025em] text-[#07184a]">
                {system.name}
              </h3>
              <p className="mt-1 text-[0.68rem] font-medium leading-4 text-[#7a86a3]">
                {system.category}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#dceafd] bg-[#f4f9ff] px-1.5 py-0.5 text-[0.48rem] font-semibold text-[#4e8bd4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#63aaf2]" />
                Wi-Fi system
              </span>
            </div>

            <div className="min-w-[4.65rem] text-right">
              <span
                className={`relative inline-flex items-center rounded-full py-0.5 pl-3.5 pr-1.5 text-[0.5rem] font-semibold before:absolute before:left-1.5 before:h-1.5 before:w-1.5 before:rounded-full ${statusStyles[system.status]}`}
              >
                {system.status}
              </span>
              <p className="mt-1.5 text-[0.48rem] font-medium text-[#97a2b7]">Last sync</p>
              <p className="mt-0.5 whitespace-nowrap text-[0.62rem] font-semibold text-[#334b7c]">
                {system.lastSync}
              </p>
            </div>

            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rotate-[-45deg] border-b border-r border-[#b8c6df]"
            />
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[1.05rem] bg-gradient-to-r from-[#5e83f7] to-[#45c6d8] px-3 text-[0.76rem] font-bold text-white shadow-[0_12px_24px_rgba(55,135,218,0.22)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <PlusIcon />
          </span>
          Add New Fixture
        </button>
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[1.05rem] border border-[#c9dcfb] bg-white/80 px-3 text-[0.74rem] font-bold text-[#3673d5] shadow-[0_10px_24px_rgba(30,64,175,0.06)]"
        >
          <FixtureListIcon />
          View All Fixtures
        </button>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon?: string;
  tone?: "active" | "normal";
}) {
  return (
    <article className="flex min-h-[5.6rem] min-w-0 flex-col items-center justify-between rounded-[1rem] bg-white px-1 py-2.5 text-center shadow-[0_8px_18px_rgba(30,64,175,0.06)] ring-1 ring-slate-100/90">
      <p className="text-[0.62rem] font-semibold leading-none text-[#415071]">{label}</p>
      {icon ? (
        <span className="relative h-7 w-7 overflow-hidden rounded-lg">
          <Image
            src={`${systemsAssetBase}/${icon}`}
            alt=""
            fill
            sizes="28px"
            className="scale-125 object-cover"
          />
        </span>
      ) : (
        <span
          className={`h-5 w-5 rounded-full border border-white shadow-[0_4px_10px_rgba(65,94,145,0.18)] ${
            tone === "active"
              ? "bg-[radial-gradient(circle_at_35%_30%,#baf7ca_0%,#5acb7d_48%,#2fa55c_100%)]"
              : "bg-[radial-gradient(circle_at_35%_30%,#eef2f8_0%,#b8c3d5_55%,#8e9cb5_100%)]"
          }`}
        />
      )}
      <p className="text-[1.45rem] font-extrabold leading-none tracking-[-0.05em] text-[#07184a]">
        {value}
      </p>
      <p className="text-[0.48rem] font-medium text-[#8b97b1]">{detail}</p>
    </article>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function FixtureListIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m4 7 1.5 1.5L8 6M11 7h9M4 12l1.5 1.5L8 11M11 12h9M4 17l1.5 1.5L8 16M11 17h9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
