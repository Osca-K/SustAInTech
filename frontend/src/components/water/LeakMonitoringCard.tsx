type LeakMonitoringCardProps = {
  confidence?: number;
  statusTitle?: string;
  statusMessage?: string;
  monitoringNote?: string;
  buttonLabel?: string;
};

const electricityAssetBase = "/assets/resident/electricity";

export function LeakMonitoringCard({
  confidence = 94,
  statusTitle = "Flow stable",
  statusMessage = "No leak detected",
  monitoringNote = "Monitoring your home 24/7 for leaks, unusual flow, and pressure drift.",
  buttonLabel = "Run Leak Check",
}: LeakMonitoringCardProps) {
  const safeConfidence = Math.min(Math.max(confidence, 0), 100);
  const ringStop = safeConfidence * 3.6;
  const [noteBefore, noteAfter = ""] = monitoringNote.split("24/7");

  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#f5faff)] p-5 shadow-[0_18px_45px_rgba(30,100,175,0.10)]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.045em] text-[#07184a]">
        Leak Monitoring
      </h2>

      <div className="mt-5 grid grid-cols-[8.3rem_1fr] items-center gap-4">
        <div className="relative flex h-[8.3rem] w-[8.3rem] items-center justify-center overflow-hidden rounded-[1.65rem] bg-[linear-gradient(145deg,#fffdf9,#f4f7ff)] shadow-[0_16px_32px_rgba(124,145,201,0.12)] ring-1 ring-[#edf0ff]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.92),transparent_36%),radial-gradient(circle_at_76%_74%,rgba(169,214,226,0.16),transparent_40%),radial-gradient(circle_at_42%_70%,rgba(237,217,181,0.16),transparent_44%)]" />
          <div className="absolute inset-3 rounded-[1.25rem] bg-white/36 blur-sm" />
          <MonitoringAssetImage
            src={`${electricityAssetBase}/Shield.png`}
            alt=""
            className="relative h-[7.35rem] w-[7.35rem] object-contain opacity-[0.94] saturate-[0.82]"
          />
        </div>

        <div className="min-w-0">
          <div className="relative mx-auto flex h-[9.7rem] w-[9.7rem] shrink-0 items-center justify-center rounded-full bg-white/75 shadow-[0_12px_30px_rgba(56,126,198,0.12)]">
            <div
              className="absolute inset-1 rounded-full"
              style={{
                background: `conic-gradient(from 220deg, #78b7ff 0deg, #61d7d0 150deg, #9a8df3 ${ringStop}deg, #eaf2fb ${ringStop}deg 360deg)`,
              }}
            />
            <div className="absolute inset-[0.82rem] rounded-full border border-white bg-white shadow-[inset_0_5px_16px_rgba(83,137,200,0.08)]" />
            <span className="absolute right-[1.08rem] top-[1.08rem] h-4 w-4 rounded-full border-[3px] border-white bg-[#8fa4f6] shadow-[0_3px_10px_rgba(78,118,214,0.28)]" />
            <div className="relative z-[2] flex translate-y-0.5 flex-col items-center justify-center text-center">
              <p className="text-[2.22rem] font-extrabold leading-none tracking-[-0.055em] text-[#07184a]">
                {safeConfidence}%
              </p>
              <p className="mt-1 text-[0.63rem] font-semibold leading-none tracking-[-0.015em] text-[#8a97b5]">
                AI Confidence
              </p>
            </div>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full border border-cyan-100 bg-white/80 shadow-[inset_0_1px_3px_rgba(30,100,175,0.08)]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#72d9cb] to-[#69c7e9] shadow-[0_4px_14px_rgba(49,181,188,0.22)]"
              style={{ width: `${safeConfidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-full border border-emerald-100 bg-white/80 px-3 py-2.5 shadow-[0_10px_24px_rgba(39,184,111,0.08)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#72d9b2]/20 text-[#48bd91]">
          <CheckIcon className="h-5 w-5" />
        </span>
        <span className="whitespace-nowrap text-[0.78rem] font-extrabold tracking-[-0.02em] text-[#42b883]">
          {statusTitle}
        </span>
        <span className="h-6 w-px shrink-0 bg-emerald-100" />
        <span className="min-w-0 text-[0.72rem] font-medium tracking-[-0.01em] text-[#8a97b5]">
          {statusMessage}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[1.35rem] border border-slate-100 bg-white/78 px-4 py-3 shadow-[0_12px_28px_rgba(30,100,175,0.06)]">
        <MonitoringAssetImage
          src={`${electricityAssetBase}/home.png`}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
        />
        <p className="text-[0.82rem] font-medium leading-5 tracking-[-0.02em] text-[#7a86a3]">
          {noteBefore}
          <span className="font-extrabold text-[#6d9cf4]">24/7</span>
          {noteAfter}
        </p>
      </div>

      <button
        type="button"
        className="mt-5 flex h-14 w-full items-center justify-center rounded-[1.25rem] bg-gradient-to-r from-[#62b8f1] via-[#718fed] to-[#9b83ee] text-[1rem] font-extrabold tracking-[-0.02em] text-white shadow-[0_14px_30px_rgba(89,141,224,0.28)] transition-transform active:scale-[0.985]"
      >
        {buttonLabel}
      </button>
    </section>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="m6 12 4 4 8-9" />
    </svg>
  );
}

function MonitoringAssetImage({
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
    <img src={src} alt={alt} className={className} draggable={false} />
  );
}
