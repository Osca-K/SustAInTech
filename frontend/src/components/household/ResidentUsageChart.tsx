"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HouseholdMonthlyUsageItem } from "@/lib/api";

type ResidentUsageChartProps = {
  data: HouseholdMonthlyUsageItem[];
};

export function ResidentUsageChart({ data }: ResidentUsageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.floor(entry.contentRect.width);
      if (nextWidth > 0) {
        setChartWidth(nextWidth);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Your Monthly Water Usage
      </h2>
      <div ref={containerRef} className="mt-4 h-72 min-w-0">
        {chartWidth > 0 ? (
            <BarChart data={data} width={chartWidth} height={288}>
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
        ) : (
          <div className="h-full rounded-2xl bg-slate-50" />
        )}
      </div>
    </section>
  );
}
