import { WaterUsageInsightItem } from "@/lib/api";

export type UsageStatus = {
  label: "Stable" | "Monitor usage" | "Review recommended";
  className: string;
};

export function residentUsageStatus(
  insights: WaterUsageInsightItem[],
): UsageStatus {
  if (insights.some((insight) => insight.severity === "high")) {
    return {
      label: "Review recommended",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (insights.some((insight) => insight.severity === "medium")) {
    return {
      label: "Monitor usage",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  return {
    label: "Stable",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export function residentInsightSummary(insight: WaterUsageInsightItem) {
  if (insight.insight_type === "sudden_usage_spike") {
    return "Your water usage increased significantly compared with the previous month.";
  }
  if (insight.insight_type === "sustained_high_usage") {
    return "Your usage has remained high for more than one billing cycle.";
  }
  if (insight.insight_type === "high_current_usage") {
    return "Your latest water usage is higher than expected for this demo threshold.";
  }
  return "Your water usage increased faster than usual compared with the previous month.";
}

export function residentRecommendedStep(insight: WaterUsageInsightItem) {
  if (insight.severity === "high") {
    return "Check taps, toilets, and visible pipes for leaks. Review whether household occupancy or water use changed recently.";
  }
  return "Monitor your meter reading over the next few days and compare it with your normal household activity.";
}
