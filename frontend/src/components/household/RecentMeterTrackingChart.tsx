"use client";

import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MeterSubmissionHistoryItem } from "@/lib/api";

export function RecentMeterTrackingChart({
  submissions,
}: {
  submissions: MeterSubmissionHistoryItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const accepted = submissions
    .filter((submission) => submission.validation_status === "accepted")
    .sort((left, right) => left.submitted_at.localeCompare(right.submitted_at));

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

  if (accepted.length < 2) {
    return (
      <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Recent Water Tracking
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          Submit at least two accepted meter readings to see your between-bill
          tracking trend.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Recent Water Tracking
      </h2>
      <div ref={containerRef} className="mt-4 h-72 min-w-0">
        {chartWidth > 0 ? (
            <LineChart data={accepted} width={chartWidth} height={288}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="submitted_at" tick={{ fill: "#475569", fontSize: 11 }} />
              <YAxis yAxisId="reading" tick={{ fill: "#475569", fontSize: 12 }} />
              <YAxis
                yAxisId="daily"
                orientation="right"
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="reading"
                type="monotone"
                dataKey="submitted_reading_kL"
                name="Meter reading kL"
                stroke="#0f766e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="daily"
                type="monotone"
                dataKey="estimated_daily_usage_kL"
                name="Estimated kL/day"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
        ) : (
          <div className="h-full rounded-2xl bg-slate-50" />
        )}
      </div>
    </section>
  );
}
