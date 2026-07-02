import Link from "next/link";
import { ReactNode } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type SettingsPageProps = { params: Promise<{ householdId: string }> };

const accountRows = [
  { icon: "users", title: "Household Details", detail: "Update address, members, and info" },
  { icon: "meter", title: "My Meters", detail: "View and manage your meters" },
  { icon: "card", title: "Subscriptions & Services", detail: "Manage plans and billing", route: "subscriptions" },
  { icon: "wallet", title: "Payment Methods", detail: "Manage cards and payment options" },
];

const preferenceRows = [
  { icon: "bell", title: "Notifications", detail: "Manage alerts and reminders" },
  { icon: "shield", title: "Privacy & Security", detail: "Privacy settings and data controls" },
  { icon: "globe", title: "Language", detail: "Choose your preferred language", value: "English" },
  { icon: "palette", title: "Appearance", detail: "Choose app theme", value: "Light" },
];

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { householdId } = await params;
  const base = `/household/${householdId}`;

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top_left,#eefcf8_0,transparent_260px),#f8fafc] px-4 pb-5 pt-7 text-[#07133f]">
        <header className="flex items-start gap-3">
          <Link href={base} aria-label="Back to Home" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white bg-white/90 text-emerald-500 shadow-md"><GearIcon /></Link>
          <div><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="mt-1 text-sm leading-5 text-slate-500">Manage your household, meters, preferences, and notifications.</p></div>
        </header>

        <Link href={base} className="flex items-center gap-4 rounded-[26px] border border-white bg-white/90 p-4 shadow-[0_8px_30px_rgba(15,23,42,.07)]">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[24px] bg-emerald-50 text-emerald-500"><HomeIcon /></span>
          <span className="min-w-0 flex-1"><span className="block text-xl font-bold">Household SV-H001</span><span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">Active</span><span className="mt-3 flex items-center gap-2 text-xs text-slate-500"><SmallHomeIcon />House 24</span><span className="mt-2 flex items-center gap-2 text-xs text-slate-500"><PinIcon />Soweto, Johannesburg</span></span>
          <Chevron />
        </Link>

        <SettingsSection title="Household & Account">
          {accountRows.map((row) => <SettingsRow key={row.title} {...row} href={row.route ? `${base}/${row.route}` : undefined} tone="green" />)}
        </SettingsSection>
        <SettingsSection title="App Preferences">
          {preferenceRows.map((row) => <SettingsRow key={row.title} {...row} tone="blue" />)}
        </SettingsSection>
        <SettingsSection title="Support">
          <SettingsRow icon="help" title="Help & Support" detail="FAQs, contact support, and guides" tone="green" />
        </SettingsSection>
        <div className="overflow-hidden rounded-[22px] border border-red-100 bg-white/90">
          <SettingsRow icon="logout" title="Log Out" detail="Sign out of your account" tone="red" />
        </div>
      </div>
    </ResidentMobileShell>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 px-3 text-sm font-semibold text-slate-500">{title}</h2><div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-white bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,.05)]">{children}</div></section>;
}

function SettingsRow({ icon, title, detail, value, href, tone }: { icon: string; title: string; detail: string; value?: string; href?: string; tone: "green" | "blue" | "red" }) {
  const content = <><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone === "red" ? "bg-red-50 text-red-500" : tone === "blue" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"}`}><RowIcon name={icon} /></span><span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${tone === "red" ? "text-red-600" : ""}`}>{title}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span>{value && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-500">{value}</span>}<Chevron /></>;
  const classes = "flex w-full items-center gap-3 px-4 py-3.5 text-left";
  return href ? <Link href={href} className={classes}>{content}</Link> : <button type="button" className={classes}>{content}</button>;
}

const Svg = ({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) => <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const GearIcon = () => <Svg className="h-7 w-7"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1a2 2 0 0 0 .4-2.2A2 2 0 0 0 2.8 13H2v-3h.8A2 2 0 0 0 4.6 8.5a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.1 2 2 0 0 0 10.2 2H14v.2A2 2 0 0 0 15.2 4a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2A2 2 0 0 0 21.2 10h.8v3h-.8a2 2 0 0 0-1.8 2Z" /></Svg>;
const HomeIcon = () => <Svg className="h-10 w-10"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></Svg>;
const SmallHomeIcon = () => <Svg className="h-4 w-4"><path d="m3 11 9-8 9 8M5 10v10h14V10" /></Svg>;
const PinIcon = () => <Svg className="h-4 w-4"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></Svg>;
const Chevron = () => <span aria-hidden="true" className="text-xl text-slate-500">›</span>;
function RowIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0 1 10 0v2m2-15a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5v1" /></>,
    meter: <><rect x="4" y="3" width="16" height="18" rx="2" /><rect x="7" y="6" width="10" height="6" /><path d="M8 17h.01M12 17h4" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18" /></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" /><path d="M16 12h6v4h-6a2 2 0 0 1 0-4Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h2a7 7 0 0 0-2-11Z" /><circle cx="7.5" cy="10" r=".5" fill="currentColor" /><circle cx="10" cy="6.5" r=".5" fill="currentColor" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .4-1 1.2-1 2.2M12 17h.01" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  };
  return <Svg>{paths[name]}</Svg>;
}
