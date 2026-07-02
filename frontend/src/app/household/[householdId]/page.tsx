import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type HomePageProps = { params: Promise<{ householdId: string }> };
type Tone = "water" | "electricity" | "recycling" | "impact";

const household = {
  name: "Household SV-H001",
  houseNumber: "House 24",
  area: "Soweto, Johannesburg",
  connectedServices: 3,
};

const services: Array<{
  name: string;
  detail: string;
  status: string;
  plan: string;
  tone: Tone;
}> = [
  { name: "Water Monitoring", detail: "Meter WTR-2048-L", status: "Active", plan: "Paid service", tone: "water" },
  { name: "Electricity Monitoring", detail: "Meter ELEC-7712", status: "Active", plan: "Paid service", tone: "electricity" },
  { name: "Recycling", detail: "Smart waste support enabled", status: "Active", plan: "Free community service", tone: "recycling" },
];

const saverOverview: Array<{
  label: string;
  rank: string;
  badge?: string;
  note?: string;
  tone: Tone;
}> = [
  { label: "Electricity", rank: "Top 5%", badge: "Leader", note: "Maintain this usage to stay in top 5%.", tone: "electricity" },
  { label: "Water", rank: "Top 14%", note: "Save 30 L to reach top 10%.", tone: "water" },
  { label: "Recycling", rank: "Top 9%", badge: "Ahead of area average", tone: "recycling" },
];

const today: Array<{ label: string; value: string; status: string; tone: Tone }> = [
  { label: "Water", value: "248 L", status: "Normal usage", tone: "water" },
  { label: "Electricity", value: "18.4 kWh", status: "Stable", tone: "electricity" },
  { label: "Recycling", value: "3 items sorted", status: "1 alert", tone: "recycling" },
  { label: "Impact", value: "Good", status: "On track", tone: "impact" },
];

const toneClasses: Record<Tone, string> = {
  water: "text-sky-500 bg-sky-50",
  electricity: "text-amber-400 bg-amber-50",
  recycling: "text-emerald-500 bg-emerald-50",
  impact: "text-teal-500 bg-teal-50",
};

export default async function HomePage({ params }: HomePageProps) {
  const { householdId } = await params;
  const base = `/household/${householdId}`;

  const actions = [
    { label: "Scan Water Meter", image: "/assets/resident/home/scan-water-meter.png", href: `${base}/meter-upload` },
    { label: "Scan Electric Meter", image: "/assets/resident/home/scan-electric-meter.png", href: `${base}/electricity` },
    { label: "Scan Waste", image: "/assets/resident/home/scan-waste.png", href: `${base}/waste` },
    { label: "Household Settings", image: "/assets/resident/home/household-settings.png", href: `${base}/settings` },
  ];

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen space-y-3 bg-[radial-gradient(circle_at_80px_20px,#e8fbf7_0,transparent_250px),#f8fafc] px-4 pb-4 pt-7 text-[#07133f]">
        <header className="flex items-start justify-between gap-4 px-1">
          <div>
            <h1 className="text-[34px] font-bold leading-none tracking-[-0.04em]">Home</h1>
            <p className="mt-3 flex items-center gap-1.5 text-lg font-semibold">Good morning, Ausca <span className="text-emerald-500"><LeafIcon /></span></p>
            <p className="mt-1 text-xs text-slate-500">Your household services are connected and ready.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <GlassIcon label="Notifications"><BellIcon /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" /></GlassIcon>
            <GlassIcon label="Profile"><ProfileIcon /></GlassIcon>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[24px] border border-white bg-white/90 p-4 shadow-[0_8px_30px_rgba(15,23,42,.07)]">
          <div className="relative min-h-[205px]">
            <div className="relative z-10 max-w-[58%]">
              <p className="text-[10px] font-bold tracking-wide text-teal-600">MY HOUSEHOLD</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight">{household.name}</h2>
              <p className="mt-4 flex items-center gap-2 text-xs text-slate-600"><HomeOutline />{household.houseNumber}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><PinIcon />{household.area}</p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white"><CheckIcon /></span>
                {household.connectedServices} services connected
              </span>
            </div>
            <div className="absolute bottom-0 right-[-10px] top-3 w-[47%]">
              <span className="absolute right-1 top-0 z-10 text-sky-500"><SignalIcon /></span>
              <Image src="/assets/resident/home/connected-house.png" alt="Connected modern home" fill sizes="(max-width: 430px) 47vw, 190px" className="object-contain object-center" priority />
            </div>
          </div>
          <div className="relative z-10 mt-3 grid min-w-0 grid-cols-3 gap-1.5">
            {services.map((service) => (
              <div key={service.name} className="flex min-w-0 min-h-12 items-center justify-center gap-1 rounded-2xl border border-slate-100 bg-white px-1 text-center text-[9px] font-semibold leading-3 shadow-sm">
                <ServiceIcon tone={service.tone} compact /><span className="min-w-0">{service.name}</span>
              </div>
            ))}
          </div>
        </section>

        <Card title="TOP SAVER OVERVIEW">
          <div className="grid min-w-0 grid-cols-3 divide-x divide-slate-100">
            {saverOverview.map((item) => (
              <div key={item.label} className="flex min-w-0 min-h-[158px] flex-col items-center px-1.5 text-center">
                <ServiceIcon tone={item.tone} />
                <p className="mt-1.5 break-words text-[10px] font-semibold">{item.label}</p>
                <p className="mt-1.5 text-lg font-bold">{item.rank}</p>
                {item.badge && <span className="mt-2 max-w-full rounded-full bg-emerald-50 px-1.5 py-1 text-[8px] font-semibold leading-3 text-emerald-700">{item.badge}</span>}
                {item.note && <p className="mt-2 text-[8px] leading-3 text-slate-500">{item.note}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="CONNECTED SERVICES">
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <Link href={service.tone === "water" ? `${base}/water` : service.tone === "electricity" ? `${base}/electricity` : `${base}/recycling`} key={service.name} className="grid grid-cols-[36px_1fr_auto_12px] items-center gap-2 py-2.5">
                <ServiceIcon tone={service.tone} />
                <div><p className="text-xs font-semibold">{service.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{service.detail}</p></div>
                <div className="text-right"><p className="text-[10px] font-medium text-emerald-600">{service.status}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] ${service.tone === "recycling" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>{service.plan}</span></div>
                <span className="text-slate-500">›</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="TODAY AT A GLANCE">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {today.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-1 text-[10px] font-semibold"><ServiceIcon tone={item.tone} compact />{item.label}</div>
                <p className="mt-3 whitespace-nowrap text-lg font-bold">{item.value}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${item.status === "1 alert" ? "bg-amber-400" : "bg-emerald-500"}`} />{item.status}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="QUICK ACTIONS">
          <div className="grid grid-cols-4 gap-2">
            {actions.map((action) => (
              <Link href={action.href} key={action.label} className="flex min-h-[105px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-1.5 text-center shadow-sm">
                <Image src={action.image} alt="" width={50} height={50} className="h-12 w-12 rounded-xl object-cover" />
                <span className="mt-2 text-[10px] font-semibold leading-3">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Link href={`${base}/subscriptions`} className="flex items-center gap-3 rounded-[22px] border border-white bg-white/90 p-3 shadow-[0_8px_30px_rgba(15,23,42,.06)]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600"><ShieldIcon /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Subscriptions &amp; Services</span><span className="mt-0.5 block text-[10px] text-slate-500">Manage plan, service status, address, and notifications.</span></span>
          <span className="text-2xl text-slate-600">›</span>
        </Link>
      </div>
    </ResidentMobileShell>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-[22px] border border-white bg-white/90 p-3.5 shadow-[0_8px_30px_rgba(15,23,42,.06)]"><h2 className="mb-3 text-xs font-bold">{title}</h2>{children}</section>;
}

function GlassIcon({ label, children }: { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} className="relative grid h-12 w-12 place-items-center rounded-full border border-white bg-white/80 text-[#07133f] shadow-md backdrop-blur">{children}</button>;
}

function ServiceIcon({ tone, compact = false }: { tone: Tone; compact?: boolean }) {
  const size = compact ? "h-6 w-6" : "h-9 w-9";
  return <span className={`grid shrink-0 place-items-center rounded-xl ${size} ${toneClasses[tone]}`}>{tone === "water" ? <DropIcon /> : tone === "electricity" ? <BoltIcon /> : tone === "recycling" ? <RecycleIcon /> : <LeafIcon />}</span>;
}

const Svg = ({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) => <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const BellIcon = () => <Svg><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></Svg>;
const ProfileIcon = () => <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
const HomeOutline = () => <Svg className="h-4 w-4"><path d="m3 11 9-8 9 8M5 10v10h14V10M10 20v-6h4v6" /></Svg>;
const PinIcon = () => <Svg className="h-4 w-4"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></Svg>;
const SignalIcon = () => <Svg className="h-8 w-8"><path d="M5 12a7 7 0 0 1 7 7M5 6a13 13 0 0 1 13 13" /><circle cx="5" cy="19" r="1" fill="currentColor" /></Svg>;
const DropIcon = () => <Svg><path d="M12 2S5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12Z" /></Svg>;
const BoltIcon = () => <Svg><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></Svg>;
const RecycleIcon = () => <Svg><path d="m7 7 2-4 2 4M9 3h6l2 4m0 10 4-1-2-4m2 4-3 5h-5M6 13l-3 3 3 3m-3-3h6" /></Svg>;
const LeafIcon = () => <Svg><path d="M20 4C11 4 5 8 5 14c0 4 3 6 6 6 6 0 9-7 9-16Z" /><path d="M4 21c3-6 7-9 12-12" /></Svg>;
const ShieldIcon = () => <Svg className="h-7 w-7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Svg>;
const CheckIcon = () => <Svg className="h-3 w-3"><path d="m5 12 4 4 10-10" /></Svg>;
