import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type PageProps = { params: Promise<{ householdId: string }> };
type Tone = "water" | "electricity" | "recycling";

const activeServices: Array<{ name: string; detail: string; plan: string; price: string; footnote: string; tone: Tone }> = [
  { name: "Water Monitoring", detail: "Meter: WTR-2048-L", plan: "Paid Service", price: "R129 / month", footnote: "Next billing: 05 Jun 2025", tone: "water" },
  { name: "Electricity Monitoring", detail: "Meter: ELEC-7712", plan: "Paid Service", price: "R149 / month", footnote: "Next billing: 05 Jun 2025", tone: "electricity" },
  { name: "Recycling", detail: "Smart waste routing enabled", plan: "Free Service", price: "Always free", footnote: "Community service", tone: "recycling" },
];

export default async function SubscriptionsPage({ params }: PageProps) {
  const { householdId } = await params;
  const base = `/household/${householdId}`;
  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen space-y-5 bg-[#f8fafc] px-4 pb-5 pt-7 text-[#07133f]">
        <header className="flex items-start gap-3">
          <Link href={base} aria-label="Back to Home" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-md">←</Link>
          <div className="min-w-0 flex-1"><h1 className="text-[27px] font-bold leading-8 tracking-tight">Subscriptions &amp; Services</h1><p className="mt-1 text-sm text-slate-500">Manage your active plans and services.</p></div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-md"><ReceiptIcon /></span>
        </header>

        <section className="relative min-h-[225px] overflow-hidden rounded-[26px] border border-emerald-50 bg-[linear-gradient(120deg,#fff_20%,#ecfdf5)] p-5 shadow-[0_8px_30px_rgba(15,23,42,.06)]">
          <div className="relative z-10 max-w-[55%]"><h2 className="text-xl font-bold leading-7">Your services are <span className="text-emerald-500">connected</span> and active</h2><p className="mt-4 text-xs leading-5 text-slate-500">Monitor, manage, and make a difference every day.</p><span className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2.5 text-xs font-semibold text-emerald-700 shadow-sm"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">✓</span>3 Active Services</span></div>
          <Image src="/assets/resident/home/connected-house.png" alt="" fill sizes="210px" className="object-contain object-right-bottom opacity-80" />
        </section>

        <section><h2 className="mb-2 px-1 text-lg font-bold">Active Services</h2><div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">{activeServices.map((service) => <ServiceRow key={service.name} {...service} />)}</div></section>

        <section><h2 className="mb-2 px-1 text-base font-bold">Available Add-ons</h2><div className="space-y-2">
          <Addon icon={<ShieldIcon />} title="Leak Protection" detail="AI-powered leak detection and alerts." price="R49" tone="violet" />
          <Addon icon={<ChartIcon />} title="Advanced Analytics" detail="Deep insights and predictive reports." price="R59" tone="teal" />
        </div></section>

        <div className="flex items-center gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50/40 p-4"><span className="text-emerald-500"><TagIcon /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-emerald-700">Have a promo code?</span><span className="text-xs text-slate-500">Apply a promo code to your plan.</span></span><button type="button" className="rounded-xl border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-700">Apply Code</button></div>
        <button type="button" className="flex w-full items-center gap-3 rounded-[22px] bg-white p-4 text-left shadow-[0_8px_30px_rgba(15,23,42,.05)]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-600"><ReceiptIcon /></span><span className="flex-1"><span className="block text-sm font-semibold">Billing &amp; Invoices</span><span className="text-xs text-slate-500">View billing history and download invoices.</span></span><span className="text-xl text-slate-500">›</span></button>
      </div>
    </ResidentMobileShell>
  );
}

function ServiceRow({ name, detail, plan, price, footnote, tone }: { name: string; detail: string; plan: string; price: string; footnote: string; tone: Tone }) {
  return <button type="button" className="grid w-full grid-cols-[50px_1fr_auto] items-center gap-3 p-4 text-left"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone === "water" ? "bg-blue-50 text-blue-500" : tone === "electricity" ? "bg-amber-50 text-amber-400" : "bg-emerald-50 text-emerald-500"}`}>{tone === "water" ? <DropIcon /> : tone === "electricity" ? <BoltIcon /> : <RecycleIcon />}</span><span className="min-w-0"><span className="block text-sm font-bold">{name}</span><span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-600">Active</span><span className="mt-2 block text-[11px] text-slate-500">{detail}</span></span><span className="text-right"><span className={`inline-block rounded-full px-2 py-1 text-[9px] ${tone === "recycling" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>{plan}</span><span className={`mt-2 block text-sm font-semibold ${tone === "recycling" ? "text-emerald-600" : ""}`}>{price}</span><span className="mt-1 block text-[9px] text-slate-400">{footnote}</span></span></button>;
}

function Addon({ icon, title, detail, price, tone }: { icon: ReactNode; title: string; detail: string; price: string; tone: "violet" | "teal" }) {
  return <div className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-teal-50 text-teal-600"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-[10px] text-slate-500">{detail}</span></span><span className="text-sm font-semibold">{price}<span className="text-[10px] font-normal text-slate-500"> / month</span></span><button type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tone === "violet" ? "border-violet-500 text-violet-600" : "border-teal-500 text-teal-600"}`}>Add</button></div>;
}

const Svg = ({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) => <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const DropIcon = () => <Svg><path d="M12 2S5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12Z" /></Svg>;
const BoltIcon = () => <Svg><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></Svg>;
const RecycleIcon = () => <Svg><path d="m7 7 2-4 2 4M9 3h6l2 4m0 10 4-1-2-4m2 4-3 5h-5M6 13l-3 3 3 3m-3-3h6" /></Svg>;
const ShieldIcon = () => <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Svg>;
const ChartIcon = () => <Svg><path d="M4 20V10m5 10V4m5 16v-7m5 7V7" /></Svg>;
const TagIcon = () => <Svg><path d="M20 13 11 22l-9-9V4h9l9 9Z" /><circle cx="7" cy="9" r="1" /></Svg>;
const ReceiptIcon = () => <Svg><path d="M6 2h10l4 4v16H6V2Z" /><path d="M16 2v5h5M9 12h8M9 16h6" /></Svg>;
