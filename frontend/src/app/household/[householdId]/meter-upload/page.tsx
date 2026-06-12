"use client";

import Link from "next/link";
import { ChangeEvent, use, useMemo, useRef, useState } from "react";

import { MeterSubmissionResult, submitHouseholdMeterReading } from "@/lib/api";

type MeterUploadPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

const resultCopy: Record<string, { title: string; message: string; className: string }> = {
  accepted: {
    title: "Reading accepted",
    message: "Your meter reading has been added to your household tracking history.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  review_required: {
    title: "Review required",
    message:
      "Your submitted reading increased unusually quickly. The reading has been saved for review.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  retake_required: {
    title: "Please retake the photo",
    message: "This image appears to be older than the allowed upload window.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  rejected: {
    title: "Reading rejected",
    message: "The submitted meter reading is lower than your latest trusted reading.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  duplicate_image: {
    title: "Image already submitted",
    message: "This same meter photo has already been uploaded.",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

export default function MeterUploadPage({ params }: MeterUploadPageProps) {
  const { householdId } = use(params);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MeterSubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    event.target.value = "";
  }

  async function onSubmit() {
    if (!file || !reading || !confirmed) {
      setError("Choose a meter photo, enter the visible reading, and confirm it before submitting.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("submitted_reading_kL", reading);
    formData.append("resident_confirmed", String(confirmed));
    if (file.lastModified) {
      formData.append("browser_last_modified_at", new Date(file.lastModified).toISOString());
    }

    setIsSubmitting(true);
    setError(null);
    try {
      setResult(await submitHouseholdMeterReading(householdId, formData));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-emerald-50/40 text-slate-950">
      <nav className="border-b border-emerald-100 bg-white/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-lg font-semibold text-slate-950">SustAInTech</p>
          <p className="text-sm font-medium text-teal-700">Household Portal</p>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
          <Link
            href={`/household/${householdId}`}
            className="text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            Return to household dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            Upload Water Meter Photo
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Track your water usage between monthly municipal statements.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Before you submit</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Take a clear photo of the water meter.</li>
              <li>Make sure the meter reading is visible.</li>
              <li>Use a recent photo taken today.</li>
              <li>Enter the visible reading and confirm it before submitting.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Take photo now
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Choose from gallery
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {previewUrl ? (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected meter"
                  className="max-h-80 w-full rounded-lg border border-slate-200 object-contain"
                />
                <p className="mt-2 text-sm text-slate-500">{file?.name}</p>
              </div>
            ) : null}

            <label className="mt-5 block text-sm font-medium text-slate-700">
              Visible meter reading in kL
              <input
                type="number"
                min="0"
                step="0.001"
                value={reading}
                onChange={(event) => setReading(event.target.value)}
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <label className="mt-4 flex gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1"
              />
              I confirm that I entered the visible meter reading from this photo.
            </label>

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="mt-5 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Submitting..." : "Submit meter reading"}
            </button>
          </div>
        </section>

        {result ? <ResultCard result={result} householdId={householdId} /> : null}
      </div>
    </main>
  );
}

function ResultCard({
  result,
  householdId,
}: {
  result: MeterSubmissionResult;
  householdId: string;
}) {
  const copy = resultCopy[result.validation_status] ?? resultCopy.review_required;
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${copy.className}`}>
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-2 text-sm">{copy.message}</p>
      {result.validation_notes.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {result.validation_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <Link
        href={`/household/${householdId}`}
        className="mt-5 inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"
      >
        Return to household dashboard
      </Link>
    </section>
  );
}
