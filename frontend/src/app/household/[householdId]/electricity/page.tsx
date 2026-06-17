"use client";

import { use } from "react";

import { ResidentMobileShell } from "@/components/resident/ResidentMobileShell";

type ElectricityPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const electricityAssetBase = "/assets/resident/electricity";

export default function HouseholdElectricityPage({ params }: ElectricityPageProps) {
  const { householdId } = use(params);

  return (
    <ResidentMobileShell householdId={householdId}>
      <div className="min-h-screen bg-[#f5f6fa] px-4 pt-5">
        <section className="relative h-[13.25rem] overflow-hidden rounded-t-[2.15rem] rounded-b-[1.5rem] bg-[#fbfcff] shadow-[0_18px_44px_rgba(15,23,42,0.09)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(252,211,77,0.38),transparent_26%),linear-gradient(135deg,#ffffff_0%,#f8fbff_44%,#eaf4ff_100%)]" />
          <AssetImage
            src={`${electricityAssetBase}/electricity-header-house.png`}
            alt=""
            className="absolute -right-16 bottom-5 h-[13.3rem] w-[26.5rem] object-contain object-right-bottom opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/96 via-white/64 to-transparent" />
          <div className="absolute left-5 top-7 max-w-[15.25rem]">
            <p className="font-['Cascadia_Code','Cascadia_Mono',Consolas,monospace] text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">
              Smart electricity
            </p>
            <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-amber-500 to-sky-400" />
            <p className="mt-4 max-w-[12rem] font-['Cascadia_Code','Cascadia_Mono',Consolas,monospace] text-[0.86rem] font-semibold leading-5 tracking-[-0.01em] text-slate-950">
              Power your home wisely. Save energy. Live smarter
            </p>
          </div>
        </section>
      </div>
    </ResidentMobileShell>
  );
}

function AssetImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}
