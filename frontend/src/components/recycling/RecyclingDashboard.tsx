"use client";

import { ReactNode, useState } from "react";

type SheetMode = "scan" | "zones" | "match" | "hazard" | "pulse";

type Metric = {
  title: string;
  value: string;
  subtitle: string;
  tone: "green" | "blue" | "amber" | "rose";
  icon: IconName;
};

type DetectedItem = {
  name: string;
  confidence: string;
  route: string;
  note: string;
  tone: string;
};

type IconName =
  | "alert"
  | "bell"
  | "box"
  | "calendar"
  | "check"
  | "chevron"
  | "circle"
  | "leaf"
  | "map"
  | "plus"
  | "recycle"
  | "scan"
  | "shield"
  | "spark"
  | "truck"
  | "users"
  | "wrench";

const metrics: Metric[] = [
  {
    title: "Recycling Score",
    value: "82%",
    subtitle: "Good sorting",
    tone: "green",
    icon: "leaf",
  },
  {
    title: "Next Pickup",
    value: "3 days",
    subtitle: "General waste",
    tone: "blue",
    icon: "calendar",
  },
  {
    title: "Items Sorted",
    value: "12",
    subtitle: "This week",
    tone: "green",
    icon: "box",
  },
  {
    title: "Safety Alerts",
    value: "1",
    subtitle: "Special handling",
    tone: "rose",
    icon: "shield",
  },
];

const detectedItems: DetectedItem[] = [
  {
    name: "Plastic bottle",
    confidence: "96%",
    route: "Recyclables",
    note: "Rinse, flatten, and keep with bottles until collector threshold.",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Old charger",
    confidence: "88%",
    route: "E-waste & Repair",
    note: "Useful for repairers or parts before e-waste drop-off.",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    name: "Lithium battery",
    confidence: "93%",
    route: "Hazardous Handling",
    note: "Do not mix with general waste. Mark for safe pickup.",
    tone: "bg-rose-50 text-rose-700",
  },
];

const routeChips = ["Recyclables", "E-waste & Repair", "Hazardous", "General Waste"];

const donorMatches = [
  {
    name: "Mamelodi Repair Hub",
    detail: "Accepts chargers, kettles, and appliance parts",
    distance: "1.8 km",
  },
  {
    name: "Community Reuse Partner",
    detail: "Donation pickup available after approval",
    distance: "2.4 km",
  },
];

const pulseItems = [
  "Reusable metal gate nearby",
  "2 homes interested",
  "Collector pickup likely tomorrow",
];

export function RecyclingDashboard() {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#f6fbf8_0%,#f2f8ff_48%,#f8fbff_100%)] px-4 pb-5 pt-[calc(1.15rem+env(safe-area-inset-top))] text-[#07184a]"
      style={{
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="space-y-4">
        <RecyclingHeader />
        <RecyclingHeroCard onScan={() => setSheetMode("scan")} />
        <RecyclingMetricCards />
        <FeatureStack onOpen={setSheetMode} />
      </div>

      {sheetMode ? (
        <WasteRoutingSheet mode={sheetMode} onClose={() => setSheetMode(null)} onModeChange={setSheetMode} />
      ) : null}
    </div>
  );
}

function RecyclingHeader() {
  return (
    <header className="flex items-center gap-3 px-1 pb-1">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white bg-white/88 text-[#61bc82] shadow-[0_10px_25px_rgba(61,142,105,0.11)] backdrop-blur">
        <Icon name="recycle" className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-[2rem] font-extrabold leading-none tracking-[-0.045em] text-[#07184a]">
          Recycling
        </h1>
        <p className="mt-1.5 max-w-[15rem] text-[0.72rem] font-medium leading-4 text-[#71809f]">
          Support local reuse, safer disposal, and community collection.
        </p>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white bg-white/88 text-[#263866] shadow-[0_8px_22px_rgba(56,86,160,0.10)] backdrop-blur"
      >
        <Icon name="bell" className="h-5 w-5" />
      </button>
    </header>
  );
}

function RecyclingHeroCard({ onScan }: { onScan: () => void }) {
  return (
    <section className="relative min-h-[19.4rem] overflow-hidden rounded-[1.85rem] border border-white/90 bg-[linear-gradient(145deg,#ffffff_0%,#f7fffb_48%,#edf8ff_100%)] p-6 shadow-[0_18px_45px_rgba(30,91,120,0.10)]">
      <div className="pointer-events-none absolute -right-10 top-9 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(103,203,163,0.18),rgba(103,203,163,0)_68%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[54%] bg-[radial-gradient(circle_at_50%_45%,rgba(126,213,178,0.24),rgba(255,255,255,0)_62%)]" />

      <div className="relative z-10 flex min-h-[16.4rem] flex-col justify-between gap-5">
        <div className="max-w-[13rem]">
          <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.045em] text-[#07184a]">
            Smart Recycling
          </h2>
          <p className="mt-2 text-[0.82rem] font-medium leading-5 text-[#6e7c99]">
            Scan waste, spot hazards, and connect items to the right next step.
          </p>
        </div>

        <div className="space-y-3">
          <StatusPill tone="green" icon="check" text="3 items scanned today" />
          <StatusPill tone="amber" icon="alert" text="1 special handling item" />
        </div>

        <button
          type="button"
          onClick={onScan}
          className="inline-flex h-12 w-[10.9rem] items-center justify-center gap-2 rounded-[1.05rem] bg-gradient-to-r from-[#5ac68f] via-[#55c6b4] to-[#6a9ff4] text-[0.86rem] font-extrabold text-white shadow-[0_14px_28px_rgba(74,164,185,0.24)]"
        >
          <Icon name="scan" className="h-5 w-5" />
          Scan Waste
        </button>
      </div>

      <RecyclingBinIllustration />
    </section>
  );
}

function RecyclingBinIllustration() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-7 right-3 h-44 w-44"
    >
      <div className="absolute bottom-0 left-5 h-8 w-32 rounded-full bg-emerald-200/30 blur-sm" />
      <div className="absolute bottom-10 left-10 h-24 w-24 rotate-[-10deg] rounded-[1.2rem] bg-[linear-gradient(145deg,#82d4a7,#58b786)] shadow-[0_18px_30px_rgba(68,144,108,0.22)]">
        <div className="absolute inset-x-3 top-3 h-2 rounded-full bg-white/32" />
        <Icon name="recycle" className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/92" />
      </div>
      <div className="absolute bottom-[6.7rem] left-[4.1rem] h-20 w-6 rotate-[-16deg] rounded-full bg-[linear-gradient(180deg,#b6e8c5,#6ab986)] shadow-[0_9px_18px_rgba(50,124,90,0.16)]">
        <div className="absolute -top-1 left-1 h-2 w-4 rounded-full bg-[#54a971]" />
        <div className="absolute left-1 top-2 h-10 w-4 rounded-full bg-white/18" />
      </div>
      <div className="absolute bottom-[5.8rem] right-[2.3rem] h-20 w-6 rotate-[15deg] rounded-full bg-[linear-gradient(180deg,#c6e8fb,#7abce6)] shadow-[0_9px_18px_rgba(50,105,154,0.16)]">
        <div className="absolute -top-1 left-1 h-2 w-4 rounded-full bg-[#5799ce]" />
        <div className="absolute left-1 top-2 h-10 w-4 rounded-full bg-white/20" />
      </div>
      <span className="absolute right-4 top-7 h-2 w-2 rounded-full bg-emerald-300/70" />
      <span className="absolute right-1 top-16 h-7 w-3 rotate-[32deg] rounded-full bg-emerald-200/55" />
      <span className="absolute right-6 top-20 h-9 w-3 rotate-[-35deg] rounded-full bg-emerald-300/40" />
      <span className="absolute left-8 top-9 h-1.5 w-1.5 rounded-full bg-cyan-200/70" />
    </div>
  );
}

function RecyclingMetricCards() {
  return (
    <section className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <article
          key={metric.title}
          className="relative min-h-[7.15rem] overflow-hidden rounded-[1.45rem] border border-white/85 bg-white/86 p-4 shadow-[0_13px_30px_rgba(35,76,120,0.08)]"
        >
          <div className={`absolute -right-7 -top-8 h-24 w-24 rounded-full ${metricGlow(metric.tone)}`} />
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metricIcon(metric.tone)}`}>
            <Icon name={metric.icon} className="h-5 w-5" />
          </div>
          <p className="mt-3 text-[0.74rem] font-semibold leading-none text-[#6f7c99]">
            {metric.title}
          </p>
          <p className={`mt-1 text-[1.75rem] font-extrabold leading-none tracking-[-0.055em] ${metricValue(metric.tone)}`}>
            {metric.value}
          </p>
          <p className="mt-1 text-[0.72rem] font-medium text-[#6f7c99]">{metric.subtitle}</p>
        </article>
      ))}
    </section>
  );
}

function FeatureStack({ onOpen }: { onOpen: (mode: SheetMode) => void }) {
  return (
    <section className="space-y-3">
      <FeatureCard
        icon="scan"
        title="Scan Waste"
        subtitle="Identify items, spot hazards, and choose the safest route."
        ariaLabel="Open waste scan flow"
        onClick={() => onOpen("scan")}
      />

      <FeatureCard
        icon="map"
        title="Disposal Zones"
        subtitle="Route each item to the safest available stream."
        onClick={() => onOpen("zones")}
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          {routeChips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-1 text-[0.55rem] font-bold ${routeChipClass(chip)}`}
            >
              {chip}
            </span>
          ))}
        </div>
      </FeatureCard>

      <FeatureCard
        icon="recycle"
        title="Circular Match"
        subtitle="2 donation options - collector nearby - details after selection"
        onClick={() => onOpen("match")}
      />

      <FeatureCard
        icon="alert"
        title="Hazard Alert"
        subtitle="Gas cylinder requires safe pickup"
        tone="hazard"
        onClick={() => onOpen("hazard")}
      >
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen("hazard");
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#efb8a9] bg-white/80 text-[0.6rem] font-bold text-[#d96b4d]"
          >
            <Icon name="bell" className="h-3.5 w-3.5" />
            Notify Truck
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen("hazard");
            }}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#e8795c] to-[#cf633f] text-[0.6rem] font-bold text-white shadow-[0_8px_16px_rgba(207,99,63,0.16)]"
          >
            <Icon name="truck" className="h-3.5 w-3.5" />
            Safe Pickup
          </button>
        </div>
      </FeatureCard>

      <FeatureCard
        icon="spark"
        title="Collection Pulse"
        subtitle="Nearby offer: reusable metal gate - 2 homes interested"
        onClick={() => onOpen("pulse")}
      />
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
  children,
  tone = "default",
  ariaLabel,
  onClick,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  children?: ReactNode;
  tone?: "default" | "hazard";
  ariaLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="group w-full rounded-[1.35rem] border border-white/85 bg-white/90 p-3.5 text-left shadow-[0_12px_28px_rgba(35,76,120,0.07)] transition active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem] shadow-[0_10px_22px_rgba(35,76,120,0.08)] ${
            tone === "hazard"
              ? "bg-[#fff7f2] text-[#df7758]"
              : "bg-[#effbf6] text-[#62bd93]"
          }`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.88rem] font-extrabold leading-tight tracking-[-0.025em] text-[#07184a]">
            {title}
          </span>
          <span className="mt-1 block text-[0.68rem] font-medium leading-4 text-[#6e7c99]">
            {subtitle}
          </span>
          {children}
        </span>
        <Icon name="chevron" className="h-4 w-4 shrink-0 text-[#8d9ab4] transition group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function WasteRoutingSheet({
  mode,
  onClose,
  onModeChange,
}: {
  mode: SheetMode;
  onClose: () => void;
  onModeChange: (mode: SheetMode) => void;
}) {
  const sheetTitles: Record<SheetMode, string> = {
    scan: "Waste Scan",
    zones: "Disposal Zones",
    match: "Circular Match",
    hazard: "Hazard Alert",
    pulse: "Collection Pulse",
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/28 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <section
        aria-modal="true"
        role="dialog"
        className="max-h-[86vh] w-full max-w-[430px] overflow-hidden rounded-t-[2rem] border border-white/90 bg-[#f8fbff] shadow-[0_-20px_50px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
          <div>
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.28em] text-[#62bd93]">
              Smart routing
            </p>
            <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.04em] text-[#07184a]">
              {sheetTitles[mode]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#64748b] shadow-[0_8px_18px_rgba(30,64,175,0.08)]"
            aria-label="Close recycling workflow"
          >
            <span className="text-lg leading-none">x</span>
          </button>
        </div>

        <div className="max-h-[calc(86vh-5.5rem)] overflow-y-auto px-5 py-4">
          {mode === "scan" ? <ScanWorkflow onModeChange={onModeChange} /> : null}
          {mode === "zones" ? <ZonesWorkflow onModeChange={onModeChange} /> : null}
          {mode === "match" ? <CircularMatchWorkflow /> : null}
          {mode === "hazard" ? <HazardWorkflow /> : null}
          {mode === "pulse" ? <PulseWorkflow /> : null}
        </div>
      </section>
    </div>
  );
}

function ScanWorkflow({ onModeChange }: { onModeChange: (mode: SheetMode) => void }) {
  return (
    <div className="space-y-4">
      <div className="relative h-52 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(145deg,#e9fbf3,#eef7ff)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="absolute left-5 top-5 h-24 w-24 rounded-3xl border border-white/85 bg-white/58 shadow-[0_16px_28px_rgba(37,112,98,0.10)]" />
        <DetectedMarker className="left-8 top-10" label="Bottle" tone="green" />
        <DetectedMarker className="right-10 top-12" label="Charger" tone="blue" />
        <DetectedMarker className="left-24 bottom-10" label="Battery" tone="rose" />
        <div className="absolute bottom-5 right-5 w-40 rounded-[1.2rem] border border-white/85 bg-white/78 p-3 shadow-[0_12px_24px_rgba(35,76,120,0.08)]">
          <p className="text-[0.68rem] font-extrabold text-[#07184a]">AI pre-identification</p>
          <p className="mt-1 text-[0.6rem] font-medium leading-3 text-[#6e7c99]">
            3 items detected with separate routing suggestions.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {detectedItems.map((item) => (
          <DetectedWasteListItem key={item.name} item={item} />
        ))}
      </div>

      <AIMessage>
        This charger may still be useful to a nearby repairer. Would you like to donate it before disposal?
      </AIMessage>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onModeChange("match")}
          className="h-11 rounded-full bg-gradient-to-r from-[#5fc28f] to-[#5ab7e9] text-[0.76rem] font-extrabold text-white shadow-[0_10px_22px_rgba(76,169,174,0.20)]"
        >
          Find acceptors
        </button>
        <button
          type="button"
          onClick={() => onModeChange("hazard")}
          className="h-11 rounded-full border border-rose-100 bg-white text-[0.76rem] font-extrabold text-[#d96b4d] shadow-[0_8px_18px_rgba(30,64,175,0.06)]"
        >
          Declare hazard
        </button>
      </div>
    </div>
  );
}

function ZonesWorkflow({ onModeChange }: { onModeChange: (mode: SheetMode) => void }) {
  return (
    <div className="space-y-3">
      {[
        ["Recyclables", "Clean bottles, cans, glass, and cardboard sorted by material."],
        ["E-waste & Repair", "Chargers, phones, cables, and small appliances with reuse value."],
        ["Hazardous", "Batteries, gas cylinders, chemicals, sharp or flammable waste."],
        ["General Waste", "Items with no safe reuse, repair, or recycling pathway."],
      ].map(([title, body]) => (
        <button
          type="button"
          key={title}
          onClick={() => title === "Hazardous" && onModeChange("hazard")}
          className="w-full rounded-[1.35rem] border border-white/90 bg-white/82 p-4 text-left shadow-[0_10px_24px_rgba(35,76,120,0.06)]"
        >
          <p className="text-[0.86rem] font-extrabold text-[#07184a]">{title}</p>
          <p className="mt-1 text-[0.68rem] font-medium leading-4 text-[#6e7c99]">{body}</p>
        </button>
      ))}
    </div>
  );
}

function CircularMatchWorkflow() {
  return (
    <div className="space-y-4">
      <AIMessage>
        This item may still be useful. Nearby repairers and reuse partners can accept it before it enters waste flow.
      </AIMessage>
      <div className="space-y-3">
        {donorMatches.map((match) => (
          <article
            key={match.name}
            className="rounded-[1.35rem] border border-white/90 bg-white/84 p-4 shadow-[0_10px_24px_rgba(35,76,120,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[0.9rem] font-extrabold tracking-[-0.02em] text-[#07184a]">
                  {match.name}
                </h3>
                <p className="mt-1 text-[0.68rem] font-medium leading-4 text-[#6e7c99]">{match.detail}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.58rem] font-extrabold text-emerald-700">
                {match.distance}
              </span>
            </div>
            <button
              type="button"
              className="mt-3 h-10 w-full rounded-full bg-gradient-to-r from-[#5fc28f] to-[#5ab7e9] text-[0.72rem] font-extrabold text-white"
            >
              Send offer
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function HazardWorkflow() {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-rose-100 bg-[#fff8f5] p-4 shadow-[0_10px_24px_rgba(207,99,63,0.08)]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#df7758] shadow-[0_8px_18px_rgba(207,99,63,0.10)]">
            <Icon name="alert" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-[0.95rem] font-extrabold text-[#07184a]">Gas cylinder flagged</h3>
            <p className="mt-1 text-[0.68rem] font-medium text-[#7b6f68]">
              Keep separate from normal bags and mark for special handling.
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {["Lithium battery", "Gas cylinder", "Chemical container", "Sharp item"].map((item) => (
          <button
            type="button"
            key={item}
            className="rounded-[1rem] border border-white/90 bg-white/84 px-3 py-3 text-[0.68rem] font-bold text-[#263153] shadow-[0_8px_18px_rgba(30,64,175,0.06)]"
          >
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="h-12 w-full rounded-full bg-gradient-to-r from-[#e8795c] to-[#cf633f] text-[0.78rem] font-extrabold text-white shadow-[0_12px_26px_rgba(207,99,63,0.20)]"
      >
        Notify municipal truck
      </button>
    </div>
  );
}

function PulseWorkflow() {
  return (
    <div className="space-y-4">
      <AIMessage>
        You have collected enough cans to notify a local collector. Similar recyclable offers are nearby.
      </AIMessage>
      <div className="rounded-[1.45rem] border border-white/90 bg-white/84 p-4 shadow-[0_10px_24px_rgba(35,76,120,0.06)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-[#62bd93]">
              Collector threshold
            </p>
            <p className="mt-2 text-[2.1rem] font-extrabold leading-none tracking-[-0.06em] text-[#07184a]">
              20 cans
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[0.62rem] font-extrabold text-emerald-700">
            Ready
          </span>
        </div>
        <div className="mt-4 h-3 rounded-full bg-emerald-50">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#62bd93] to-[#5ab7e9]" />
        </div>
      </div>
      <div className="space-y-2">
        {pulseItems.map((item) => (
          <p key={item} className="rounded-full bg-white/80 px-4 py-3 text-[0.7rem] font-bold text-[#53627e] shadow-[0_8px_18px_rgba(30,64,175,0.05)]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function DetectedMarker({
  className,
  label,
  tone,
}: {
  className: string;
  label: string;
  tone: "green" | "blue" | "rose";
}) {
  const toneClass = {
    green: "border-emerald-400 text-emerald-700 bg-emerald-50/88",
    blue: "border-sky-400 text-sky-700 bg-sky-50/88",
    rose: "border-rose-400 text-rose-700 bg-rose-50/88",
  };

  return (
    <span className={`absolute rounded-full border px-2 py-1 text-[0.55rem] font-extrabold shadow-sm ${toneClass[tone]} ${className}`}>
      {label}
    </span>
  );
}

function DetectedWasteListItem({ item }: { item: DetectedItem }) {
  return (
    <article className="rounded-[1.35rem] border border-white/90 bg-white/84 p-3.5 shadow-[0_10px_24px_rgba(35,76,120,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[0.86rem] font-extrabold tracking-[-0.02em] text-[#07184a]">
            {item.name}
          </h3>
          <p className="mt-1 text-[0.63rem] font-medium text-[#6e7c99]">Confidence {item.confidence}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[0.56rem] font-extrabold ${item.tone}`}>
          {item.route}
        </span>
      </div>
      <p className="mt-2 text-[0.65rem] font-medium leading-4 text-[#6e7c99]">{item.note}</p>
    </article>
  );
}

function AIMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-emerald-100 bg-[linear-gradient(145deg,#ffffff,#f2fbf7)] p-4 shadow-[0_10px_24px_rgba(35,76,120,0.06)]">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#62bd93]">
          <Icon name="spark" className="h-4 w-4" />
        </span>
        <p className="text-[0.72rem] font-semibold leading-5 text-[#52617f]">{children}</p>
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  icon,
  text,
}: {
  tone: "green" | "amber";
  icon: IconName;
  text: string;
}) {
  const classes = tone === "green" ? "text-[#5aa979]" : "text-[#d79d43]";

  return (
    <span className="inline-flex min-h-9 w-[12rem] items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 text-[0.7rem] font-extrabold text-[#60708d] shadow-[0_9px_18px_rgba(35,76,120,0.06)] backdrop-blur">
      <Icon name={icon} className={`h-4 w-4 ${classes}`} />
      {text}
    </span>
  );
}

function routeChipClass(label: string) {
  if (label === "Recyclables") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (label === "E-waste & Repair") {
    return "bg-sky-50 text-sky-700";
  }
  if (label === "Hazardous") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-slate-100 text-slate-600";
}

function metricGlow(tone: Metric["tone"]) {
  const classes: Record<Metric["tone"], string> = {
    green: "bg-emerald-100/50",
    blue: "bg-blue-100/55",
    amber: "bg-amber-100/60",
    rose: "bg-rose-100/55",
  };

  return classes[tone];
}

function metricIcon(tone: Metric["tone"]) {
  const classes: Record<Metric["tone"], string> = {
    green: "bg-emerald-50 text-[#62bd93] shadow-[0_9px_18px_rgba(98,189,147,0.14)]",
    blue: "bg-blue-50 text-[#5f8df7] shadow-[0_9px_18px_rgba(95,141,247,0.14)]",
    amber: "bg-amber-50 text-[#d79d43] shadow-[0_9px_18px_rgba(215,157,67,0.14)]",
    rose: "bg-rose-50 text-[#df7758] shadow-[0_9px_18px_rgba(223,119,88,0.14)]",
  };

  return classes[tone];
}

function metricValue(tone: Metric["tone"]) {
  const classes: Record<Metric["tone"], string> = {
    green: "text-[#62bd93]",
    blue: "text-[#5f8df7]",
    amber: "text-[#d79d43]",
    rose: "text-[#df7758]",
  };

  return classes[tone];
}

function Icon({ name, className }: { name: IconName; className: string }) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 4 3.5 19h17L12 4Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </>
    ),
    box: (
      <>
        <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
        <path d="m4 8.5 8 4.5 8-4.5" />
        <path d="M12 13v7" />
      </>
    ),
    calendar: (
      <>
        <path d="M5 4h14v16H5V4Z" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M5 9h14" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    circle: <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0" />,
    leaf: (
      <>
        <path d="M20 4c-8.5.5-13.5 4.5-14 11 4.6.7 11-.4 14-11Z" />
        <path d="M6 18c2.7-4.6 6.1-7.4 10-9" />
      </>
    ),
    map: (
      <>
        <path d="M9 18 4 20V6l5-2 6 2 5-2v14l-5 2-6-2Z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    recycle: (
      <>
        <path d="m7 7 2-4 2 4" />
        <path d="M9 3h6l2 4" />
        <path d="m17 17 4-1-2-4" />
        <path d="m21 16-3 5h-5" />
        <path d="M6 13 3 16l3 3" />
        <path d="M3 16h6" />
      </>
    ),
    scan: (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M7 12h10" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3v5" />
        <path d="M12 16v5" />
        <path d="M4 12h5" />
        <path d="M15 12h5" />
        <path d="m7 7 2 2" />
        <path d="m15 15 2 2" />
        <path d="m17 7-2 2" />
        <path d="m9 15-2 2" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3V7Z" />
        <path d="M14 10h4l3 3v3h-7v-6Z" />
        <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 11a4 4 0 1 0-8 0" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M19 8a3 3 0 0 1 2 5" />
        <path d="M3 13a3 3 0 0 1 2-5" />
      </>
    ),
    wrench: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0 4.9 4.9L10 20.8 5.2 16l9.5-9.7Z" />
        <path d="m6 17 2 2" />
      </>
    ),
  };

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
      {paths[name]}
    </svg>
  );
}
