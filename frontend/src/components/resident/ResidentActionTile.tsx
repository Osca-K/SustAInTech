import Link from "next/link";


export function ResidentActionTile({
  href,
  title,
  description,
  accent = "text-slate-900",
}: {
  href: string;
  title: string;
  description?: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-white/80 bg-white/90 p-4 shadow-sm"
    >
      <p className={`text-sm font-semibold ${accent}`}>{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      ) : null}
    </Link>
  );
}
