"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";


const hourlyUsage = [
  { label: "12 AM", litres: 8 },
  { label: "4 AM", litres: 3 },
  { label: "8 AM", litres: 22 },
  { label: "12 PM", litres: 48 },
  { label: "4 PM", litres: 23 },
  { label: "8 PM", litres: 34 },
  { label: "12 AM ", litres: 9 },
];

const ranges = ["Hourly", "Daily", "Weekly", "Monthly"] as const;

export function WaterUsageChartCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [activeRange, setActiveRange] = useState<(typeof ranges)[number]>("Hourly");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const initialWidth = Math.floor(element.getBoundingClientRect().width);
    if (initialWidth > 0) {
      setChartWidth(initialWidth);
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
    <section className="rounded-[1.75rem] border border-white/90 bg-white/82 px-4 pb-4 pt-3 shadow-[0_16px_38px_rgba(45,92,170,0.10)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1rem] font-extrabold tracking-[-0.03em] text-[#07184a]">Water Usage</h2>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white bg-[#f1f6ff] text-[#6c9cf5] shadow-[0_7px_18px_rgba(55,99,190,0.10)]">
          <DropletIcon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-1 grid h-8 grid-cols-4 rounded-full border border-[#e5ebf8] bg-[#f4f7fd] p-0.5 text-[0.58rem] font-semibold text-[#7985a1]">
        {ranges.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setActiveRange(range)}
            className={`rounded-full transition ${activeRange === range ? "bg-white text-[#3978f5] shadow-[0_4px_12px_rgba(54,104,210,0.12)]" : ""}`}
          >
            {range}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="relative mt-2 h-[8.25rem] min-w-0">
        <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-[#4d72ef] px-2 py-1 text-[0.52rem] font-bold text-white shadow-[0_5px_12px_rgba(53,109,245,0.24)]">
          48 L
        </span>
        {chartWidth > 0 ? (
          <AreaChart
            width={chartWidth}
            height={132}
            data={hourlyUsage}
            margin={{ top: 15, right: 8, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="waterUsageFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4f82ff" stopOpacity={0.34} />
                <stop offset="100%" stopColor="#7ec9ff" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#dfe8f7" strokeDasharray="2 4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fill: "#6f7c98", fontSize: 8.5, fontWeight: 600 }}
            />
            <YAxis
              domain={[0, 60]}
              ticks={[0, 20, 40, 60]}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value} L`}
              tick={{ fill: "#6f7c98", fontSize: 8.5, fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="litres"
              stroke="#356df5"
              strokeWidth={2.2}
              fill="url(#waterUsageFill)"
              dot={false}
              activeDot={{ r: 4, fill: "#356df5", stroke: "#fff", strokeWidth: 2 }}
            />
            <ReferenceDot
              x="12 PM"
              y={48}
              r={4}
              fill="#356df5"
              stroke="#fff"
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <div className="h-full rounded-2xl bg-[#f6f9ff]" />
        )}
      </div>
    </section>
  );
}

function DropletIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.8S6.8 8.4 6.8 13a5.2 5.2 0 0 0 10.4 0C17.2 8.4 12 2.8 12 2.8Z" />
    </svg>
  );
}
