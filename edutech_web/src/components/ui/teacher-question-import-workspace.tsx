"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  QuestionImportPreview,
  QuestionImportPreviewRow,
} from "@/lib/api/teacher-builder";

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
  return `nexora-question-bank-template-${stamp}.csv`;
}

export function TeacherQuestionImportWorkspace({
  backHref = "/teacher/question-bank",
  csvContent,
  finalizeApiPath = "/api/question-bank/finalize-import",
  formId = "teacher-question-import-form",
  previewApiPath = "/api/question-bank/preview-import",
  templateColumns,
}: {
  backHref?: string;
  csvContent: string;
  finalizeApiPath?: string;
  formId?: string;
  previewApiPath?: string;
  templateColumns: string[];
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<QuestionImportPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ImportFieldErrors>({});

  const validPreviewRows = useMemo(
    () => preview?.rows.filter((row) => row.is_valid) ?? [],
    [preview],
  );

  function downloadTemplate() {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTemplateFileName();
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

      const response = await fetch(previewApiPath, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message: nextMessage } = await readImportError(response);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ImportFieldErrors,
        );
        throw new Error(nextMessage);
      }

      const payload = (await response.json()) as
        | { preview?: QuestionImportPreview; error?: string }
        | QuestionImportPreview;

      const resolvedPreview =
        "preview" in payload && payload.preview ? payload.preview : (payload as QuestionImportPreview);

      setPreview(resolvedPreview);
      setMessage(
        resolvedPreview.invalid_rows > 0
          ? `Preview generated. ${resolvedPreview.invalid_rows} row(s) still need fixes before final import.`
          : "Preview generated. All rows are valid and ready for final import.",
      );
    } catch (previewError) {
      setPreview(null);
      setError(
        previewError instanceof Error && previewError.message
          ? previewError.message
          : "Unable to preview the CSV file.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function finalizeImport() {
    if (!preview || preview.valid_payloads.length === 0) {
      setFieldErrors({ file: "Add a CSV file and generate a valid preview before finalizing." });
      setError("There are no valid rows available to import.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preview_rows: preview.rows,
          valid_payloads: preview.valid_payloads,
        }),
      });

      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message: nextMessage } = await readImportError(response);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ImportFieldErrors,
        );
        throw new Error(nextMessage);
      }

      const payload = (await response.json()) as
        | { created_count?: number; error?: string }
        | { success: true; created_count: number };

      const createdCount =
        "created_count" in payload && typeof payload.created_count === "number"
          ? payload.created_count
          : 0;

      setMessage(`${createdCount} questions were imported into the question bank.`);
      setPreview(null);
      setSelectedFile(null);
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.reset();
    } catch (finalizeError) {
      setError(
        finalizeError instanceof Error && finalizeError.message
          ? finalizeError.message
          : "Unable to finalize the question import.",
      );
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <div className="questionImportShell">
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      <section className="builderSummaryGrid">
        <article className="builderSummaryCard">
          <span>Template columns</span>
          <strong>{templateColumns.length}</strong>
          <small>Backend-provided fields expected inside the CSV import file</small>
        </article>
        <article className="builderSummaryCard">
          <span>Preview valid rows</span>
          <strong>{preview?.valid_rows ?? 0}</strong>
          <small>Rows ready to be converted into question bank records</small>
        </article>
        <article className="builderSummaryCard">
          <span>Preview invalid rows</span>
          <strong>{preview?.invalid_rows ?? 0}</strong>
          <small>Rows that still need fixes before finalizing the import</small>
        </article>
        <article className="builderSummaryCard">
          <span>Preview coverage</span>
          <strong>{preview?.total_rows ?? 0}</strong>
          <small>Total CSV rows currently checked against the backend rules</small>
        </article>
      </section>

      <section className="contentCard questionImportPanel">
        <div className="builderSectionHeader">
          <div>
            <strong>Template and upload</strong>
            <p>
              Download the live CSV structure, fill it with scoped question rows, then
              preview the import before committing anything to the backend.
            </p>
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

        <form
          action="#"
          className="builderSectionCard"
          id={formId}
          onSubmit={handlePreviewSubmit}
        >
          <div className="builderGrid compact">
            <label className="fieldStack fieldStackFull">
              <span>CSV file</span>
              <input
                accept=".csv,text/csv"
                aria-invalid={Boolean(fieldErrors.file)}
                className={fieldErrors.file ? "setupFieldInvalid" : undefined}
                name="file"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
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
                const form = document.getElementById(
                  formId,
                ) as HTMLFormElement | null;
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
              <p>
                Review valid rows, inspect row-level issues, and only finalize once the
                import looks clean.
              </p>
            </div>
            <button
              className="button buttonPrimary"
              disabled={isFinalizing || preview.valid_payloads.length === 0}
              onClick={finalizeImport}
              type="button"
            >
              {isFinalizing ? "Importing Questions..." : `Finalize Import (${preview.valid_rows})`}
            </button>
          </div>

          <div className="questionImportRowGrid">
            {preview.rows.map((row: QuestionImportPreviewRow) => (
              <article
                className={
                  row.is_valid
                    ? "questionImportRowCard questionImportRowCardValid"
                    : "questionImportRowCard questionImportRowCardInvalid"
                }
                key={`${row.row_number}-${row.question_text}`}
              >
                <div className="questionImportRowMeta">
                  <strong>Row {row.row_number}</strong>
                  <span>{row.is_valid ? "Valid" : "Needs fixes"}</span>
                </div>
                <p>{row.question_text || "No question text found in this row."}</p>
                <div className="questionBankChipRow">
                  <span className="questionBankMetaChip">{row.subject_code || "No subject"}</span>
                  <span className="questionBankMetaChip">{row.topic_code || "No topic"}</span>
                  <span className="questionBankTagChip">{row.question_type || "Unknown type"}</span>
                  <span className="questionBankTagChip">
                    {row.difficulty_level || "Unknown difficulty"}
                  </span>
                </div>
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
                <strong>{validPreviewRows.length} rows are ready to import</strong>
                <span>
                  Finalizing will create backend questions from the current valid preview payloads.
                </span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
