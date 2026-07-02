"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";


type NavItem = {
  label: string;
  href: string;
  active: (pathname: string) => boolean;
  icon: (className: string) => ReactNode;
};

export function ResidentBottomNav({ householdId }: { householdId: string }) {
  const pathname = usePathname();
  const base = `/household/${householdId}`;
  const items: NavItem[] = [
    {
      label: "Home",
      href: base,
      active: (value) =>
        value === base ||
        value === `${base}/settings` ||
        value === `${base}/subscriptions`,
      icon: HomeIcon,
    },
    {
      label: "Electricity",
      href: `${base}/electricity`,
      active: (value) => value.startsWith(`${base}/electricity`),
      icon: ZapIcon,
    },
    {
      label: "Water",
      href: `${base}/water`,
      active: (value) => value === `${base}/water` || value.startsWith(`${base}/meter-upload`),
      icon: DropletsIcon,
    },
    {
      label: "Recycling",
      href: `${base}/recycling`,
      active: (value) => value.startsWith(`${base}/recycling`) || value.startsWith(`${base}/waste`),
      icon: RecycleIcon,
    },
    {
      label: "Impact",
      href: `${base}/analytics`,
      active: (value) => value.startsWith(`${base}/analytics`),
      icon: BarChartIcon,
    },
  ];

  return (
    <nav
      aria-label="Resident portal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
    >
      <div className="rounded-full border border-slate-200 bg-white/95 px-2 py-2 shadow-lg shadow-slate-900/10 backdrop-blur">
        <ul className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const isActive = item.active(pathname);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-full px-1 text-[11px] font-medium transition ${
                    isActive
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {item.icon("h-5 w-5")}
                  <span className="mt-1 leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function IconShell({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function HomeIcon(className: string) {
  return (
    <IconShell className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </IconShell>
  );
}

function DropletsIcon(className: string) {
  return (
    <IconShell className={className}>
      <path d="M12 3s5 5.2 5 9a5 5 0 0 1-10 0c0-3.8 5-9 5-9Z" />
      <path d="M5 14s3 3.1 3 5a3 3 0 0 1-6 0c0-1.9 3-5 3-5Z" />
    </IconShell>
  );
}

function ZapIcon(className: string) {
  return (
    <IconShell className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </IconShell>
  );
}

function RecycleIcon(className: string) {
  return (
    <IconShell className={className}>
      <path d="m7 7 2-4 2 4" />
      <path d="M9 3h6l2 4" />
      <path d="m17 17 4-1-2-4" />
      <path d="m21 16-3 5h-5" />
      <path d="M6 13 3 16l3 3" />
      <path d="M3 16h6" />
    </IconShell>
  );
}

function BarChartIcon(className: string) {
  return (
    <IconShell className={className}>
      <path d="M4 20h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-3" />
    </IconShell>
  );
}
