"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { QuestionPassageImportPreview, QuestionPassageImportPreviewRow } from "@/lib/api/teacher-builder";
import {
  buildQuestionPassageImportSampleTemplates,
  type QuestionPassageImportSampleTemplate,
} from "@/lib/teacher/question-import-samples";
import { getQuestionBankFieldLabel } from "@/lib/teacher/question-bank-validation";

type ImportFieldErrors = Partial<Record<"file", string>>;

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

async function readImportError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const fieldErrors: ImportFieldErrors = {
    file: firstError(payload.file),
  };
  const message =
    firstError(payload.detail) ||
    firstError(payload.error) ||
    fieldErrors.file ||
    `Request failed with status ${response.status}`;
  return { fieldErrors, message };
}

function buildTemplateFileName() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return `nexora-comprehension-template-${stamp}.csv`;
}

function downloadCsvFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function labelImportField(field: string) {
  return getQuestionBankFieldLabel(field);
}

function normalizeImportMessages(value: string | string[] | undefined) {
  if (!value) {
    return [] as string[];
  }
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value.trim() ? [value.trim()] : [];
}

function rowMessages(row: QuestionPassageImportPreviewRow) {
  const fieldMessages = Object.values(row.error_map ?? {}).flatMap((value) =>
    normalizeImportMessages(
      Array.isArray(value)
        ? value.map((item) => String(item))
        : typeof value === "string"
          ? value
          : undefined,
    ),
  );
  return [...fieldMessages, ...(row.errors ?? [])];
}

function hasDuplicateSignal(row: QuestionPassageImportPreviewRow) {
  return rowMessages(row).some((message) => {
    const normalized = message.toLowerCase();
    return normalized.includes("duplicate") || normalized.includes("already exists");
  });
}

export function TeacherQuestionPassageImportWorkspace({
  backHref = "/teacher/question-bank",
  csvContent,
  finalizeApiPath = "/api/question-bank/comprehension/finalize-import",
  formId = "teacher-question-passage-import-form",
  previewApiPath = "/api/question-bank/comprehension/preview-import",
  templateColumns,
  workspaceClassName = "",
}: {
  backHref?: string;
  csvContent: string;
  finalizeApiPath?: string;
  formId?: string;
  previewApiPath?: string;
  templateColumns: string[];
  workspaceClassName?: string;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuestionPassageImportPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ImportFieldErrors>({});

  const validPreviewRows = useMemo(() => preview?.rows.filter((row) => row.is_valid) ?? [], [preview]);
  const invalidPreviewRows = useMemo(() => preview?.rows.filter((row) => !row.is_valid) ?? [], [preview]);
  const repeatedErrorFields = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of invalidPreviewRows) {
      for (const field of row.error_fields ?? []) {
        counts.set(field, (counts.get(field) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [invalidPreviewRows]);
  const duplicateRows = useMemo(
    () => invalidPreviewRows.filter((row) => hasDuplicateSignal(row)),
    [invalidPreviewRows],
  );
  const sampleTemplates = useMemo<QuestionPassageImportSampleTemplate[]>(
    () => buildQuestionPassageImportSampleTemplates(templateColumns),
    [templateColumns],
  );

  function downloadTemplate() {
    downloadCsvFile(csvContent, buildTemplateFileName());
  }

  async function handlePreviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setFieldErrors({ file: "Choose a CSV file before previewing the import." });
      setError("Choose a CSV file before previewing the import.");
      setMessage("");
      return;
    }
    setIsPreviewing(true);
    setError("");
    setMessage("");
    setFieldErrors({});
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      const response = await fetch(previewApiPath, { method: "POST", body: formData });
      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message: nextMessage } = await readImportError(response);
        setFieldErrors(
          Object.fromEntries(Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value))) as ImportFieldErrors,
        );
        throw new Error(nextMessage);
      }
      const payload = (await response.json()) as
        | { preview?: QuestionPassageImportPreview; error?: string }
        | QuestionPassageImportPreview;
      const resolvedPreview =
        "preview" in payload && payload.preview ? payload.preview : (payload as QuestionPassageImportPreview);
      setPreview(resolvedPreview);
      setMessage(
        resolvedPreview.invalid_rows > 0
          ? `Preview generated. ${resolvedPreview.invalid_rows} comprehension row(s) still need fixes before final import.`
          : "Preview generated. All comprehension rows are valid and ready for final import.",
      );
    } catch (previewError) {
      setPreview(null);
      setError(previewError instanceof Error && previewError.message ? previewError.message : "Unable to preview the CSV file.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function finalizeImport() {
    if (!preview || preview.valid_payloads.length === 0) {
      setFieldErrors({ file: "Add a CSV file and generate a valid preview before finalizing." });
      setError("There are no valid comprehension rows available to import.");
      setMessage("");
      return;
    }
    setIsFinalizing(true);
    setError("");
    setMessage("");
    setFieldErrors({});
    try {
      const response = await fetch(finalizeApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preview_schema_version: preview.preview_schema_version,
          preview_signature: preview.preview_signature,
          preview_rows: preview.rows,
          valid_payloads: preview.valid_payloads,
        }),
      });
      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message: nextMessage } = await readImportError(response);
        setFieldErrors(
          Object.fromEntries(Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value))) as ImportFieldErrors,
        );
        throw new Error(nextMessage);
      }
      const payload = (await response.json()) as { created_count?: number; failed_count?: number };
      const createdCount = typeof payload.created_count === "number" ? payload.created_count : 0;
      const failedCount = typeof payload.failed_count === "number" ? payload.failed_count : 0;
      setMessage(
        failedCount > 0
          ? `${createdCount} comprehension set(s) were imported. ${failedCount} row(s) still failed during final import and should be previewed again.`
          : `${createdCount} comprehension set(s) were imported into the question bank.`,
      );
      setPreview(null);
      setSelectedFile(null);
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.reset();
    } catch (finalizeError) {
      setError(finalizeError instanceof Error && finalizeError.message ? finalizeError.message : "Unable to finalize the comprehension import.");
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <div className={`questionImportShell ${workspaceClassName}`.trim()}>
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Template columns</span>
          <strong>{templateColumns.length}</strong>
          <small>Backend-provided fields expected inside the comprehension CSV file</small>
        </article>
        <article className="builderSummaryCard">
          <span>Preview valid rows</span>
          <strong>{preview?.valid_rows ?? 0}</strong>
          <small>Shared passages ready to be created in the bank</small>
        </article>
        <article className="builderSummaryCard">
          <span>Preview invalid rows</span>
          <strong>{preview?.invalid_rows ?? 0}</strong>
          <small>Rows that still need fixes before finalizing</small>
        </article>
        <article className="builderSummaryCard">
          <span>Most repeated fix</span>
          <strong>{repeatedErrorFields[0] ? labelImportField(repeatedErrorFields[0][0]) : "Clean"}</strong>
          <small>
            {repeatedErrorFields[0]
              ? `${repeatedErrorFields[0][1]} row(s) need the same field corrected`
              : "No repeated field failures in the current preview"}
          </small>
        </article>
        <article className="builderSummaryCard">
          <span>Duplicate set rows</span>
          <strong>{duplicateRows.length}</strong>
          <small>
            {duplicateRows.length
              ? "Rows match repeated or already-existing comprehension sets"
              : "No duplicate comprehension-title risks detected"}
          </small>
        </article>
      </section>

      <section className="contentCard questionImportPanel">
        <div className="builderSectionHeader">
          <div>
            <strong>Template and upload</strong>
            <p>Download the live comprehension CSV structure, fill it with shared passage rows, then preview the import before committing anything.</p>
          </div>
          <div className="questionBankButtonRow">
            <button className="button buttonSecondary" onClick={downloadTemplate} type="button">
              Download Template
            </button>
            <Link className="button buttonGhost" href={backHref}>
              Back to Bank
            </Link>
          </div>
        </div>

        <div className="builderMiniBanner">
          <div>
            <strong>Expected CSV headers</strong>
            <span>{templateColumns.join(" • ")}</span>
          </div>
        </div>

        <div className="questionImportSampleGrid">
          {sampleTemplates.map((sample) => (
            <article className="questionImportSampleCard" key={sample.id}>
              <div className="questionImportSampleCardCopy">
                <strong>{sample.title}</strong>
                <p>{sample.description}</p>
              </div>
              <button
                className="button buttonGhost"
                onClick={() => downloadCsvFile(sample.csvContent, sample.fileName)}
                type="button"
              >
                Download Sample
              </button>
            </article>
          ))}
        </div>

        <div className="builderMiniBanner">
          <div>
            <strong>Before using a sample</strong>
            <span>
              Replace <code>SUBJECT-CODE</code> and <code>TOPIC-CODE</code> with real academic codes from your setup before previewing the import.
            </span>
          </div>
        </div>

        <form action="#" className="builderSectionCard" id={formId} onSubmit={handlePreviewSubmit}>
          <div className="builderGrid compact">
            <label className="fieldStack fieldStackFull">
              <span>CSV file</span>
              <input
                accept=".csv,text/csv"
                aria-invalid={Boolean(fieldErrors.file)}
                className={fieldErrors.file ? "setupFieldInvalid" : undefined}
                data-testid="question-passage-import-file-input"
                name="file"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  setFieldErrors((current) => ({ ...current, file: "" }));
                }}
                onInput={(event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  setSelectedFile(target.files?.[0] ?? null);
                  setFieldErrors((current) => ({ ...current, file: "" }));
                }}
                type="file"
              />
              {fieldErrors.file ? <small className="setupFieldError">{fieldErrors.file}</small> : null}
            </label>
          </div>

          <div className="questionBankButtonRow">
            <button className="button buttonPrimary" disabled={isPreviewing} type="submit">
              {isPreviewing ? "Generating Preview..." : "Preview Import"}
            </button>
            <button
              className="button buttonGhost"
              disabled={!selectedFile && !preview}
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                setError("");
                setMessage("");
                const form = document.getElementById(formId) as HTMLFormElement | null;
                form?.reset();
              }}
              type="button"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {preview ? (
        <section className="contentCard questionImportPanel">
          <div className="builderSectionHeader">
            <div>
              <strong>Preview results</strong>
              <p>Review valid comprehension sets, inspect row-level issues, and only finalize once the import looks clean.</p>
            </div>
            <button
              className="button buttonPrimary"
              disabled={isFinalizing || preview.valid_payloads.length === 0}
              onClick={finalizeImport}
              type="button"
            >
              {isFinalizing ? "Importing Comprehension Sets..." : `Finalize Import (${preview.valid_rows})`}
            </button>
          </div>

          {duplicateRows.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Duplicate comprehension titles need attention first</strong>
                <span>
                  {duplicateRows.length} row(s) look like repeated or already-existing set titles in the same academic
                  scope. Rename them before final import.
                </span>
              </div>
            </div>
          ) : null}

          <div className="questionImportRowGrid">
            {preview.rows.map((row: QuestionPassageImportPreviewRow) => (
              <article
                className={
                  row.is_valid
                    ? "questionImportRowCard questionImportRowCardValid"
                    : "questionImportRowCard questionImportRowCardInvalid"
                }
                key={`${row.row_number}-${row.title}`}
              >
                <div className="questionImportRowMeta">
                  <strong>Row {row.row_number}</strong>
                  <span>{row.is_valid ? "Valid" : "Needs fixes"}</span>
                </div>
                <p>{row.title || "No comprehension set title found in this row."}</p>
                <div className="questionBankChipRow">
                  <span className="questionBankMetaChip">{row.subject_code || "No subject"}</span>
                  <span className="questionBankMetaChip">{row.topic_code || "No topic"}</span>
                  <span className="questionBankTagChip">{row.content_format || "Unknown format"}</span>
                  {row.error_fields?.map((field) => (
                    <span className="questionBankMetaChip" key={`${row.row_number}-${field}`}>
                      Fix {labelImportField(field)}
                    </span>
                  ))}
                </div>
                {row.error_map && Object.keys(row.error_map).length ? (
                  <div className="questionImportFixPanel">
                    <strong>Field-by-field fixes</strong>
                    <div className="questionImportFixList">
                      {Object.entries(row.error_map).map(([field, value]) => {
                        const messages = normalizeImportMessages(
                          Array.isArray(value)
                            ? value.map((item) => String(item))
                            : typeof value === "string"
                              ? value
                              : undefined,
                        );
                        if (!messages.length) {
                          return null;
                        }
                        return (
                          <div className="questionImportFixItem" key={`${row.row_number}-${field}-fix`}>
                            <span>{labelImportField(field)}</span>
                            <p>{messages[0]}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {row.expectations?.length ? (
                  <div className="builderMiniBanner">
                    <div>
                      <strong>Expected for this row type</strong>
                      <span>{row.expectations.join(" • ")}</span>
                    </div>
                  </div>
                ) : null}
                {!row.is_valid && row.errors.length ? (
                  <ul className="questionImportErrorList">
                    {row.errors.map((rowError) => (
                      <li key={rowError}>{rowError}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>

          {validPreviewRows.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>{validPreviewRows.length} comprehension rows are ready to import</strong>
                <span>Finalizing will create shared passages from the current valid preview payloads.</span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
