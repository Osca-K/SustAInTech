import Link from "next/link";
import { notFound } from "next/navigation";

import { RecentMeterTrackingChart } from "@/components/household/RecentMeterTrackingChart";
import { ResidentUsageChart } from "@/components/household/ResidentUsageChart";
import { HouseholdRecommendationsPanel } from "@/components/recommendations/HouseholdRecommendationsPanel";
import { ResidentActionTile } from "@/components/resident/ResidentActionTile";
import { ResidentHeroCard } from "@/components/resident/ResidentHeroCard";
import { ResidentMetricCard } from "@/components/resident/ResidentMetricCard";
import { ResidentMetricStrip } from "@/components/resident/ResidentMetricStrip";
import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { ResidentSectionCard } from "@/components/resident/ResidentSectionCard";
import {
  ApiError,
  getHousehold,
  getHouseholdInsights,
  getHouseholdRecommendations,
  getHouseholdMeterSubmissions,
  getHouseholdMeterTrackingSummary,
  getHouseholdMonthlyUsage,
  HouseholdTrackingSummary,
  HouseholdDetails,
  HouseholdMonthlyUsageItem,
  MeterSubmissionHistoryItem,
  RecommendationItem,
  WaterUsageInsightItem,
} from "@/lib/api";
import {
  residentInsightSummary,
  residentRecommendedStep,
  residentUsageStatus,
} from "@/lib/householdPortal";

type ResidentDashboardPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

function firstName(customerName: string) {
  return customerName.split(" ")[0] || customerName;
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `R ${value.toFixed(2)}`;
}

function formatConsumption(value: number | null | undefined) {
  return value === null || value === undefined ? "Not available" : `${value.toFixed(1)} kL`;
}

function usageStats(history: HouseholdMonthlyUsageItem[]) {
  const latest = history.at(-1);
  const total = history.reduce((sum, item) => sum + item.consumption_kL, 0);
  return {
    latest,
    averageUsage: history.length ? total / history.length : null,
  };
}

export default async function ResidentDashboardPage({
  params,
}: ResidentDashboardPageProps) {
  const { householdId } = await params;
  let household: HouseholdDetails;
  let monthlyUsage: HouseholdMonthlyUsageItem[];
  let insights: WaterUsageInsightItem[];
  let trackingSummary: HouseholdTrackingSummary;
  let meterSubmissions: MeterSubmissionHistoryItem[];
  let recommendations: RecommendationItem[];

  try {
    [
      household,
      monthlyUsage,
      insights,
      trackingSummary,
      meterSubmissions,
      recommendations,
    ] = await Promise.all([
      getHousehold(householdId),
      getHouseholdMonthlyUsage(householdId),
      getHouseholdInsights(householdId),
      getHouseholdMeterTrackingSummary(householdId),
      getHouseholdMeterSubmissions(householdId),
      getHouseholdRecommendations(householdId).then((response) => response.recommendations),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const history = [...monthlyUsage].sort((left, right) =>
    left.statement_month.localeCompare(right.statement_month),
  );
  const stats = usageStats(history);

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="space-y-5 bg-[radial-gradient(circle_at_top,#d1fae5_0,#f8fafc_58%)] px-4 py-5">
        <ResidentHeroCard accent="from-emerald-100 via-white to-cyan-50">
          <Link
            href="/household"
            className="text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            Switch household
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Welcome back, {firstName(household.customer_name)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Here is your latest household water-usage summary.
          </p>
        </ResidentHeroCard>

        <ResidentMetricStrip>
          <ResidentMetricCard
            label="Latest water usage"
            value={formatConsumption(stats.latest?.consumption_kL)}
          />
          <ResidentMetricCard
            label="Average monthly usage"
            value={formatConsumption(stats.averageUsage)}
          />
          <ResidentMetricCard
            label="Latest municipal bill"
            value={formatCurrency(stats.latest?.total_due)}
          />
          <ResidentMetricCard
            label="Meter number"
            value={household.meter_number ?? "Not available"}
          />
        </ResidentMetricStrip>

        <HouseholdRecommendationsPanel recommendations={recommendations} />

        <div className="space-y-5">
          <ResidentUsageChart data={history} />
          <LatestBillCard latest={stats.latest} />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <ResidentInsightsCard insights={insights} />
          <MeterUploadCard householdId={householdId} />
          <WasteSortingCard householdId={householdId} />
          <ElectricityTrackingCard householdId={householdId} />
        </div>

        <ResidentTrackingSection
          summary={trackingSummary}
          submissions={meterSubmissions}
        />
      </div>
    </ResidentMobileShell>
  );
}

function LatestBillCard({ latest }: { latest: HouseholdMonthlyUsageItem | undefined }) {
  return (
    <ResidentSectionCard>
      <h2 className="text-lg font-semibold text-slate-950">
        Latest Municipal Statement
      </h2>
      {latest ? (
        <dl className="mt-4 divide-y divide-slate-100 text-sm">
          <BillRow label="Statement month" value={latest.statement_month_label} />
          <BillRow label="Water usage" value={formatConsumption(latest.consumption_kL)} />
          <BillRow
            label="Water total"
            value={formatCurrency(latest.water_total_including_vat)}
          />
          <BillRow label="Municipal total due" value={formatCurrency(latest.total_due)} />
          <BillRow label="Due date" value={latest.due_date} />
          <BillRow label="Invoice number" value={latest.invoice_number} />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          No municipal statement history is available yet.
        </p>
      )}
      <p className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
        Your municipal total may include water, sanitation, property rates, and
        refuse charges.
      </p>
    </ResidentSectionCard>
  );
}

function BillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ResidentInsightsCard({
  insights,
}: {
  insights: WaterUsageInsightItem[];
}) {
  const status = residentUsageStatus(insights);

  return (
    <ResidentSectionCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Usage Insights</h2>
          <p className="mt-1 text-sm text-slate-500">
            Helpful guidance based on your monthly municipal readings.
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {insights.length ? (
        <div className="mt-4 space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.insight_id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {residentInsightSummary(insight)}
              </p>
              <p className="mt-3 text-xs font-medium uppercase text-slate-500">
                Recommended next step
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {residentRecommendedStep(insight)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Your recent water usage appears stable.
        </p>
      )}
    </ResidentSectionCard>
  );
}

function MeterUploadCard({ householdId }: { householdId: string }) {
  return (
    <ResidentActionTile
      href={`/household/${householdId}/meter-upload`}
      title="Track Daily Water Usage"
      description="Upload a recent meter photo to monitor consumption between statements."
      accent="text-teal-800"
    />
  );
}

function WasteSortingCard({ householdId }: { householdId: string }) {
  return (
    <ResidentActionTile
      href={`/household/${householdId}/waste`}
      title="Waste Sorting Assistant"
      description="Check whether an item should be recycled, composted, donated, or handled safely."
      accent="text-emerald-800"
    />
  );
}

function ElectricityTrackingCard({ householdId }: { householdId: string }) {
  return (
    <ResidentActionTile
      href={`/household/${householdId}/electricity`}
      title="Prepaid Electricity Tracker"
      description="Record token purchases and monitor estimated electricity usage."
      accent="text-amber-800"
    />
  );
}

function ResidentTrackingSection({
  summary,
  submissions,
}: {
  summary: HouseholdTrackingSummary;
  submissions: MeterSubmissionHistoryItem[];
}) {
  return (
    <section className="space-y-6">
      <ResidentSectionCard>
        <h2 className="text-lg font-semibold text-slate-950">
          Recent Water Tracking
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryMini label="Latest meter reading" value={formatConsumption(summary.latest_reading_kL)} />
          <SummaryMini label="Latest upload date" value={summary.latest_submission_at ?? "No uploads yet"} />
          <SummaryMini label="Usage since previous reading" value={formatConsumption(summary.usage_since_previous_reading_kL)} />
          <SummaryMini label="Estimated daily usage" value={formatConsumption(summary.estimated_daily_usage_kL)} />
          <SummaryMini label="Validation status" value={submissions[0]?.validation_status ?? "No submissions"} />
        </div>
      </ResidentSectionCard>
      <RecentMeterTrackingChart submissions={submissions} />
      <ResidentSectionCard>
        <h2 className="text-lg font-semibold text-slate-950">Meter reading history</h2>
        <div className="mt-4 space-y-3">
          {submissions.length ? (
            submissions.map((submission) => (
              <article key={submission.submission_id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-950">{submission.submitted_at}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {submission.validation_status}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-slate-600">
                  <CompactRow label="Meter reading" value={formatConsumption(submission.submitted_reading_kL)} />
                  <CompactRow label="Usage since previous" value={formatConsumption(submission.usage_since_previous_reading_kL)} />
                  <CompactRow label="Estimated daily usage" value={formatConsumption(submission.estimated_daily_usage_kL)} />
                </dl>
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No household meter photos have been submitted yet.
            </p>
          )}
        </div>
      </ResidentSectionCard>
    </section>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
