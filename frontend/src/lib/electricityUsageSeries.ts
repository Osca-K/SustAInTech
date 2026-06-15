import { HouseholdElectricitySummary } from "@/lib/api";


export type ElectricityUsageMode = "day" | "week" | "month";

export type ElectricityUsagePoint = {
  label: string;
  currentUsageKWh: number | null;
  previousUsageKWh: number | null;
};

export type ElectricityUsageMetadata = {
  mode: ElectricityUsageMode;
  currentLabel: string;
  previousLabel: string;
  peakUsageKWh: number;
  peakTimeLabel: string;
  dailyAverageKWh: number;
  likelyHighConsumer: string;
};

export type ElectricityUsageSeriesResult = {
  points: ElectricityUsagePoint[];
  metadata: ElectricityUsageMetadata;
};

export type ElectricityDevice = {
  name: string;
  category: string;
  estimatedUsageKWh: number;
  status: "Normal" | "Monitor" | "High use";
};

export type ElectricityCategoryUsage = {
  category: string;
  usageKWh: number;
  percent: number;
  color: string;
};

const dayLabels = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthLabels = ["W1", "W2", "W3", "W4"];

const dayMultipliers = [0.42, 0.3, 0.36, 0.44, 0.78, 0.56];
const weekMultipliers = [0.9, 0.96, 1.04, 0.98, 1.1, 1.18, 1.06];
const monthMultipliers = [6.4, 7.1, 6.8, 7.5];

const categoryColors = ["#f59e0b", "#facc15", "#38bdf8", "#84cc16", "#a78bfa", "#94a3b8"];

export function buildElectricityUsageSeries({
  summary,
  mode,
}: {
  summary: HouseholdElectricitySummary;
  mode: ElectricityUsageMode;
}): ElectricityUsageSeriesResult {
  const dailyAverage = deriveDailyAverage(summary);
  const labels = mode === "day" ? dayLabels : mode === "week" ? weekLabels : monthLabels;
  const points = labels.map((label, index) => {
    const multiplier =
      mode === "day"
        ? dayMultipliers[index]
        : mode === "week"
          ? weekMultipliers[index]
          : monthMultipliers[index];
    const currentBase = mode === "month" ? dailyAverage : dailyAverage / (mode === "day" ? 4.8 : 1);
    const current = currentBase * multiplier;
    const previous = current * (index % 2 === 0 ? 0.92 : 1.08);
    return {
      label,
      currentUsageKWh: round(current),
      previousUsageKWh: round(previous),
    };
  });
  const peak = points.reduce(
    (currentPeak, point) =>
      (point.currentUsageKWh ?? 0) > currentPeak.value
        ? { label: point.label, value: point.currentUsageKWh ?? 0 }
        : currentPeak,
    { label: points[0]?.label ?? "Evening", value: 0 },
  );

  return {
    points,
    metadata: {
      mode,
      currentLabel: mode === "day" ? "Today" : mode === "week" ? "This week" : "This month",
      previousLabel: mode === "day" ? "Yesterday" : mode === "week" ? "Last week" : "Last month",
      peakUsageKWh: round(peak.value),
      peakTimeLabel: peak.label,
      dailyAverageKWh: round(dailyAverage),
      likelyHighConsumer: likelyHighConsumer(peak.label, mode),
    },
  };
}

export function buildElectricityDevices(summary: HouseholdElectricitySummary): ElectricityDevice[] {
  const dailyAverage = deriveDailyAverage(summary);
  const total = Math.max(dailyAverage, 7.5);
  return [
    {
      name: "Water Heater",
      category: "Heating / Geyser",
      estimatedUsageKWh: round(total * 0.34),
      status: total > 11 ? "Monitor" : "Normal",
    },
    {
      name: "Fridge",
      category: "Fridge",
      estimatedUsageKWh: round(total * 0.16),
      status: "Normal",
    },
    {
      name: "Washing Machine",
      category: "Laundry",
      estimatedUsageKWh: round(total * 0.12),
      status: "Normal",
    },
    {
      name: "Lighting",
      category: "Lighting",
      estimatedUsageKWh: round(total * 0.1),
      status: "Normal",
    },
    {
      name: "Kitchen Appliances",
      category: "Kitchen",
      estimatedUsageKWh: round(total * 0.18),
      status: total > 13 ? "High use" : "Normal",
    },
    {
      name: "Other Loads",
      category: "Other",
      estimatedUsageKWh: round(total * 0.1),
      status: "Normal",
    },
  ];
}

export function buildElectricityCategoryUsage(
  devices: ElectricityDevice[],
): ElectricityCategoryUsage[] {
  const totals = devices.reduce<Record<string, number>>((accumulator, device) => {
    accumulator[device.category] = (accumulator[device.category] ?? 0) + device.estimatedUsageKWh;
    return accumulator;
  }, {});
  const totalUsage = Object.values(totals).reduce((total, value) => total + value, 0) || 1;
  const orderedCategories = [
    "Heating / Geyser",
    "Kitchen",
    "Fridge",
    "Laundry",
    "Lighting",
  ];
  const rows = orderedCategories.map((category, index) => ({
    category,
    usageKWh: round(totals[category] ?? 0),
    percent: Math.round(((totals[category] ?? 0) / totalUsage) * 100),
    color: categoryColors[index],
  }));
  const otherUsage =
    totalUsage -
    orderedCategories.reduce((total, category) => total + (totals[category] ?? 0), 0);
  if (otherUsage > 0) {
    rows.push({
      category: "Other",
      usageKWh: round(otherUsage),
      percent: Math.round((otherUsage / totalUsage) * 100),
      color: categoryColors[5],
    });
  }
  return rows;
}

function deriveDailyAverage(summary: HouseholdElectricitySummary) {
  if (summary.estimated_daily_usage_kWh > 0) {
    return summary.estimated_daily_usage_kWh;
  }
  if (summary.total_units > 0) {
    return Math.max(summary.total_units / 30, 6);
  }
  return 9.5;
}

function likelyHighConsumer(label: string, mode: ElectricityUsageMode) {
  if (mode === "day" && ["18:00", "21:00"].includes(label)) {
    return "Geyser / water heater";
  }
  if (mode === "week" && ["Sat", "Sun"].includes(label)) {
    return "Laundry and kitchen appliances";
  }
  return "Water heater";
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
