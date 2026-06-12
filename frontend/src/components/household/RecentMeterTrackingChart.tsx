"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
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
  const accepted = submissions
    .filter((submission) => submission.validation_status === "accepted")
    .sort((left, right) => left.submitted_at.localeCompare(right.submitted_at));

  if (accepted.length < 2) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Recent Water Tracking
      </h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={accepted}>
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
        </ResponsiveContainer>
      </div>
    </section>
  );
}
