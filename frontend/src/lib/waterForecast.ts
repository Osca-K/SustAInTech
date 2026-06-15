import { HouseholdMonthlyUsageItem, MeterSubmissionHistoryItem } from "@/lib/api";


export type WaterForecastPoint = {
  label: string;
  actualUsageKL: number | null;
  predictedUsageKL: number | null;
};

export type WaterForecastMetadata = {
  predictionSource: "baseline_placeholder" | "ai_forecast_model";
  confidenceLabel: "low" | "medium" | "high";
  generatedAt: string;
};

export type WaterForecastResult = {
  points: WaterForecastPoint[];
  metadata: WaterForecastMetadata;
};

export function buildWaterForecastSeries({
  monthlyUsage,
  submissions,
  range,
}: {
  monthlyUsage: HouseholdMonthlyUsageItem[];
  submissions: MeterSubmissionHistoryItem[];
  range: "7D" | "14D" | "1M";
}): WaterForecastResult {
  const monthlyPoints = monthlyUsage
    .slice(-4)
    .map((item, index, items) => {
      const previous = index > 0 ? items[index - 1].consumption_kL : item.consumption_kL;
      const trendFactor = previous > item.consumption_kL ? 0.97 : 1.04;
      return {
        label: shortMonthLabel(item.statement_month_label),
        actualUsageKL: round(item.consumption_kL),
        predictedUsageKL: round(item.consumption_kL * trendFactor),
      };
    });

  const submissionPoints = submissions
    .filter((item) => item.usage_since_previous_reading_kL !== null)
    .slice(0, range === "7D" ? 3 : range === "14D" ? 4 : 5)
    .reverse()
    .map((item, index) => {
      const actual = item.usage_since_previous_reading_kL ?? 0;
      return {
        label: `R${index + 1}`,
        actualUsageKL: round(actual),
        predictedUsageKL: round(actual * (1 + index * 0.015)),
      };
    });

  const points = monthlyPoints.length >= 2 ? monthlyPoints : submissionPoints;
  return {
    points: points.length ? points : fallbackPoints(range),
    metadata: {
      predictionSource: "baseline_placeholder",
      confidenceLabel: monthlyUsage.length >= 3 || submissions.length >= 3 ? "medium" : "low",
      generatedAt: new Date().toISOString(),
    },
  };
}

function fallbackPoints(range: "7D" | "14D" | "1M"): WaterForecastPoint[] {
  const labels = range === "7D" ? ["Day 1", "Day 3", "Day 5", "Day 7"] : range === "14D" ? ["W1", "W2"] : ["W1", "W2", "W3", "W4"];
  return labels.map((label, index) => {
    const baseline = 4.8 + index * 0.2;
    return {
      label,
      actualUsageKL: index === labels.length - 1 ? null : round(baseline),
      predictedUsageKL: round(baseline * 1.04),
    };
  });
}

function shortMonthLabel(value: string) {
  return value.split(" ")[0]?.slice(0, 3) || value;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
