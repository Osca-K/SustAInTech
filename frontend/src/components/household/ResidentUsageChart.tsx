"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HouseholdMonthlyUsageItem } from "@/lib/api";

type ResidentUsageChartProps = {
  data: HouseholdMonthlyUsageItem[];
};

export function ResidentUsageChart({ data }: ResidentUsageChartProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Your Monthly Water Usage
      </h2>
      <div className="mt-4 h-72">
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
                return [`${numericValue.toFixed(1)} kL`, "Usage"];
              }}
              labelStyle={{ color: "#0f172a" }}
            />
            <Bar
              dataKey="consumption_kL"
              name="Water usage"
              fill="#0f766e"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
