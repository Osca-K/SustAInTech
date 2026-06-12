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

import type { MonthlyWaterUsage } from "@/lib/api";

type MonthlyWaterUsageChartProps = {
  data: MonthlyWaterUsage[];
};

export function MonthlyWaterUsageChart({ data }: MonthlyWaterUsageChartProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">
          Community Water Usage
        </h2>
        <p className="text-sm text-slate-500">Total and average usage by month</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="statement_month_label"
              tick={{ fill: "#475569", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              label={{ value: "kL", angle: -90, position: "insideLeft" }}
              tick={{ fill: "#475569", fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => {
                const numericValue =
                  typeof value === "number" ? value : Number(value ?? 0);
                return [`${numericValue.toFixed(1)} kL`, String(name)];
              }}
              labelClassName="text-slate-700"
            />
            <Legend />
            <Bar
              name="Total consumption"
              dataKey="total_consumption_kL"
              fill="#0f766e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              name="Average household"
              dataKey="average_household_consumption_kL"
              fill="#64748b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
