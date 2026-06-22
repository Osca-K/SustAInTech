const waterUsageCategories = [
  { label: "Bathroom", value: 36, amount: "89 L", color: "#5e9ff5" },
  { label: "Kitchen", value: 24, amount: "60 L", color: "#50c8c2" },
  { label: "Toilet", value: 16, amount: "40 L", color: "#79d3a4" },
  { label: "Laundry", value: 14, amount: "35 L", color: "#8c6bea" },
  { label: "Outdoor", value: 10, amount: "24 L", color: "#aab8f2" },
] as const;

export function WaterUsageByCategoryCard() {
  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#f7f9ff)] p-5 shadow-[0_18px_45px_rgba(30,64,175,0.10)]"
      style={{
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div>
        <h2 className="text-[1.18rem] font-extrabold leading-tight tracking-[-0.035em] text-[#07184a]">
          Water Usage by Category
        </h2>
        <p className="mt-1.5 text-[0.82rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
          Live breakdown of your water use
        </p>
      </div>

      <div className="mt-5 grid grid-cols-[9.8rem_1fr] items-center gap-4">
        <SegmentedWaterUsageDonut />

        <div className="space-y-2.5">
          {waterUsageCategories.map((item) => (
            <div
              key={item.label}
              className="flex min-h-[2.45rem] items-center justify-between gap-2 rounded-full bg-white/88 px-3 py-2 shadow-[0_9px_20px_rgba(30,64,175,0.06)] ring-1 ring-white/90"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_12px_rgba(88,171,220,0.20)]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-[0.76rem] font-semibold tracking-[-0.02em] text-[#263153]">
                  {item.label}
                </span>
              </span>
              <span className="text-[0.82rem] font-extrabold tracking-[-0.03em] text-[#07184a]">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SegmentedWaterUsageDonut() {
  const radius = 56;
  const strokeWidth = 19;
  const circumference = 2 * Math.PI * radius;
  const gap = 3.8;
  const segments = waterUsageCategories.map((item, index) => {
    const previousTotal = waterUsageCategories
      .slice(0, index)
      .reduce((total, category) => total + category.value, 0);

    return {
      ...item,
      dashOffset: -((previousTotal / 100) * circumference),
      length: (item.value / 100) * circumference - gap,
    };
  });

  return (
    <div className="relative flex h-[9.8rem] w-[9.8rem] items-center justify-center rounded-full bg-[radial-gradient(circle,#ffffff_43%,rgba(232,246,255,0.82)_58%,rgba(255,255,255,0)_69%)] shadow-[0_18px_38px_rgba(65,138,196,0.13)]">
      <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.95),rgba(233,247,255,0.48)_54%,rgba(255,255,255,0)_70%)] blur-[1px]" />
      <svg
        aria-hidden="true"
        className="relative h-full w-full -rotate-90 overflow-visible"
        viewBox="0 0 160 160"
      >
        <defs>
          <filter id="waterCategoryDonutGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.78)"
          strokeWidth={strokeWidth + 5}
        />
        {segments.map((item) => (
          <circle
            key={item.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeDasharray={`${Math.max(item.length, 0)} ${circumference}`}
            strokeDashoffset={item.dashOffset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            filter="url(#waterCategoryDonutGlow)"
          />
        ))}
      </svg>
      <div className="absolute inset-[2.85rem] rounded-full bg-white shadow-[inset_0_6px_16px_rgba(80,145,190,0.08),0_8px_18px_rgba(80,145,190,0.08)]" />
      <div className="absolute text-center">
        <p className="text-[2rem] font-extrabold leading-none tracking-[-0.07em] text-[#07184a]">
          248
        </p>
        <p className="mt-1 text-[0.78rem] font-medium tracking-[-0.02em] text-[#8a97b5]">L</p>
      </div>
    </div>
  );
}
