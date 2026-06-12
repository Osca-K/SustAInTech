"use client";

export default function MeterUploadError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-emerald-50/40 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-rose-700">
          Upload unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          Meter photo upload could not be loaded
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Please check that the backend is running and try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
