import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";
import { ResidentPageHeader } from "@/components/resident/ResidentPageHeader";
import { ResidentSectionCard } from "@/components/resident/ResidentSectionCard";


type AnalyticsPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

export default async function HouseholdAnalyticsPage({ params }: AnalyticsPageProps) {
  const { householdId } = await params;

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="space-y-5 bg-[radial-gradient(circle_at_top,#ddd6fe_0,#f5f3ff_42%,#f8fafc_78%)] px-4 py-5">
        <ResidentPageHeader
          eyebrow="Analytics"
          title="Household Insights"
          subtitle="Ask questions about your household water, electricity, and recycling activity."
          accent="from-violet-100 via-white to-slate-50"
        />

        <ResidentSectionCard>
          <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
            SustAInTech insight
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Your assistant is getting ready
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            A future assistant will help explain your household resource patterns.
          </p>
        </ResidentSectionCard>

        <ResidentSectionCard>
          <h2 className="text-lg font-semibold text-slate-950">
            Ask SustAInTech
          </h2>
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <input
              aria-label="Ask about your household usage"
              disabled
              placeholder="Ask about your household usage..."
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-500"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Why did my usage rise?",
              "How can I save this week?",
              "What should I check first?",
            ].map((question) => (
              <span
                key={question}
                className="rounded-full border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800"
              >
                {question}
              </span>
            ))}
          </div>
        </ResidentSectionCard>
      </div>
    </ResidentMobileShell>
  );
}
