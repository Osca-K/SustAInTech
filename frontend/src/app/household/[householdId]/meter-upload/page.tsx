"use client";

import Link from "next/link";
import { ChangeEvent, use, useMemo, useRef, useState } from "react";

import {
  MeterPhotoExtractionResponse,
  MeterSubmissionResult,
  confirmHouseholdMeterExtraction,
  extractHouseholdMeterPhoto,
  submitHouseholdMeterReading,
} from "@/lib/api";

type MeterUploadPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

type UploadState =
  | "idle"
  | "uploading"
  | "analysing"
  | "awaiting_confirmation"
  | "submitting_confirmation"
  | "completed"
  | "error";

const resultCopy: Record<string, { title: string; message: string; className: string }> = {
  accepted: {
    title: "Reading accepted",
    message: "Your confirmed meter reading has been added to your household tracking history.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  review_required: {
    title: "Review required",
    message: "Your reading was saved, but the usage increase requires further review.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  retake_required: {
    title: "Please retake the photo",
    message: "The uploaded image appears too old or cannot be trusted.",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  rejected: {
    title: "Reading rejected",
    message: "The confirmed reading is lower than your latest trusted reading.",
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
  const [meterNumber, setMeterNumber] = useState("");
  const [reading, setReading] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [extraction, setExtraction] = useState<MeterPhotoExtractionResponse | null>(null);
  const [result, setResult] = useState<MeterSubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isBusy =
    uploadState === "uploading" ||
    uploadState === "analysing" ||
    uploadState === "submitting_confirmation";

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setExtraction(null);
    setResult(null);
    setError(null);
    setUploadState("idle");
    event.target.value = "";
  }

  async function analysePhoto() {
    if (!file) {
      setError("Choose a meter photo before analysing it.");
      setUploadState("error");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    if (file.lastModified) {
      formData.append("browser_last_modified_at", new Date(file.lastModified).toISOString());
    }

    let nextState: UploadState = "error";
    setUploadState("uploading");
    setError(null);
    try {
      setUploadState("analysing");
      const response = await extractHouseholdMeterPhoto(householdId, formData);
      setExtraction(response);
      setMeterNumber(response.suggested_meter_number ?? "");
      setReading(response.suggested_reading_kL?.toString() ?? "");
      setConfirmed(false);
      nextState = "awaiting_confirmation";
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Photo analysis failed.");
      nextState = "error";
    } finally {
      setUploadState(nextState);
    }
  }

  async function confirmExtraction() {
    if (!extraction || !reading || !confirmed) {
      setError("Enter the visible reading and confirm it before submitting.");
      return;
    }

    let nextState: UploadState = "awaiting_confirmation";
    setUploadState("submitting_confirmation");
    setError(null);
    try {
      const parsedReading = Number(reading);
      const suggestedReading = extraction.suggested_reading_kL;
      const residentCorrected =
        meterNumber.trim() !== (extraction.suggested_meter_number ?? "") ||
        suggestedReading === null ||
        Math.abs(parsedReading - suggestedReading) > 0.0001;
      const response = await confirmHouseholdMeterExtraction(
        householdId,
        extraction.extraction_id,
        {
          confirmed_meter_number: meterNumber.trim() || null,
          confirmed_reading_kL: parsedReading,
          resident_corrected_value: residentCorrected,
          resident_confirmed: confirmed,
        },
      );
      setResult(response);
      nextState = "completed";
    } catch (confirmationError) {
      setError(
        confirmationError instanceof Error
          ? confirmationError.message
          : "Meter reading confirmation failed.",
      );
      nextState = "awaiting_confirmation";
    } finally {
      setUploadState(nextState);
    }
  }

  async function submitManualFallback() {
    if (extraction) {
      await confirmExtraction();
      return;
    }
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

    let nextState: UploadState = "awaiting_confirmation";
    setUploadState("submitting_confirmation");
    setError(null);
    try {
      setResult(await submitHouseholdMeterReading(householdId, formData));
      nextState = "completed";
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Submission failed.");
      nextState = "awaiting_confirmation";
    } finally {
      setUploadState(nextState);
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

            <button
              type="button"
              onClick={analysePhoto}
              disabled={isBusy || !file}
              className="mt-5 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {uploadState === "analysing" ? "Analysing..." : "Analyse meter photo"}
            </button>

            {extraction ? (
              <ConfirmationForm
                extraction={extraction}
                meterNumber={meterNumber}
                reading={reading}
                confirmed={confirmed}
                isBusy={isBusy}
                onMeterNumberChange={setMeterNumber}
                onReadingChange={setReading}
                onConfirmedChange={setConfirmed}
                onConfirm={confirmExtraction}
                onManualFallback={submitManualFallback}
              />
            ) : null}

            {error ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>

        {result ? <ResultCard result={result} householdId={householdId} /> : null}
      </div>
    </main>
  );
}

function ConfirmationForm({
  extraction,
  meterNumber,
  reading,
  confirmed,
  isBusy,
  onMeterNumberChange,
  onReadingChange,
  onConfirmedChange,
  onConfirm,
  onManualFallback,
}: {
  extraction: MeterPhotoExtractionResponse;
  meterNumber: string;
  reading: string;
  confirmed: boolean;
  isBusy: boolean;
  onMeterNumberChange: (value: string) => void;
  onReadingChange: (value: string) => void;
  onConfirmedChange: (value: boolean) => void;
  onConfirm: () => void;
  onManualFallback: () => void;
}) {
  const showDevelopmentNote =
    process.env.NODE_ENV !== "production" ||
    extraction.ai_extraction_method === "development_mock_adapter";

  return (
    <section className="mt-6 border-t border-slate-200 pt-5">
      <h2 className="text-lg font-semibold text-slate-950">Confirm Meter Reading</h2>
      {showDevelopmentNote ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Development mode: automatic image reading is not connected yet. Enter or confirm the
          visible meter details manually.
        </p>
      ) : null}
      {extraction.ai_extraction_status === "low_confidence" ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          We could not read the meter confidently. Review the image and enter the visible values
          manually.
        </p>
      ) : null}
      {extraction.ai_extraction_status === "failed" ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Automatic reading unavailable. Enter the visible meter details manually to continue.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-slate-600">
        Please confirm or correct the suggested values before submitting.
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoItem label="Image freshness" value={labelize(extraction.image_freshness_status)} />
        <InfoItem label="Image quality" value={labelize(extraction.image_quality_status)} />
        <InfoItem label="Detected meter number" value={extraction.suggested_meter_number ?? "None"} />
        <InfoItem
          label="Detected meter reading"
          value={
            extraction.suggested_reading_kL !== null
              ? `${extraction.suggested_reading_kL.toFixed(3)} kL`
              : "None"
          }
        />
        <InfoItem label="Confidence" value={`${Math.round(extraction.confidence_score * 100)}%`} />
        <InfoItem label="Status" value={labelize(extraction.ai_extraction_status)} />
      </dl>

      {extraction.extraction_notes.length ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Extraction notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {extraction.extraction_notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="mt-5 block text-sm font-medium text-slate-700">
        Meter number
        <input
          type="text"
          value={meterNumber}
          onChange={(event) => onMeterNumberChange(event.target.value)}
          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Meter reading in kL
        <input
          type="number"
          min="0"
          step="0.001"
          value={reading}
          onChange={(event) => onReadingChange(event.target.value)}
          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <label className="mt-4 flex gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
          className="mt-1"
        />
        I confirm that the entered reading matches the uploaded meter photo.
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isBusy}
          className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isBusy ? "Submitting..." : "Confirm and submit reading"}
        </button>
        <button
          type="button"
          onClick={onManualFallback}
          disabled={isBusy}
          className="rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          Enter reading manually instead
        </button>
      </div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
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

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
