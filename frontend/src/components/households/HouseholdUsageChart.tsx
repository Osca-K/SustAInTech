"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HouseholdMonthlyUsageItem } from "@/lib/api";

type HouseholdUsageChartProps = {
  data: HouseholdMonthlyUsageItem[];
};

export function HouseholdUsageChart({ data }: HouseholdUsageChartProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">
          Monthly Water Usage
        </h2>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="statement_month_label"
              tick={{ fill: "#475569", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 12 }}
              tickFormatter={(value) => `${value} kL`}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => {
                const numericValue =
                  typeof value === "number" ? value : Number(value ?? 0);
                return [`${numericValue.toFixed(1)} kL`, "Consumption"];
              }}
              labelStyle={{ color: "#0f172a" }}
            />
            <Legend />
            <Bar
              dataKey="consumption_kL"
              name="Consumption"
              fill="#0f766e"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
