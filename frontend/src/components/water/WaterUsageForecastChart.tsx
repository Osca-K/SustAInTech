"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { WaterForecastPoint } from "@/lib/waterForecast";


export function WaterUsageForecastChart({
  data,
}: {
  data: WaterForecastPoint[];
}) {
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

  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-500">
        No water usage pattern is available yet.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-64 min-h-64 min-w-0">
      {chartWidth > 0 ? (
        <ComposedChart
          data={data}
          width={chartWidth}
          height={256}
          margin={{ top: 10, right: 8, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke="#dbeafe" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 11 }}
            tickFormatter={(value) => `${value}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              const label = name === "actualUsageKL" ? "Actual usage" : "Predicted usage";
              return [`${numeric.toFixed(1)} kL`, label];
            }}
            labelStyle={{ color: "#0f172a" }}
          />
          <Area
            type="monotone"
            dataKey="actualUsageKL"
            fill="#99f6e4"
            fillOpacity={0.28}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="actualUsageKL"
            name="Actual usage"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 3, fill: "#0f766e" }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="predictedUsageKL"
            name="Predicted usage"
            stroke="#38bdf8"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={{ r: 2, fill: "#38bdf8" }}
            connectNulls
          />
        </ComposedChart>
      ) : (
        <div className="h-full rounded-2xl bg-white/40" />
      )}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-4 rounded-full bg-teal-700" />
          Actual usage
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-sky-400" />
          Predicted usage
        </span>
      </div>
    </div>
  );
}
