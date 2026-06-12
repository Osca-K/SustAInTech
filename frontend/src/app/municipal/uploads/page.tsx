"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

import { MunicipalSidebar } from "@/components/layout/MunicipalSidebar";
import {
  getUploadBatches,
  StatementUploadResponse,
  UploadBatchHistoryItem,
  uploadStatements,
} from "@/lib/api";

const statusLabels: Record<string, string> = {
  imported: "Imported",
  import_ready: "Imported",
  needs_review: "Needs review",
  review_required: "Needs review",
  failed: "Failed",
  duplicate_skipped: "Duplicate skipped",
};

const statusClasses: Record<string, string> = {
  imported: "border-emerald-200 bg-emerald-50 text-emerald-800",
  import_ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_review: "border-amber-200 bg-amber-50 text-amber-800",
  review_required: "border-amber-200 bg-amber-50 text-amber-800",
  failed: "border-rose-200 bg-rose-50 text-rose-800",
  duplicate_skipped: "border-slate-200 bg-slate-100 text-slate-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        statusClasses[status] ?? "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function StatementUploadsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<StatementUploadResponse | null>(null);
  const [batches, setBatches] = useState<UploadBatchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedSize = useMemo(
    () => selectedFiles.reduce((total, file) => total + file.size, 0),
    [selectedFiles],
  );

  async function refreshBatches() {
    try {
      setBatches(await getUploadBatches());
    } catch {
      setBatches([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getUploadBatches()
      .then((items) => {
        if (!cancelled) {
          setBatches(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBatches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function addFiles(files: FileList | File[]) {
    setError(null);
    const pdfs = Array.from(files).filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    setSelectedFiles((current) => {
      const existing = new Set(current.map(fileKey));
      const additions = pdfs.filter((file) => !existing.has(fileKey(file)));
      return [...current, ...additions];
    });
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function onUpload() {
    if (!selectedFiles.length) {
      setError("Select at least one PDF statement.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadStatements(selectedFiles);
      setUploadResult(result);
      setSelectedFiles([]);
      await refreshBatches();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <MunicipalSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-teal-700">
              Municipal workflow
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Statement Uploads
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Upload municipal PDF statements for extraction and validation.
            </p>
          </header>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <p className="text-base font-medium text-slate-900">
                  Drop PDF statements here
                </p>
                <p className="mt-2 max-w-lg text-sm text-slate-500">
                  Upload one or more municipal statement PDFs. Validated records will be
                  added to the operational database automatically.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isUploading}
                >
                  Choose PDF files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Selected files
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedFiles.length} files, {(selectedSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {selectedFiles.length ? (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {selectedFiles.map((file) => (
                      <li
                        key={fileKey(file)}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-slate-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFiles((current) =>
                              current.filter((item) => fileKey(item) !== fileKey(file)),
                            )
                          }
                          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          disabled={isUploading}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-slate-200 px-3 py-4 text-sm text-slate-500">
                    No files selected.
                  </p>
                )}

                {error ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={onUpload}
                  disabled={isUploading || !selectedFiles.length}
                  className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isUploading ? "Uploading and processing..." : "Upload statements"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Latest result</h2>
              {uploadResult ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ResultMetric label="Total files" value={uploadResult.total_files} />
                    <ResultMetric label="Imported" value={uploadResult.imported_count} />
                    <ResultMetric
                      label="Needs review"
                      value={uploadResult.review_required_count}
                    />
                    <ResultMetric label="Failed" value={uploadResult.failed_count} />
                    <ResultMetric
                      label="Duplicate skipped"
                      value={uploadResult.duplicate_skipped_count}
                    />
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <p>
                      Validated records have been imported. Return to the dashboard to view
                      the updated municipal data.
                    </p>
                    <Link
                      href="/municipal/dashboard"
                      className="mt-2 inline-flex font-semibold text-emerald-900 underline"
                    >
                      View dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Upload results will appear here after processing.
                </p>
              )}
            </div>
          </section>

          {uploadResult ? (
            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-base font-semibold text-slate-950">File results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Filename</th>
                      <th className="px-4 py-3">Processing status</th>
                      <th className="px-4 py-3">Validation status</th>
                      <th className="px-4 py-3">Review required</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uploadResult.files.map((file) => (
                      <tr key={`${uploadResult.batch_id}:${file.source_pdf_filename}`}>
                        <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-800">
                          {file.source_pdf_filename}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={file.processing_status} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {file.validation_status}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {file.requires_manual_review ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {file.review_reasons.join("; ") || "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-950">
                Recent Upload Batches
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Batch ID</th>
                    <th className="px-4 py-3">Processed at</th>
                    <th className="px-4 py-3">Total files</th>
                    <th className="px-4 py-3">Imported and ready</th>
                    <th className="px-4 py-3">Needs review</th>
                    <th className="px-4 py-3">Failed</th>
                    <th className="px-4 py-3">Duplicate skipped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.length ? (
                    batches.map((batch) => (
                      <tr key={batch.batch_id}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {batch.batch_id}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{batch.processed_at}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {batch.total_pdf_files}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {batch.import_ready_count}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {batch.review_required_count}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {batch.failed_count}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {batch.duplicate_skipped_count}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>
                        No upload batches yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
