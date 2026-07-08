"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    householdId: string;
    recommendationId: string;
  }>;
};

const recommendations = [
  {
    id: "water-heater-smart-runtime",
    deviceId: "water-heater",
    title: "Schedule water heater for smarter runtime",
    device: "Water Heater",
    icon: "/assets/resident/electricity/appliances/water-heater.png",
    reason: "Your water heater is one of the higher-consumption devices. A controlled runtime can reduce unnecessary usage and help manage your monthly electricity budget.",
    suggestedSchedule: "23:00-06:00",
    estimatedSaving: "R8.40/month",
    confidence: "High",
    comfortImpact: "Low",
    actionType: "editSchedule",
  },
  {
    id: "washing-machine-eco-load",
    deviceId: "washing-machine",
    title: "Use full-load eco wash",
    device: "Washing Machine",
    icon: "/assets/resident/electricity/appliances/washing-machine.png",
    reason: "Eco mode and full loads can reduce laundry energy use while avoiding multiple smaller cycles.",
    suggestedSchedule: "Run full loads when practical",
    estimatedSaving: "R12.60/month",
    confidence: "Medium",
    comfortImpact: "Low",
    actionType: "viewDevice",
  },
  {
    id: "air-conditioner-evening-peak",
    deviceId: "air-conditioner",
    title: "Reduce evening cooling peak",
    device: "Air Conditioner",
    icon: "/assets/resident/electricity/appliances/air-conditioner.png",
    reason: "Cooling is driving higher usage between 18:00-21:00. Small temperature or runtime changes can lower peak load.",
    suggestedSchedule: "Avoid stacking with other heavy loads",
    estimatedSaving: "R24.00/month",
    confidence: "Medium",
    comfortImpact: "Medium",
    actionType: "viewDevice",
  },
  {
    id: "fridge-runtime-check",
    deviceId: "fridge",
    title: "Check fridge runtime",
    device: "Fridge",
    icon: "/assets/resident/electricity/appliances/fridge.png",
    reason: "Your fridge appears to be running longer than usual. Door seals, temperature settings, or ventilation may need attention.",
    suggestedSchedule: "Check runtime and temperature",
    estimatedSaving: "Monitoring recommended",
    confidence: "Low",
    comfortImpact: "Low",
    actionType: "viewDevice",
  },
  {
    id: "budget-usage-balance",
    title: "Balance high-load evenings",
    device: "Whole home",
    icon: "/assets/resident/electricity/energy-save-assistant-icon.png",
    reason: "Spreading heavy appliance use can keep your estimated bill steadier and reduce high-load periods.",
    suggestedSchedule: "Avoid stacking 18:00-21:00",
    estimatedSaving: "R18.00/month",
    confidence: "Medium",
    comfortImpact: "Low",
    actionType: "askAI",
  },
];

export default function RecommendationDetailPage({ params }: PageProps) {
  const { householdId, recommendationId } = use(params);
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const recommendation =
    recommendations.find((item) => item.id === recommendationId) ?? recommendations[0];
  const deviceHref = recommendation.deviceId
    ? `/household/${householdId}/electricity/devices?edit=${recommendation.deviceId}&return=main`
    : `/household/${householdId}/electricity/assistant?prompt=${encodeURIComponent(recommendation.title)}`;

  return (
    <main className="min-h-screen bg-[#f5f8ff] text-[#07184a]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[radial-gradient(circle_at_top,#ffffff,#f5f8ff_58%,#f7faff)] px-4 pb-8 pt-6">
        <header className="relative text-center">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white text-[#07184a] shadow-[0_10px_24px_rgba(30,64,175,0.10)]"
          >
            <DetailIcon name="back" className="h-5 w-5" />
          </button>
          <h1 className="px-12 text-[1.18rem] font-extrabold tracking-[-0.04em]">
            Energy Save Assistant
          </h1>
          <p className="mx-auto mt-2 max-w-[18rem] text-[0.75rem] font-medium leading-5 text-[#6f7c99]">
            Recommendation detail and next steps.
          </p>
        </header>

        <section className="mt-6 rounded-[1.8rem] border border-white/90 bg-white/82 p-5 shadow-[0_18px_42px_rgba(30,64,175,0.09)] backdrop-blur-xl">
          <div className="grid grid-cols-[5rem_1fr] items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.35rem] bg-white shadow-[0_12px_26px_rgba(47,125,246,0.12)] ring-1 ring-blue-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recommendation.icon} alt="" className="h-[4.6rem] w-[4.6rem] object-cover" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f2efff] px-2.5 py-1 text-[0.62rem] font-bold text-[#6b61df]">
                <DetailIcon name="sparkles" className="h-3 w-3" />
                Top Recommendation
              </span>
              <h2 className="mt-2 text-[1.08rem] font-extrabold leading-6 tracking-[-0.035em]">
                {recommendation.title}
              </h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <DetailMetric label="Device" value={recommendation.device} />
            <DetailMetric label="Saving" value={recommendation.estimatedSaving} />
            <DetailMetric label="Schedule" value={recommendation.suggestedSchedule} />
            <DetailMetric label="Confidence" value={recommendation.confidence} />
          </div>

          <div className="mt-4 rounded-[1.25rem] bg-[#f7f9ff] p-4">
            <h3 className="text-[0.86rem] font-extrabold">Why this matters</h3>
            <p className="mt-2 text-[0.78rem] font-medium leading-5 text-[#63708d]">
              {recommendation.reason}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <DetailMetric label="Comfort impact" value={recommendation.comfortImpact} />
            <DetailMetric label="Reason" value={recommendation.reason} />
          </div>
        </section>

        <section className="mt-4 rounded-[1.55rem] border border-white/90 bg-white/82 p-4 shadow-[0_14px_30px_rgba(30,64,175,0.08)]">
          {confirmed ? (
            <div className="rounded-[1.1rem] bg-emerald-50 px-4 py-3 text-[0.78rem] font-bold text-emerald-700">
              Savings tracking enabled. This is a mock action for now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <Link
                href={deviceHref}
                className="flex h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-[#4f8cff] to-[#4b5ff2] text-[0.86rem] font-extrabold text-white shadow-[0_12px_24px_rgba(47,125,246,0.22)]"
              >
                <DetailIcon name="calendar" className="h-4 w-4" />
                {recommendation.actionType === "editSchedule" ? "Review Schedule" : "View Device"}
              </Link>
              <Link
                href={`/household/${householdId}/electricity/assistant?prompt=${encodeURIComponent("Will this affect my hot water availability?")}`}
                className="flex h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-white text-[0.82rem] font-extrabold text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.07)]"
              >
                <DetailIcon name="bot" className="h-4 w-4" />
                Ask a question
              </Link>
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-white text-[0.82rem] font-extrabold text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.07)]"
              >
                <DetailIcon name="trend" className="h-4 w-4" />
                Track savings
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-white px-3 py-3 shadow-[0_8px_18px_rgba(30,64,175,0.05)] ring-1 ring-slate-100/80">
      <p className="text-[0.62rem] font-bold text-[#7a86a3]">{label}</p>
      <p className="mt-1 text-[0.78rem] font-extrabold leading-4 text-[#07184a]">{value}</p>
    </div>
  );
}

function DetailIcon({ name, className }: { name: string; className: string }) {
  const paths: Record<string, string> = {
    back: "m15 18-6-6 6-6",
    sparkles: "M12 3l1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm14 1 .8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
    calendar: "M5 4h14v16H5V4Zm0 5h14M8 2v4m8-4v4",
    bot: "M12 8V5m-5 5h10a3 3 0 0 1 3 3v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a3 3 0 0 1 3-3Zm2 5h.01M10 15h.01",
    trend: "M4 17 10 11l4 4 6-8M14 7h6v6",
  };

  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}
