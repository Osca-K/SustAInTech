"use client";

export default function Error() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-red-700">
          Backend unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          The municipal dashboard could not load.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Start the FastAPI backend with{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">
            uvicorn app.main:app --reload
          </code>{" "}
          from the <code className="rounded bg-slate-100 px-1 py-0.5">backend</code>{" "}
          folder, then refresh this page.
        </p>
      </section>
    </div>
  );
}
