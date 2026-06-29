import { RecyclingDashboard } from "@/components/recycling/RecyclingDashboard";
import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type RecyclingPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

export default async function HouseholdRecyclingPage({ params }: RecyclingPageProps) {
  const { householdId } = await params;

  return (
    <ResidentMobileShell householdId={householdId}>
      <RecyclingDashboard />
    </ResidentMobileShell>
  );
}
