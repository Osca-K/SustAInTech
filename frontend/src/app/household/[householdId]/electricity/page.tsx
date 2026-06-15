"use client";

import { FormEvent, ReactNode, use, useEffect, useRef, useState } from "react";

import { ElectricityCategoryDonutChart } from "@/components/electricity/ElectricityCategoryDonutChart";
import { ElectricityUsageComparisonChart } from "@/components/electricity/ElectricityUsageComparisonChart";
import { ResidentAlertCard } from "@/components/resident/ResidentAlertCard";
import { ResidentMetricCard } from "@/components/resident/ResidentMetricCard";
import { ResidentMetricStrip } from "@/components/resident/ResidentMetricStrip";
import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { ResidentSectionCard } from "@/components/resident/ResidentSectionCard";
import {
  ElectricityTopupHistoryItem,
  HouseholdElectricitySummary,
  RecommendationItem,
  createHouseholdElectricityTopup,
  getHouseholdElectricitySummary,
  getHouseholdRecommendations,
} from "@/lib/api";
import {
  ElectricityDevice,
  ElectricityUsageMode,
  buildElectricityCategoryUsage,
  buildElectricityDevices,
  buildElectricityUsageSeries,
} from "@/lib/electricityUsageSeries";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

type CheckState = "idle" | "checking" | "complete";

const emptySummary: HouseholdElectricitySummary = {
  household_id: "",
  total_spend: 0,
  total_units: 0,
  average_cost_per_kWh: 0,
  estimated_daily_spend: 0,
  estimated_daily_usage_kWh: 0,
  latest_balance_kWh: null,
  low_balance_warning: false,
  recent_topups: [],
};
const inputClass =
  "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
const electricityAssetBase = "/assets/resident/electricity";

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);
  const [summary, setSummary] = useState<HouseholdElectricitySummary>(emptySummary);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [usageMode, setUsageMode] = useState<ElectricityUsageMode>("week");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const checkTimerRef = useRef<number | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [balance, setBalance] = useState("");
  const [supplier, setSupplier] = useState("");
  const [tokenLast4, setTokenLast4] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getHouseholdElectricitySummary(householdId),
      getHouseholdRecommendations(householdId),
    ])
      .then(([nextSummary, recommendationResponse]) => {
        setSummary(nextSummary);
        setRecommendations(
          recommendationResponse.recommendations.filter(
            (item) => item.module === "electricity" || item.module === "combined",
          ),
        );
      })
      .catch(() => {
        setSummary({ ...emptySummary, household_id: householdId });
        setRecommendations([]);
      });
  }, [householdId]);

  useEffect(() => {
    return () => {
      if (checkTimerRef.current !== null) {
        window.clearTimeout(checkTimerRef.current);
      }
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountValue = Number(amount);
    const unitsValue = Number(units);
    const balanceValue = balance.trim() ? Number(balance) : null;

    if (!purchaseDate || Number.isNaN(amountValue) || Number.isNaN(unitsValue)) {
      setError("Enter a purchase date, amount paid, and units bought.");
      return;
    }
    if (
      amountValue < 0 ||
      unitsValue < 0 ||
      (balanceValue !== null && (Number.isNaN(balanceValue) || balanceValue < 0))
    ) {
      setError("Electricity values must be zero or greater.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await createHouseholdElectricityTopup(householdId, {
        purchase_date: purchaseDate,
        amount_zar: amountValue,
        units_kWh: unitsValue,
        meter_balance_kWh: balanceValue,
        supplier: supplier.trim() || null,
        token_reference_last4: tokenLast4.trim() ? tokenLast4.trim().slice(-4) : null,
        notes: notes.trim() || null,
      });
      setAmount("");
      setUnits("");
      setBalance("");
      setSupplier("");
      setTokenLast4("");
      setNotes("");
      setMessage("Electricity purchase saved.");
      setSummary(await getHouseholdElectricitySummary(householdId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Electricity purchase could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function runSystemCheck() {
    if (checkTimerRef.current !== null) {
      window.clearTimeout(checkTimerRef.current);
    }
    setCheckState("checking");
    checkTimerRef.current = window.setTimeout(() => {
      setCheckState("complete");
    }, 900);
  }

  const status = electricityStatus(summary);
  const usageSeries = buildElectricityUsageSeries({ summary, mode: usageMode });
  const daySeries = buildElectricityUsageSeries({ summary, mode: "day" });
  const devices = buildElectricityDevices(summary);
  const categoryUsage = buildElectricityCategoryUsage(devices);
  const anomaly = anomalyStatus(usageSeries.metadata.peakUsageKWh, usageSeries.metadata.dailyAverageKWh);
  const dailySnapshot = buildDailySnapshot(daySeries.points);

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="space-y-5 bg-[radial-gradient(circle_at_top,#fff7d6_0,#fffaf0_38%,#f8fafc_88%)] px-4 py-5">
        <ElectricityHeader />
        <ElectricityHero
          summary={summary}
          status={status}
          todayUsage={dailySnapshot.currentTotal}
          yesterdayUsage={dailySnapshot.previousTotal}
          peakRisk={anomaly}
        />

        <ResidentMetricStrip>
          <ResidentMetricCard
            label="Total spend"
            value={formatCurrency(summary.total_spend)}
            accent="text-amber-800"
          />
          <ResidentMetricCard label="Total units" value={formatKWh(summary.total_units)} />
          <ResidentMetricCard label="Avg cost/kWh" value={`R ${summary.average_cost_per_kWh.toFixed(3)}`} />
          <ResidentMetricCard
            label="Latest balance"
            value={summary.latest_balance_kWh === null ? "Not entered" : formatKWh(summary.latest_balance_kWh)}
          />
        </ResidentMetricStrip>

        {summary.low_balance_warning ? (
          <ResidentAlertCard tone="warning">
            Latest entered meter balance is below 10 kWh. Consider topping up soon.
          </ResidentAlertCard>
        ) : null}

        <UsageComparisonCard
          mode={usageMode}
          onModeChange={setUsageMode}
          points={usageSeries.points}
          metadata={usageSeries.metadata}
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <DevicesCard devices={devices} />
          <CategoryCard categories={categoryUsage} />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <AnomalyCard
            status={anomaly}
            peakTime={usageSeries.metadata.peakTimeLabel}
            peakUsage={usageSeries.metadata.peakUsageKWh}
            likelyCause={usageSeries.metadata.likelyHighConsumer}
          />
          <OverloadDetectionCard
            checkState={checkState}
            onRunCheck={runSystemCheck}
            reviewRecommended={anomaly !== "Normal" || summary.low_balance_warning}
          />
        </div>
        <EnergySavingTips recommendations={recommendations} />
        <RecentTopups topups={summary.recent_topups} />
        <TopupForm
          purchaseDate={purchaseDate}
          amount={amount}
          units={units}
          balance={balance}
          supplier={supplier}
          tokenLast4={tokenLast4}
          notes={notes}
          isSubmitting={isSubmitting}
          message={message}
          error={error}
          onSubmit={onSubmit}
          onPurchaseDateChange={setPurchaseDate}
          onAmountChange={setAmount}
          onUnitsChange={setUnits}
          onBalanceChange={setBalance}
          onSupplierChange={setSupplier}
          onTokenLast4Change={setTokenLast4}
          onNotesChange={setNotes}
        />
      </div>
    </ResidentMobileShell>
  );
}

function ElectricityHeader() {
  return (
    <header className="relative min-h-48 overflow-hidden rounded-[2rem] px-1 pb-4 pt-5">
      <AssetImage
        src={`${electricityAssetBase}/electricity-header-house.png`}
        alt=""
        className="absolute -right-14 top-0 h-48 w-[24rem] object-contain object-right-top opacity-95"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf0] via-[#fffaf0]/90 to-transparent" />
      <div className="relative max-w-60 pt-4">
        <p className="text-xs font-bold uppercase text-amber-700">Smart electricity</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          Electricity Usage
        </h1>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Track prepaid electricity, top-up patterns, and household energy habits.
        </p>
      </div>
    </header>
  );
}

function ElectricityHero({
  summary,
  status,
  todayUsage,
  yesterdayUsage,
  peakRisk,
}: {
  summary: HouseholdElectricitySummary;
  status: "Stable" | "Low balance" | "Track usage";
  todayUsage: number;
  yesterdayUsage: number;
  peakRisk: "Normal" | "Monitor" | "Unusual usage";
}) {
  const dailyGoal = 12;
  const changePercent =
    yesterdayUsage > 0 ? ((todayUsage - yesterdayUsage) / yesterdayUsage) * 100 : 0;
  const lowerThanYesterday = changePercent <= 0;
  const riskLabel = peakRisk === "Unusual usage" ? "High" : peakRisk === "Monitor" ? "Medium" : "Low";
  const riskScore = peakRisk === "Unusual usage" ? 72 : peakRisk === "Monitor" ? 42 : 18;

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-sky-500 via-sky-300 to-amber-300 p-5 text-white shadow-[0_22px_55px_rgba(14,116,144,0.22)]">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-700/20 via-transparent to-amber-500/20" />
      <AssetImage
        src={`${electricityAssetBase}/electricity-hero-bulb.png`}
        alt=""
        className="absolute inset-x-0 top-14 h-40 w-full object-cover opacity-70 mix-blend-screen"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-white/80">
              Prepaid Electricity
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Today Total Usage
            </h2>
          </div>
          <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {status}
          </span>
        </div>
        <p className="mt-4 text-6xl font-semibold tracking-tight">
          {todayUsage.toFixed(1)}
          <span className="ml-2 text-xl font-medium text-white/80">kWh</span>
        </p>
        <p className="mt-2 text-sm font-medium text-white/85">
          {Math.abs(changePercent).toFixed(0)}% {lowerThanYesterday ? "lower" : "higher"} than yesterday
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <div className="rounded-3xl border border-white/25 bg-white/18 p-4 backdrop-blur">
            <HeroRow label="Daily Goal" value={`${dailyGoal.toFixed(0)} kWh`} />
            <HeroRow label="Latest balance" value={summary.latest_balance_kWh === null ? "Not entered" : formatKWh(summary.latest_balance_kWh)} />
            <HeroRow label="Estimated daily usage" value={`${summary.estimated_daily_usage_kWh.toFixed(1)} kWh/day`} />
          </div>
          <div className="rounded-3xl border border-white/25 bg-white/18 p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-white/70">Live Status</p>
                <p className="mt-1 text-lg font-semibold">Normal</p>
                <p className="mt-1 text-sm text-white/80">All systems operational</p>
                <p className="mt-1 text-sm text-white/80">No overload detected</p>
                <p className="mt-1 text-sm text-white/80">Your home is stable.</p>
              </div>
              <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border border-white/30 bg-white/20 text-center backdrop-blur">
                <p className="text-xs text-white/75">Peak Risk</p>
                <p className="text-lg font-semibold">{riskLabel}</p>
                <p className="text-[11px] text-white/75">Score {riskScore}/100</p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-white/75">
          Based on resident-entered top-ups and balances, not live sensor monitoring.
        </p>
      </div>
    </section>
  );
}

function UsageComparisonCard({
  mode,
  onModeChange,
  points,
  metadata,
}: {
  mode: ElectricityUsageMode;
  onModeChange: (mode: ElectricityUsageMode) => void;
  points: ReturnType<typeof buildElectricityUsageSeries>["points"];
  metadata: ReturnType<typeof buildElectricityUsageSeries>["metadata"];
}) {
  return (
    <ResidentSectionCard className="shadow-[0_18px_45px_rgba(217,119,6,0.08)]">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-amber-700">
            {metadata.currentLabel} vs {metadata.previousLabel}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Electricity Usage
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Compare your current usage pattern with previous periods.
          </p>
        </div>
        <div className="flex shrink-0 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
          {(["day", "week", "month"] as ElectricityUsageMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onModeChange(item)}
              className={`rounded-full px-2.5 py-1 capitalize ${item === mode ? "bg-slate-950 text-white" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <ElectricityUsageComparisonChart data={points} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <InsightMetric label="Peak usage" value={formatKWh(metadata.peakUsageKWh)} />
        <InsightMetric label="Peak time" value={metadata.peakTimeLabel} />
        <InsightMetric label="Likely high consumer" value={metadata.likelyHighConsumer} />
        <InsightMetric label="Daily average" value={`${metadata.dailyAverageKWh.toFixed(1)} kWh/day`} />
      </div>
    </ResidentSectionCard>
  );
}

function DevicesCard({ devices }: { devices: ElectricityDevice[] }) {
  return (
    <ResidentSectionCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Your Devices</h2>
          <p className="mt-1 text-sm text-slate-600">
            Demo device profile for category breakdown.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400"
        >
          Add device
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {devices.map((device) => (
          <article key={device.name} className="rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center gap-3">
              <DeviceIcon category={device.category} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">{device.name}</p>
                <p className="mt-1 text-xs text-slate-500">{device.category}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-slate-950">{formatKWh(device.estimatedUsageKWh)}</p>
                <p className="mt-1 text-xs font-semibold text-amber-700">{device.status}</p>
              </div>
              <span className="text-slate-300">&gt;</span>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Device editing is coming soon. Current values are structured placeholders.
      </p>
    </ResidentSectionCard>
  );
}

function CategoryCard({
  categories,
}: {
  categories: ReturnType<typeof buildElectricityCategoryUsage>;
}) {
  return (
    <ResidentSectionCard>
      <h2 className="text-xl font-semibold text-slate-950">Usage by Category</h2>
      <p className="mt-1 text-sm text-slate-600">
        Estimated from the current household device profile.
      </p>
      <ElectricityCategoryDonutChart data={categories} />
      <div className="mt-2 space-y-2">
        {categories.map((item) => (
          <div key={item.category} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-slate-600">{item.category}</span>
            </div>
            <span className="shrink-0 font-semibold text-slate-950">
              {item.percent}% | {formatKWh(item.usageKWh)}
            </span>
          </div>
        ))}
      </div>
    </ResidentSectionCard>
  );
}

function AnomalyCard({
  status,
  peakTime,
  peakUsage,
  likelyCause,
}: {
  status: "Normal" | "Monitor" | "Unusual usage";
  peakTime: string;
  peakUsage: number;
  likelyCause: string;
}) {
  return (
    <ResidentSectionCard>
      <p className="text-xs font-bold uppercase text-amber-700">Anomaly Detection</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{status}</h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            {status === "Normal"
              ? "Your recent prepaid pattern is close to expected usage."
              : `Unusual usage detected around ${peakTime}.`}
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Review
        </span>
      </div>
      <button
        type="button"
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
      >
        View details
      </button>
      {status !== "Normal" ? (
        <dl className="mt-4 space-y-2 text-sm text-slate-600">
          <InfoRow label="Time detected" value={peakTime} />
          <InfoRow label="Usage spike" value={formatKWh(peakUsage)} />
          <InfoRow label="Possible cause" value={likelyCause} />
          <InfoRow label="Suggested check" value="Review evening appliance use." />
        </dl>
      ) : null}
    </ResidentSectionCard>
  );
}

function OverloadDetectionCard({
  checkState,
  onRunCheck,
  reviewRecommended,
}: {
  checkState: CheckState;
  onRunCheck: () => void;
  reviewRecommended: boolean;
}) {
  return (
    <ResidentSectionCard className="relative overflow-hidden">
      <AssetImage
        src={`${electricityAssetBase}/electricity-overload-shield.png`}
        alt=""
        className="absolute -right-2 top-2 h-28 w-28 object-contain opacity-90"
      />
      <AssetImage
        src={`${electricityAssetBase}/electricity-magnifier-check.png`}
        alt=""
        className="absolute right-16 top-20 h-16 w-16 object-contain opacity-80"
      />
      <div className="relative max-w-72">
        <p className="text-xs font-bold uppercase text-amber-700">Overload Detection</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">System check</h2>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Based on your recent top-up and usage pattern.
        </p>
      </div>
      <button
        type="button"
        onClick={onRunCheck}
        disabled={checkState === "checking"}
        className="mt-5 w-full rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {checkState === "checking" ? "Analysing electricity usage..." : "Run system check"}
      </button>
      {checkState === "complete" ? (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {reviewRecommended
            ? "Review recommended: usage appears unusually high during evening peak."
            : "No overload pattern detected."}
        </p>
      ) : null}
    </ResidentSectionCard>
  );
}

function EnergySavingTips({ recommendations }: { recommendations: RecommendationItem[] }) {
  const fallbackTips = [
    "Run heavy appliances outside evening peak.",
    "Switch off standby devices overnight.",
    "Use full laundry loads where possible.",
    "Check geyser or heater schedule.",
    "Track your next top-up to improve estimates.",
  ];
  const tips = recommendations.length
    ? recommendations.slice(0, 4).map((item) => item.message)
    : fallbackTips.slice(0, 4);

  return (
    <ResidentSectionCard>
      <h2 className="text-xl font-semibold text-slate-950">Energy Saving Tips</h2>
      <div className="mt-4 space-y-3">
        {tips.map((tip) => (
          <article key={tip} className="rounded-2xl bg-amber-50 p-4 text-sm leading-5 text-amber-950">
            {tip}
          </article>
        ))}
      </div>
    </ResidentSectionCard>
  );
}

function RecentTopups({ topups }: { topups: ElectricityTopupHistoryItem[] }) {
  return (
    <ResidentSectionCard>
      <h2 className="text-xl font-semibold text-slate-950">Recent top-ups</h2>
      <div className="mt-4 space-y-3">
        {topups.length ? (
          topups.map((topup) => (
            <article key={topup.topup_id} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-950">{topup.purchase_date}</p>
                <p className="font-semibold text-amber-800">{formatCurrency(topup.amount_zar)}</p>
              </div>
              <dl className="mt-3 space-y-2 text-slate-600">
                <InfoRow label="Units" value={formatKWh(topup.units_kWh)} />
                <InfoRow
                  label="Balance"
                  value={topup.meter_balance_kWh === null ? "Not entered" : formatKWh(topup.meter_balance_kWh)}
                />
                <InfoRow label="Supplier" value={topup.supplier ?? "Not entered"} />
              </dl>
            </article>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No electricity purchases have been saved yet.
          </p>
        )}
      </div>
    </ResidentSectionCard>
  );
}

function TopupForm({
  purchaseDate,
  amount,
  units,
  balance,
  supplier,
  tokenLast4,
  notes,
  isSubmitting,
  message,
  error,
  onSubmit,
  onPurchaseDateChange,
  onAmountChange,
  onUnitsChange,
  onBalanceChange,
  onSupplierChange,
  onTokenLast4Change,
  onNotesChange,
}: {
  purchaseDate: string;
  amount: string;
  units: string;
  balance: string;
  supplier: string;
  tokenLast4: string;
  notes: string;
  isSubmitting: boolean;
  message: string | null;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPurchaseDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onUnitsChange: (value: string) => void;
  onBalanceChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onTokenLast4Change: (value: string) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Add prepaid purchase</h2>
      <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Do not enter your full prepaid token number. Only the last 4 digits may be saved.
      </p>
      <Field label="Purchase date">
        <input
          type="date"
          value={purchaseDate}
          onChange={(event) => onPurchaseDateChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Amount paid (R)">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Units bought (kWh)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={units}
          onChange={(event) => onUnitsChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Current meter balance (optional)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={balance}
          onChange={(event) => onBalanceChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Supplier (optional)">
        <input
          type="text"
          value={supplier}
          onChange={(event) => onSupplierChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Token ref last 4 (optional)">
        <input
          type="text"
          maxLength={4}
          value={tokenLast4}
          onChange={(event) => onTokenLast4Change(event.target.value.slice(-4))}
          className={inputClass}
        />
      </Field>
      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={3}
          className={`${inputClass} py-2`}
        />
      </Field>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "Saving..." : "Save electricity purchase"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function HeroRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/20 py-2 last:border-b-0">
      <span className="text-white/75">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-amber-50 p-3">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">{value}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function DeviceIcon({ category }: { category: string }) {
  const path =
    category === "Lighting"
      ? "M12 3v2m0 14v2m7-9h2M3 12H1m15.36-6.36 1.42-1.42M6.22 17.78 4.8 19.2m12.98 0-1.42-1.42M6.22 6.22 4.8 4.8M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"
      : category === "Laundry"
        ? "M5 3h14v18H5V3Zm3 3h.01M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        : category === "Fridge"
          ? "M7 3h10v18H7V3Zm0 9h10M10 7h.01M10 15h.01"
          : "M13 2 5 13h6l-1 9 8-12h-6l1-8Z";

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d={path} />
      </svg>
    </span>
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

function electricityStatus(summary: HouseholdElectricitySummary) {
  if (!summary.recent_topups.length) {
    return "Track usage";
  }
  return summary.low_balance_warning ? "Low balance" : "Stable";
}

function anomalyStatus(peakUsage: number, dailyAverage: number) {
  if (peakUsage > dailyAverage * 0.85) {
    return "Unusual usage";
  }
  if (peakUsage > dailyAverage * 0.65) {
    return "Monitor";
  }
  return "Normal";
}

function buildDailySnapshot(points: { currentUsageKWh: number | null; previousUsageKWh: number | null }[]) {
  return points.reduce(
    (totals, point) => ({
      currentTotal: totals.currentTotal + (point.currentUsageKWh ?? 0),
      previousTotal: totals.previousTotal + (point.previousUsageKWh ?? 0),
    }),
    { currentTotal: 0, previousTotal: 0 },
  );
}

function formatCurrency(value: number) {
  return `R ${value.toFixed(2)}`;
}

function formatKWh(value: number) {
  return `${value.toFixed(1)} kWh`;
}
