"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Overview", href: "/municipal/dashboard", enabled: true },
  { label: "Statement Uploads", href: "/municipal/uploads", enabled: true },
  { label: "Households", href: "/municipal/households", enabled: true },
  { label: "Insights", href: "/municipal/insights", enabled: true },
  { label: "Meter Submissions", href: "/municipal/meter-submissions", enabled: true },
  { label: "Settings", href: "#", enabled: false },
];

export function MunicipalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="p-5">
        <p className="text-lg font-semibold text-slate-950">SustAInTech</p>
        <p className="text-sm text-slate-500">Municipal tools</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-3">
        {items.map((item) =>
          item.enabled ? (
            <Link
              key={item.label}
              href={item.href}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-slate-400"
            >
              {item.label}
              <span className="ml-2 text-xs">Coming soon</span>
            </span>
          ),
        )}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4 lg:mt-auto">
        <Link
          href="/household"
          className="block rounded-md px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Resident portal demo
        </Link>
      </div>
    </aside>
  );
}
