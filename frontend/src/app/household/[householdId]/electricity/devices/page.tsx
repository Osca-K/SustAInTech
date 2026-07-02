"use client";

import Image from "next/image";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ElectricityDeviceMode,
  ElectricityScheduleSlot,
  getElectricityDeviceStatus,
  readResidentCustomElectricityDevices,
  ResidentCustomElectricityDevice,
  writeResidentCustomElectricityDevices,
} from "@/lib/residentElectricityDeviceState";

type PageProps = { params: Promise<{ householdId: string }> };

const assetBase = "/assets/resident/electricity/appliances";
const icons = [
  ["Rice Cooker", "rice-cooker.png"], ["Blender", "blender.png"],
  ["Kettle", "kettle.png"], ["Mixer", "mixer.png"], ["Iron", "iron.png"],
  ["Microwave", "microwave.png"], ["Air Fryer", "air-fryer.png"],
  ["Dishwasher", "dishwasher.png"], ["Toaster", "toaster.png"],
  ["Vacuum", "vacuum.png"], ["Fan", "fan.png"], ["Laptop", "laptop.png"],
] as const;
const categories = ["Kitchen", "Laundry", "Cooling", "Heating", "Water Heating", "Lighting", "Cleaning", "Entertainment", "Other"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const builtInDevices = [
  { name: "Smart Meter", category: "Main Line", mode: "alwaysOn" as const, icon: "router.png", status: "Active" as const },
  { name: "Air Conditioner", category: "Cooling", mode: "manual" as const, icon: "fan.png", status: "Active" as const },
  { name: "Fridge", category: "Kitchen", mode: "alwaysOn" as const, icon: "rice-cooker.png", status: "Active" as const },
  { name: "Washing Machine", category: "Laundry", mode: "manual" as const, icon: "dishwasher.png", status: "Off" as const },
  { name: "Water Heater", category: "Water Heating", mode: "scheduled" as const, icon: "kettle.png", status: "Scheduled" as const },
];

const blankDevice: ResidentCustomElectricityDevice = {
  id: "",
  name: "",
  icon: "rice-cooker.png",
  category: "Kitchen",
  powerValue: "",
  powerUnit: "W",
  voltageValue: "",
  voltageUnit: "V",
  frequencyValue: "",
  frequencyUnit: "Hz",
  mode: "manual",
  isOn: true,
  scheduleSlots: [],
};

export default function ElectricityDevicesPage({ params }: PageProps) {
  const { householdId } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("edit");
  const presetName = search.get("preset");
  const showAll = search.get("view") === "all";
  const [devices, setDevices] = useState<ResidentCustomElectricityDevice[]>([]);
  const [device, setDevice] = useState(blankDevice);
  const [scanMode, setScanMode] = useState<"scan" | "manual">("scan");
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const loaded = readResidentCustomElectricityDevices(householdId);
      setDevices(loaded);
      if (editId) {
        const match = loaded.find((item) => item.id === editId);
        if (match) setDevice(match);
      } else if (presetName) {
        const presetIcons: Record<string, string> = {
          "Smart Meter": "router.png",
          "Air Conditioner": "fan.png",
          Fridge: "rice-cooker.png",
          "Washing Machine": "dishwasher.png",
          "Water Heater": "kettle.png",
        };
        setDevice({
          ...blankDevice,
          name: presetName,
          icon: presetIcons[presetName] ?? "rice-cooker.png",
          category: presetName === "Washing Machine" ? "Laundry" : presetName === "Air Conditioner" ? "Cooling" : "Kitchen",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editId, householdId, presetName]);

  const update = <K extends keyof ResidentCustomElectricityDevice>(
    key: K,
    value: ResidentCustomElectricityDevice[K],
  ) => setDevice((current) => ({ ...current, [key]: value }));

  const save = () => {
    if (!device.name.trim()) {
      setError("Device name is required.");
      return;
    }
    const saved = { ...device, id: device.id || crypto.randomUUID(), name: device.name.trim() };
    const next = device.id
      ? devices.map((item) => (item.id === device.id ? saved : item))
      : [...devices, saved];
    writeResidentCustomElectricityDevices(householdId, next);
    router.push(`/household/${householdId}/electricity`);
  };

  const remove = (id: string) => {
    if (!window.confirm("Remove device?\nThis device will no longer be monitored.")) return;
    const next = devices.filter((item) => item.id !== id);
    setDevices(next);
    writeResidentCustomElectricityDevices(householdId, next);
    if (editId === id) router.push(`/household/${householdId}/electricity/devices?view=all`);
  };

  if (showAll) {
    return (
      <DeviceShell title="All Devices" subtitle="Manage monitored electricity appliances" onBack={() => router.back()}>
        <div className="space-y-3">
          {builtInDevices.map((item) => (
            <article key={item.name} className="flex items-center gap-3 rounded-[24px] bg-white/90 p-3 shadow-[0_12px_30px_rgba(74,103,190,.10)]">
              <Image src={`${assetBase}/${item.icon}`} alt="" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold">{item.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{item.category} · {modeLabel(item.mode)}</p>
                <StatusPill status={item.status} />
              </div>
              <button type="button" onClick={() => router.push(`/household/${householdId}/electricity/devices?preset=${encodeURIComponent(item.name)}`)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">Edit</button>
            </article>
          ))}
          {devices.length ? devices.map((item) => (
            <article key={item.id} className="flex items-center gap-3 rounded-[24px] bg-white/90 p-3 shadow-[0_12px_30px_rgba(74,103,190,.10)]">
              <Image src={`${assetBase}/${item.icon}`} alt="" width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold">{item.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{item.category} · {modeLabel(item.mode)}</p>
                <StatusPill status={getElectricityDeviceStatus(item)} />
              </div>
              <button type="button" onClick={() => router.push(`/household/${householdId}/electricity/devices?edit=${item.id}`)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">Edit</button>
              <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-red-500">×</button>
            </article>
          )) : null}
        </div>
        <button type="button" onClick={() => router.push(`/household/${householdId}/electricity/devices`)} className="mt-5 h-14 w-full rounded-2xl bg-gradient-to-r from-[#688cff] to-[#405ef3] font-bold text-white shadow-lg">＋ Add New Device</button>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell title={editId || presetName ? "Edit Device" : "Add New Device"} subtitle="Monitor a new electricity appliance" onBack={() => router.back()}>
      <Section number="1" title="Device name">
        <div className="relative">
          <input value={device.name} maxLength={40} onChange={(event) => { update("name", event.target.value); setError(""); }} placeholder="Rice Cooker" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm outline-none focus:border-blue-400" />
          {device.name && <button type="button" onClick={() => update("name", "")} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-xs text-white">×</button>}
        </div>
        <p className={`mt-1 text-right text-[10px] ${error ? "text-red-500" : "text-slate-400"}`}>{error || `${device.name.length}/40`}</p>
      </Section>

      <Section number="2" title="Choose icon">
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {icons.map(([label, icon]) => {
            const selected = device.icon === icon;
            return <button type="button" key={icon} onClick={() => update("icon", icon)} aria-label={label} className={`relative h-[84px] w-[84px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-white shadow-sm ${selected ? "ring-2 ring-blue-500" : "ring-1 ring-slate-100"}`}><Image src={`${assetBase}/${icon}`} alt="" fill sizes="84px" className="object-cover" />{selected && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-blue-500 text-[10px] text-white">✓</span>}</button>;
          })}
        </div>
      </Section>

      <Section number="3" title="Choose category">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => <button type="button" key={category} onClick={() => update("category", category)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${device.category === category ? "bg-gradient-to-r from-[#688cff] to-[#5268ee] text-white shadow-md" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{category}</button>)}
        </div>
      </Section>

      <Section number="4" title="Specifications & Smart Label Scan">
        <div className="grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
          <button type="button" onClick={() => { setScanMode("scan"); setScanned(true); update("powerValue", "300"); update("voltageValue", "220–240"); update("frequencyValue", "50–60"); }} className={`rounded-xl py-2.5 text-xs font-semibold ${scanMode === "scan" ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "text-slate-500"}`}>⌗　Scan label</button>
          <button type="button" onClick={() => setScanMode("manual")} className={`rounded-xl py-2.5 text-xs font-semibold ${scanMode === "manual" ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "text-slate-500"}`}>✎　Enter manually</button>
        </div>
        {scanned && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white">✓</span><span><strong className="block text-xs">Label detected</strong><span className="text-[10px] text-slate-500">Details extracted successfully. Edit if needed.</span></span><span className="ml-auto rounded-lg bg-slate-800 px-2 py-1 text-[8px] text-white">220–240V<br />300W</span></div>}
        <div className="mt-3 grid grid-cols-1 gap-2">
          <SpecField label="Power" value={device.powerValue} unit={device.powerUnit} units={["W", "kW", "A", "VA"]} onValue={(value) => update("powerValue", value)} onUnit={(value) => update("powerUnit", value)} />
          <SpecField label="Voltage" value={device.voltageValue} unit={device.voltageUnit} units={["V", "kV"]} onValue={(value) => update("voltageValue", value)} onUnit={(value) => update("voltageUnit", value)} />
          <SpecField label="Frequency" value={device.frequencyValue} unit={device.frequencyUnit} units={["Hz", "kHz"]} onValue={(value) => update("frequencyValue", value)} onUnit={(value) => update("frequencyUnit", value)} />
        </div>
        <p className="mt-3 text-[10px] text-slate-500">ⓘ　We support different units, ratings, and ranges.</p>
      </Section>

      <Section number="5" title="Device mode">
        <div className="grid grid-cols-3 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
          {(["alwaysOn", "scheduled", "manual"] as ElectricityDeviceMode[]).map((mode) => <button type="button" key={mode} onClick={() => update("mode", mode)} className={`rounded-xl py-2.5 text-[11px] font-semibold ${device.mode === mode ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "text-slate-500"}`}>{modeLabel(mode)}</button>)}
        </div>
        {device.mode === "scheduled" && <ScheduleEditor slots={device.scheduleSlots} onChange={(slots) => update("scheduleSlots", slots)} />}
        <label className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3 text-xs font-semibold ring-1 ring-slate-100">Device enabled <input type="checkbox" checked={device.isOn} onChange={(event) => update("isOn", event.target.checked)} className="h-5 w-5 accent-blue-600" /></label>
        <div className="mt-3 flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-[9px] text-slate-500"><span>🔵 Scheduled</span><span>🟢 Active</span><span>⚪ Off</span></div>
      </Section>

      {editId && <button type="button" onClick={() => remove(device.id)} className="mb-3 h-12 w-full rounded-2xl border border-red-200 bg-white font-semibold text-red-500">Remove Device</button>}
      <button type="button" onClick={save} className="h-14 w-full rounded-[22px] bg-gradient-to-r from-[#6d8fff] via-[#5f70f5] to-[#425cf0] text-base font-bold text-white shadow-[0_14px_30px_rgba(70,90,230,.3)]">{editId || presetName ? "Save Changes" : "＋  Add Device"}</button>
    </DeviceShell>
  );
}

function DeviceShell({ title, subtitle, onBack, children }: { title: string; subtitle: string; onBack: () => void; children: React.ReactNode }) {
  return <main className="min-h-screen bg-slate-200 text-[#0b1744]"><div className="mx-auto min-h-screen w-full max-w-[430px] bg-[radial-gradient(circle_at_top,#eef3ff,#f8faff_45%,#f5f7ff)] px-4 pb-8 pt-6 shadow-sm"><header className="relative mb-5 text-center"><button type="button" onClick={onBack} aria-label="Back" className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl shadow-md">‹</button><h1 className="text-xl font-extrabold">{title}</h1><p className="mt-1 text-xs text-slate-500">{subtitle}</p></header><div className="space-y-3">{children}</div></div></main>;
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-white bg-white/75 p-3 shadow-[0_12px_30px_rgba(74,103,190,.08)] backdrop-blur"><h2 className="mb-3 flex items-center gap-2 text-xs font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-sm text-blue-600">{number}</span>{title}</h2>{children}</section>;
}

function SpecField({ label, value, unit, units, onValue, onUnit }: { label: string; value: string; unit: string; units: string[]; onValue: (value: string) => void; onUnit: (value: string) => void }) {
  return <label className="text-[10px] text-slate-500">{label}<span className="mt-1 flex overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200"><input value={value} onChange={(event) => onValue(event.target.value)} placeholder="Enter value or range" className="h-11 min-w-0 flex-1 px-3 text-sm text-[#0b1744] outline-none" /><select value={unit} onChange={(event) => onUnit(event.target.value)} className="border-l border-slate-100 bg-white px-3 text-xs text-slate-500 outline-none">{units.map((item) => <option key={item}>{item}</option>)}</select></span></label>;
}

function ScheduleEditor({ slots, onChange }: { slots: ElectricityScheduleSlot[]; onChange: (slots: ElectricityScheduleSlot[]) => void }) {
  const selectedDays = useMemo(() => slots[0]?.days ?? ["Mon", "Tue", "Wed", "Thu", "Fri"], [slots]);
  const toggleDay = (day: string) => {
    const next = selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day];
    onChange(slots.length ? slots.map((slot) => ({ ...slot, days: next })) : [{ id: crypto.randomUUID(), days: next, startTime: "07:00", endTime: "12:00", enabled: true }]);
  };
  const changeSlot = (id: string, patch: Partial<ElectricityScheduleSlot>) => onChange(slots.map((slot) => slot.id === id ? { ...slot, ...patch } : slot));
  return <div className="mt-4"><p className="mb-2 text-[10px] font-semibold text-slate-500">Repeat on</p><div className="grid grid-cols-7 gap-1">{days.map((day) => <button type="button" key={day} onClick={() => toggleDay(day)} className={`h-9 rounded-xl text-[10px] font-semibold ${selectedDays.includes(day) ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}>{day}</button>)}</div><div className="mt-3 space-y-2">{slots.map((slot) => <div key={slot.id} className="grid grid-cols-[24px_1fr_12px_1fr_28px] items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-100"><input type="checkbox" checked={slot.enabled} onChange={(event) => changeSlot(slot.id, { enabled: event.target.checked })} className="accent-blue-600" /><input type="time" value={slot.startTime} onChange={(event) => changeSlot(slot.id, { startTime: event.target.value })} className="min-w-0 text-xs outline-none" /><span>–</span><input type="time" value={slot.endTime} onChange={(event) => changeSlot(slot.id, { endTime: event.target.value })} className="min-w-0 text-xs outline-none" /><button type="button" onClick={() => onChange(slots.filter((item) => item.id !== slot.id))} className="text-slate-400">⌫</button></div>)}</div><button type="button" onClick={() => onChange([...slots, { id: crypto.randomUUID(), days: selectedDays, startTime: "18:30", endTime: "22:30", enabled: true }])} className="mt-2 h-10 w-full rounded-xl border border-dashed border-blue-200 text-xs font-semibold text-blue-600">＋ Add slot</button></div>;
}

function StatusPill({ status }: { status: "Active" | "Scheduled" | "Off" }) {
  return <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${status === "Active" ? "bg-emerald-50 text-emerald-600" : status === "Scheduled" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : status === "Scheduled" ? "bg-blue-500" : "bg-slate-400"}`} />{status}</span>;
}
function modeLabel(mode: ElectricityDeviceMode) { return mode === "alwaysOn" ? "Always on" : mode === "scheduled" ? "Scheduled" : "Manual"; }
