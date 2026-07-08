"use client";

import { use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type PageProps = { params: Promise<{ householdId: string }> };
type ChatMessage = { id: string; role: "assistant" | "user"; text: string; time: string };

const assetBase = "/assets/resident/electricity";
const assistantIcon = `${assetBase}/energy-save-assistant-icon.png`;
const assistantRecommendations = [
  {
    id: "water-heater-smart-runtime",
    title: "Schedule water heater for smarter runtime",
    icon: `${assetBase}/appliances/water-heater.png`,
    saving: "R8.40/month",
    description: "Run between 23:00-06:00 to reduce unnecessary peak-time usage.",
  },
  {
    id: "washing-machine-eco-load",
    title: "Use full-load eco wash",
    icon: `${assetBase}/appliances/washing-machine.png`,
    saving: "R12.60/month",
    description: "Eco mode and full loads can reduce laundry energy use.",
  },
  {
    id: "air-conditioner-evening-peak",
    title: "Reduce evening cooling peak",
    icon: `${assetBase}/appliances/air-conditioner.png`,
    saving: "R24.00/month",
    description: "Cooling is driving higher usage between 18:00-21:00.",
  },
];

const promptResponses: Record<string, string> = {
  "How can I save today?":
    "Your best opportunity today is your water heater and evening device use. Reducing unnecessary water heater runtime and avoiding multiple heavy appliances at once can help lower your usage.",
  "Best time to run appliances":
    "For load balancing, run high-power appliances outside your evening peak window. Based on your usage pattern, avoid stacking heavy devices between 18:00 and 21:00.",
  "Why is my usage high?":
    "Your usage is higher mainly because cooling and water heating are contributing more than usual. Check air conditioner runtime and water heater schedule.",
  "Optimize my settings":
    "I recommend reviewing your water heater schedule, reducing standby devices, and checking high-use appliances. I can help you create a safer schedule before applying changes.",
  "Will I run out?":
    "Based on your current usage trend, your electricity is estimated to last 18 days. If usage increases during evening peaks, this estimate may reduce.",
  "Cheapest time":
    "Use high-power appliances outside your evening peak window where possible. Your current pattern suggests avoiding 18:00 to 21:00.",
  "Lower my bill":
    "Start with water heating, cooling runtime, and standby devices. Those are the best places to reduce your estimated monthly bill.",
};

export default function EnergyAssistantPage({ params }: PageProps) {
  const { householdId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") ?? "";
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I'm your AI energy assistant. I can help you save money and reduce electricity usage. What would you like to know?",
      time: "10:14 AM",
    },
    ...(initialPrompt
      ? [createUserMessage(initialPrompt), createAssistantMessage(responseFor(initialPrompt))]
      : []),
  ]);

  const promptChips = ["Will I run out?", "Why is usage high?", "Cheapest time", "Lower my bill"];
  const relatedActions = [
    { title: "Set water heater schedule", detail: "23:00 - 06:00", icon: "calendar" },
    { title: "Get a reminder", detail: "Before high-load hours", icon: "bell" },
    { title: "Track your savings", detail: "Monitor and compare", icon: "trend" },
  ];

  const visibleMessages = useMemo(() => messages, [messages]);

  const sendPrompt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      createUserMessage(trimmed),
      createAssistantMessage(responseFor(trimmed)),
    ]);
    setInput("");
    setListening(false);
  };

  const toggleListening = () => {
    if (listening) {
      setListening(false);
      setInput("How can I reduce my bill this month?");
      return;
    }
    setListening(true);
  };

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
            <AssistantIcon name="back" className="h-5 w-5" />
          </button>
          <h1 className="px-12 text-[1.25rem] font-extrabold tracking-[-0.04em]">
            Energy Save Assistant <span className="text-[#7b6df4]">*</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[18rem] text-[0.75rem] font-medium leading-5 text-[#6f7c99]">
            Ask, speak, or explore smart electricity recommendations.
          </p>
        </header>

        <section className="mt-6 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[radial-gradient(circle,#ffffff_45%,#eaf2ff_72%,transparent_73%)] shadow-[0_18px_34px_rgba(47,125,246,0.14)]">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_rgba(47,125,246,0.16)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assistantIcon} alt="" className="h-14 w-14 object-contain" />
            </span>
          </div>
          <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.72rem] font-bold text-[#4b5ff2] shadow-[0_8px_18px_rgba(30,64,175,0.08)]">
            <span className="h-2 w-2 rounded-full bg-[#ff4055]" />
            {listening ? "Listening... Tap to stop" : "Ready to help"}
          </div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-white/90 bg-white/76 p-4 shadow-[0_16px_38px_rgba(30,64,175,0.08)] backdrop-blur-xl">
          <div className="space-y-4">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#2f7df6] shadow-[0_6px_14px_rgba(30,64,175,0.10)]">
                    <AssistantIcon name="bot" className="h-4 w-4" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[78%] rounded-[1.15rem] px-3.5 py-3 text-[0.78rem] font-medium leading-5 shadow-[0_8px_18px_rgba(30,64,175,0.06)] ${
                    message.role === "user"
                      ? "bg-[#eaf3ff] text-[#1d64c8]"
                      : "bg-[#f7f5ff] text-[#18234d]"
                  }`}
                >
                  <p>{message.text}</p>
                  <p className="mt-1 text-right text-[0.58rem] text-[#8b96b0]">{message.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendPrompt(chip)}
              className="h-10 rounded-full border border-white/90 bg-white/80 px-3 text-[0.7rem] font-bold text-[#2f66c8] shadow-[0_8px_18px_rgba(30,64,175,0.06)]"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {assistantRecommendations.map((recommendation) => (
            <Link
              key={recommendation.id}
              href={`/household/${householdId}/electricity/assistant/recommendations/${recommendation.id}`}
              className="grid min-w-full snap-center grid-cols-[4.3rem_1fr_2.25rem] items-center gap-3 rounded-[1.45rem] border border-[#e4ebff] bg-white/82 p-3 shadow-[0_14px_30px_rgba(30,64,175,0.08)]"
            >
              <span className="flex h-[4.3rem] w-[4.3rem] items-center justify-center overflow-hidden rounded-[1.1rem] bg-white shadow-[0_8px_18px_rgba(47,125,246,0.10)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={recommendation.icon} alt="" className="h-16 w-16 object-cover" />
              </span>
              <span className="min-w-0">
                <span className="inline-flex rounded-full bg-[#f2efff] px-2 py-1 text-[0.62rem] font-bold text-[#6b61df]">
                  Recommendation
                </span>
                <span className="mt-1.5 block text-[0.86rem] font-extrabold leading-5">
                  {recommendation.title}
                </span>
                <span className="mt-1 block text-[0.7rem] font-medium leading-4 text-[#6f7c99]">
                  {recommendation.description}
                </span>
                <span className="mt-1.5 block text-[0.66rem] font-bold text-[#2f7df6]">
                  Est. monthly saving {recommendation.saving}
                </span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.08)]">
                <AssistantIcon name="chevronRight" className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-4 rounded-[1.45rem] border border-white/90 bg-white/78 p-3 shadow-[0_12px_28px_rgba(30,64,175,0.07)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[0.78rem] font-extrabold text-[#07184a]">Related actions</h2>
            <span className="text-[0.68rem] font-bold text-[#2f7df6]">View all</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {relatedActions.map((action) => (
              <button
                key={action.title}
                type="button"
                className="flex items-center gap-3 rounded-[1rem] bg-white px-3 py-2.5 text-left shadow-[0_8px_18px_rgba(30,64,175,0.05)]"
              >
                <AssistantIcon name={action.icon} className="h-5 w-5 text-[#2f7df6]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.72rem] font-extrabold">{action.title}</span>
                  <span className="block text-[0.62rem] font-medium text-[#7a86a3]">{action.detail}</span>
                </span>
                <AssistantIcon name="chevronRight" className="h-4 w-4 text-[#7a86a3]" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.45rem] border border-white/90 bg-white/86 p-2 shadow-[0_14px_30px_rgba(30,64,175,0.08)]">
          {listening ? (
            <div className="mb-2 flex h-12 items-center justify-center rounded-[1.1rem] bg-[#edf2ff] text-[0.72rem] font-bold text-[#4b5ff2]">
              Listening... Tap to stop
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendPrompt(input);
              }}
              placeholder="Type a message..."
              className="min-w-0 flex-1 rounded-[1rem] bg-white px-3 py-3 text-[0.78rem] outline-none ring-1 ring-slate-100 placeholder:text-[#9aa6bf]"
            />
            <button
              type="button"
              onClick={toggleListening}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#2f7df6] shadow-[0_8px_18px_rgba(30,64,175,0.08)]"
            >
              <AssistantIcon name="mic" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => sendPrompt(input)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8cff] to-[#4b5ff2] text-white shadow-[0_10px_22px_rgba(47,125,246,0.24)]"
            >
              <AssistantIcon name="send" className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[0.6rem] font-medium text-[#9aa6bf]">
            AI estimates are based on your current usage and may change.
          </p>
        </section>
      </div>
    </main>
  );
}

function responseFor(prompt: string) {
  return (
    promptResponses[prompt] ??
    "I can help with usage, budget, device schedules, and depletion estimates. Based on your current data, water heating and evening device stacking are good places to start."
  );
}

function createUserMessage(text: string): ChatMessage {
  return { id: `user-${Date.now()}-${text}`, role: "user", text, time: "10:24 AM" };
}

function createAssistantMessage(text: string): ChatMessage {
  return { id: `assistant-${Date.now()}-${text}`, role: "assistant", text, time: "10:24 AM" };
}

function AssistantIcon({ name, className }: { name: string; className: string }) {
  const paths: Record<string, string> = {
    back: "m15 18-6-6 6-6",
    bot: "M12 8V5m-5 5h10a3 3 0 0 1 3 3v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a3 3 0 0 1 3-3Zm2 5h.01M10 15h.01",
    mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm7 9a7 7 0 0 1-14 0m7 7v3m-4 0h8",
    send: "m22 2-7 20-4-9-9-4 20-7Zm-11 11 11-11",
    chevronRight: "m9 18 6-6-6-6",
    calendar: "M5 4h14v16H5V4Zm0 5h14M8 2v4m8-4v4",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-4 11a2 2 0 0 1-4 0",
    trend: "M4 17 10 11l4 4 6-8M14 7h6v6",
  };

  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}
