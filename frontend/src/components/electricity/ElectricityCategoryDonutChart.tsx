"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { ElectricityCategoryUsage } from "@/lib/electricityUsageSeries";


export function ElectricityCategoryDonutChart({
  data,
}: {
  data: ElectricityCategoryUsage[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) {
        setChartWidth(width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const size = Math.min(chartWidth, 240);

  return (
    <div ref={containerRef} className="flex min-h-56 min-w-0 items-center justify-center">
      {size > 0 ? (
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="usageKWh"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={size * 0.27}
            outerRadius={size * 0.42}
            paddingAngle={3}
          >
            {data.map((item) => (
              <Cell key={item.category} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              return [`${numeric.toFixed(1)} kWh`, "Usage"];
            }}
          />
        </PieChart>
      ) : (
        <div className="h-56 w-56 rounded-full bg-amber-50" />
      )}
    </div>
  );
}
