import Link from "next/link";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { WaterUsageForecastChart } from "@/components/water/WaterUsageForecastChart";
import {
  HouseholdDetails,
  HouseholdMonthlyUsageItem,
  HouseholdTrackingSummary,
  MeterSubmissionHistoryItem,
  RecommendationItem,
  getHousehold,
  getHouseholdMeterSubmissions,
  getHouseholdMeterTrackingSummary,
  getHouseholdMonthlyUsage,
  getHouseholdRecommendations,
} from "@/lib/api";
import { buildWaterForecastSeries } from "@/lib/waterForecast";


type WaterPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

type WaterHealth = {
  usageTrend: "Stable" | "Rising" | "Falling";
  leakageRisk: "Low risk" | "Monitor" | "Possible leak";
  readingStatus: "Up to date" | "Upload due" | "Review needed";
};

export default async function HouseholdWaterPage({ params }: WaterPageProps) {
  const { householdId } = await params;
  const [household, monthlyUsage, submissions, trackingSummary, recommendationResponse] =
    await Promise.all([
      getHousehold(householdId),
      getHouseholdMonthlyUsage(householdId),
      getHouseholdMeterSubmissions(householdId),
      getHouseholdMeterTrackingSummary(householdId),
      getHouseholdRecommendations(householdId),
    ]);

  const orderedUsage = [...monthlyUsage].sort((left, right) =>
    left.statement_month.localeCompare(right.statement_month),
  );
  const latestBill = orderedUsage.at(-1);
  const previousBill = orderedUsage.at(-2);
  const latestSubmission = submissions[0];
  const waterRecommendations = recommendationResponse.recommendations
    .filter((item) => item.module === "water" || item.module === "combined")
    .slice(0, 3);
  const forecast = buildWaterForecastSeries({
    monthlyUsage: orderedUsage,
    submissions,
    range: "1M",
  });
  const currentUsage = latestBill?.consumption_kL ?? trackingSummary.usage_since_previous_reading_kL;
  const dailyAverage =
    latestBill?.average_daily_consumption_kL ?? trackingSummary.estimated_daily_usage_kL;
  const predictedUsage = latestPredicted(forecast.points);
  const estimatedCost = estimateWaterCost({
    usage: predictedUsage ?? currentUsage,
    latestBill,
  });
  const periodAverage = averageForecast(forecast.points);
  const periodChange = usageChangePercent(latestBill, previousBill);
  const status = waterStatus({
    recommendations: waterRecommendations,
    currentUsage,
    predictedUsage,
  });
  const health = buildHealth({
    latestBill,
    latestSubmission,
    trackingSummary,
    currentUsage,
    predictedUsage,
    recommendations: waterRecommendations,
  });

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#bae6fd_0,#ecfeff_34%,#f8fafc_76%)] px-4 py-5">
        <div className="space-y-5">
          <WaterHero
            household={household}
            currentUsage={currentUsage}
            predictedUsage={predictedUsage}
            status={status}
            lastUpdated={latestSubmission?.submitted_at ?? latestBill?.statement_month_label}
          />

          <MetricStrip
            dailyAverage={dailyAverage}
            predictedUsage={predictedUsage}
            currentUsage={currentUsage}
            estimatedCost={estimatedCost}
          />

          <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,118,110,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-teal-700">
                  Actual vs predicted
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Water Usage
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Actual usage compared with predicted household usage.
                </p>
              </div>
              <RangePills active="1M" />
            </div>
            <div className="mt-5">
              <WaterUsageForecastChart data={forecast.points} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <InsightMetric label="Average this period" value={formatKL(periodAverage)} />
              <InsightMetric label="vs previous period" value={formatPercent(periodChange)} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Prediction placeholder based on recent household pattern.
              Confidence: {forecast.metadata.confidenceLabel}.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3">
            <MiniCard label="Usage trend" value={health.usageTrend} />
            <MiniCard label="Leakage risk" value={health.leakageRisk} />
            <MiniCard label="Reading status" value={health.readingStatus} />
          </section>

          <LeakageStatusCard risk={health.leakageRisk} />
          <SustaintechInsightCard
            status={status}
            health={health}
            recommendations={waterRecommendations}
            householdId={householdId}
          />
          <UploadMeterCard householdId={householdId} latestSubmission={latestSubmission} />
          <QuickActions householdId={householdId} />
          <KeyMetrics
            currentUsage={currentUsage}
            predictedUsage={predictedUsage}
            dailyAverage={dailyAverage}
            latestReading={trackingSummary.latest_reading_kL}
          />
          <RecentReadings householdId={householdId} submissions={submissions.slice(0, 4)} />
          <MunicipalBillSnapshot latestBill={latestBill} />
          <WaterSuggestions recommendations={waterRecommendations} />
        </div>
      </div>
    </ResidentMobileShell>
  );
}

function WaterHero({
  household,
  currentUsage,
  predictedUsage,
  status,
  lastUpdated,
}: {
  household: HouseholdDetails;
  currentUsage: number | null | undefined;
  predictedUsage: number | null;
  status: "Stable" | "Monitor" | "High usage";
  lastUpdated: string | undefined;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-sky-200 via-cyan-100 to-white p-6 shadow-[0_18px_45px_rgba(14,116,144,0.12)]">
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/35" />
      <div className="absolute right-6 top-10 h-20 w-20 rounded-full border border-white/70 bg-cyan-100/50" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              Water Usage
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Stay ahead of possible leaks.
            </h1>
            <p className="mt-2 max-w-64 text-sm leading-5 text-slate-700">
              Track your household water usage with a simple view of today,
              this month, and what the system expects next.
            </p>
          </div>
          <span className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800">
            {status}
          </span>
        </div>

        <div className="mt-7">
          <p className="text-sm font-medium text-slate-600">Current usage</p>
          <p className="mt-1 text-6xl font-semibold tracking-tight text-slate-950">
            {formatNumber(currentUsage)}
            <span className="ml-2 text-xl font-medium text-slate-600">kL</span>
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-white/70 bg-white/65 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-600">Predicted this period</span>
            <span className="font-semibold text-slate-950">
              {formatKL(predictedUsage)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-600">Last updated</span>
            <span className="text-right font-semibold text-slate-950">
              {lastUpdated ?? "No reading yet"}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {household.meter_number ? `Meter ${household.meter_number}` : "Meter details not available"}
        </p>
      </div>
    </section>
  );
}

function MetricStrip({
  dailyAverage,
  predictedUsage,
  currentUsage,
  estimatedCost,
}: {
  dailyAverage: number | null | undefined;
  predictedUsage: number | null;
  currentUsage: number | null | undefined;
  estimatedCost: number | null;
}) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <MetricTile label="Today" value={formatKL(dailyAverage)} />
      <MetricTile label="Predicted" value={formatKL(predictedUsage)} />
      <MetricTile label="This month" value={formatKL(currentUsage)} />
      <MetricTile label="Est. water cost" value={formatCurrency(estimatedCost)} />
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function RangePills({ active }: { active: "7D" | "14D" | "1M" }) {
  return (
    <div className="flex shrink-0 rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
      {["7D", "14D", "1M"].map((item) => (
        <span
          key={item}
          className={`rounded-full px-2.5 py-1 ${item === active ? "bg-slate-950 text-white shadow-sm" : ""}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-cyan-50/70 p-3">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase leading-4 text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function LeakageStatusCard({ risk }: { risk: WaterHealth["leakageRisk"] }) {
  const message =
    risk === "Possible leak"
      ? "Your recent pattern is higher than expected. Check common leak points before the next reading."
      : risk === "Monitor"
        ? "Your recent pattern is slightly above expected usage. Keep an eye on taps, toilets, and outdoor points."
        : "Your recent water pattern is close to expected usage.";
  const checklist = [
    "Check if the toilet flusher is stuck",
    "Check taps are fully closed",
    "Inspect outdoor or garden tap",
    "Look for dripping kitchen or bathroom taps",
    "Check washing machine hose connections",
  ];

  return (
    <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-teal-700">Leakage Status</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            {risk}
          </h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">{message}</p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-teal-800">
          Check
        </span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {checklist.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SustaintechInsightCard({
  status,
  health,
  recommendations,
  householdId,
}: {
  status: "Stable" | "Monitor" | "High usage";
  health: WaterHealth;
  recommendations: RecommendationItem[];
  householdId: string;
}) {
  const recommendation = recommendations[0];
  const message =
    recommendation?.message ??
    (status === "Stable"
      ? "Your water usage is tracking close to the expected household pattern."
      : "Your water pattern needs a closer look. Update your next meter reading to improve confidence.");

  return (
    <section className="rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-slate-950 to-teal-950 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
      <p className="text-xs font-bold uppercase text-cyan-200">SustAInTech Insight</p>
      <h2 className="mt-2 text-xl font-semibold">
        {recommendation?.title ?? `${health.usageTrend} water pattern`}
      </h2>
      <p className="mt-3 text-sm leading-6 text-cyan-50/85">{message}</p>
      <Link
        href={`/household/${householdId}/analytics`}
        className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
      >
        View insight
      </Link>
    </section>
  );
}

function UploadMeterCard({
  householdId,
  latestSubmission,
}: {
  householdId: string;
  latestSubmission: MeterSubmissionHistoryItem | undefined;
}) {
  return (
    <section className="rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-[0_16px_40px_rgba(14,165,233,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-teal-700">Quick update</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Upload Water Meter
          </h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            Take a clear photo of your meter to update household tracking.
          </p>
        </div>
        <span className="rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-teal-800">
          Photo
        </span>
      </div>
      <Link
        href={`/household/${householdId}/meter-upload`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Upload meter photo
      </Link>
      <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p>Make sure the meter number and reading are visible.</p>
        <p className="mt-1">
          Last upload: {latestSubmission?.submitted_at ?? "No upload yet"}
        </p>
        <p>
          Status: {latestSubmission ? labelize(latestSubmission.validation_status) : "No upload yet"}
        </p>
      </div>
    </section>
  );
}

function QuickActions({ householdId }: { householdId: string }) {
  const actions = [
    { label: "Upload meter", href: `/household/${householdId}/meter-upload` },
    { label: "View history", href: `/household/${householdId}/water#recent-readings` },
    { label: "Leak tips", href: `/household/${householdId}/water#leakage-tips` },
    { label: "Saving tips", href: `/household/${householdId}/water#water-tips` },
  ];

  return (
    <section className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="rounded-3xl border border-white/80 bg-white/90 p-4 text-sm font-semibold text-slate-900 shadow-sm"
        >
          {action.label}
        </Link>
      ))}
    </section>
  );
}

function KeyMetrics({
  currentUsage,
  predictedUsage,
  dailyAverage,
  latestReading,
}: {
  currentUsage: number | null | undefined;
  predictedUsage: number | null;
  dailyAverage: number | null | undefined;
  latestReading: number | null;
}) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <MetricTile label="Current usage" value={formatKL(currentUsage)} />
      <MetricTile label="Predicted usage" value={formatKL(predictedUsage)} />
      <MetricTile label="Daily average" value={formatKL(dailyAverage)} />
      <MetricTile
        label="Latest reading"
        value={latestReading === null ? "No reading yet" : formatKL(latestReading)}
      />
    </section>
  );
}

function RecentReadings({
  householdId,
  submissions,
}: {
  householdId: string;
  submissions: MeterSubmissionHistoryItem[];
}) {
  return (
    <section
      id="recent-readings"
      className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-950">Recent readings</h2>
      {submissions.length ? (
        <div className="mt-4 space-y-3">
          {submissions.map((item) => (
            <article key={item.submission_id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.submitted_at}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Reading: {formatKL(item.submitted_reading_kL)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Usage since previous: {formatKL(item.usage_since_previous_reading_kL)}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {labelize(item.validation_status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-600">No household meter readings submitted yet.</p>
          <Link
            href={`/household/${householdId}/meter-upload`}
            className="mt-4 inline-flex rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Upload first reading
          </Link>
        </div>
      )}
    </section>
  );
}

function MunicipalBillSnapshot({
  latestBill,
}: {
  latestBill: HouseholdMonthlyUsageItem | undefined;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">Municipal Water Bill</h2>
      {latestBill ? (
        <dl className="mt-4 space-y-3 text-sm">
          <BillRow label="Statement month" value={latestBill.statement_month_label} />
          <BillRow label="Usage" value={formatKL(latestBill.consumption_kL)} />
          <BillRow label="Water charge" value={formatCurrency(latestBill.water_total_including_vat)} />
          <BillRow label="Due date" value={latestBill.due_date} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No municipal statement available yet.</p>
      )}
    </section>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function WaterSuggestions({ recommendations }: { recommendations: RecommendationItem[] }) {
  return (
    <section
      id="water-tips"
      className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-slate-950">Water-saving tips</h2>
      {recommendations.length ? (
        <div className="mt-4 space-y-3">
          {recommendations.map((item) => (
            <article key={item.recommendation_id} className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm leading-5 text-slate-600">
          <p>Your water usage looks normal based on available data.</p>
          <p>Upload your next meter photo in a few days to improve tracking accuracy.</p>
        </div>
      )}
      <div id="leakage-tips" className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        Check taps and toilet cisterns if usage keeps rising.
      </div>
    </section>
  );
}

function buildHealth({
  latestBill,
  latestSubmission,
  trackingSummary,
  currentUsage,
  predictedUsage,
  recommendations,
}: {
  latestBill: HouseholdMonthlyUsageItem | undefined;
  latestSubmission: MeterSubmissionHistoryItem | undefined;
  trackingSummary: HouseholdTrackingSummary;
  currentUsage: number | null | undefined;
  predictedUsage: number | null;
  recommendations: RecommendationItem[];
}): WaterHealth {
  const reviewNeeded =
    latestSubmission?.validation_status === "review_required" ||
    trackingSummary.review_required_count > 0;
  const highUsage = recommendations.some((item) => item.severity === "high");
  const rising =
    currentUsage !== null &&
    currentUsage !== undefined &&
    predictedUsage !== null &&
    currentUsage > predictedUsage * 1.08;
  const falling =
    latestBill !== undefined &&
    predictedUsage !== null &&
    latestBill.consumption_kL < predictedUsage * 0.9;
  const uploadDue = !latestSubmission;

  return {
    usageTrend: rising ? "Rising" : falling ? "Falling" : "Stable",
    leakageRisk: highUsage ? "Possible leak" : reviewNeeded || rising ? "Monitor" : "Low risk",
    readingStatus: reviewNeeded ? "Review needed" : uploadDue ? "Upload due" : "Up to date",
  };
}

function waterStatus({
  recommendations,
  currentUsage,
  predictedUsage,
}: {
  recommendations: RecommendationItem[];
  currentUsage: number | null | undefined;
  predictedUsage: number | null;
}): "Stable" | "Monitor" | "High usage" {
  if (recommendations.some((item) => item.severity === "high")) {
    return "High usage";
  }
  if (
    currentUsage !== null &&
    currentUsage !== undefined &&
    predictedUsage !== null &&
    currentUsage > predictedUsage * 1.08
  ) {
    return "Monitor";
  }
  return "Stable";
}

function latestPredicted(points: { predictedUsageKL: number | null }[]) {
  return [...points].reverse().find((point) => point.predictedUsageKL !== null)?.predictedUsageKL ?? null;
}

function averageForecast(points: { actualUsageKL: number | null }[]) {
  const values = points
    .map((point) => point.actualUsageKL)
    .filter((value): value is number => value !== null);
  if (!values.length) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function usageChangePercent(
  latestBill: HouseholdMonthlyUsageItem | undefined,
  previousBill: HouseholdMonthlyUsageItem | undefined,
) {
  if (!latestBill || !previousBill || previousBill.consumption_kL === 0) {
    return null;
  }
  return ((latestBill.consumption_kL - previousBill.consumption_kL) / previousBill.consumption_kL) * 100;
}

function estimateWaterCost({
  usage,
  latestBill,
}: {
  usage: number | null | undefined;
  latestBill: HouseholdMonthlyUsageItem | undefined;
}) {
  if (usage === null || usage === undefined) {
    return null;
  }
  if (latestBill && latestBill.consumption_kL > 0) {
    return usage * (latestBill.water_total_including_vat / latestBill.consumption_kL);
  }
  return usage * 22.5;
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "0.0" : value.toFixed(1);
}

function formatKL(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${value.toFixed(1)} kL`;
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `R ${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
