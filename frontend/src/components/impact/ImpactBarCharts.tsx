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

type ChartDatum = {
  label: string;
  value: number;
};

export function ImpactBarChart({
  title,
  data,
  emptyText,
}: {
  title: string;
  data: ChartDatum[];
  emptyText: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {data.some((item) => item.value > 0) ? (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#475569", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} />
              <Tooltip labelStyle={{ color: "#0f172a" }} />
              <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-sm text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  );
}
