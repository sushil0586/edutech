"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  QuestionImportPreview,
  QuestionImportPreviewRow,
} from "@/lib/api/teacher-builder";
import {
  buildQuestionImportSampleTemplates,
  type QuestionImportSampleTemplate,
} from "@/lib/teacher/question-import-samples";
import { QUESTION_IMPORT_TYPE_GUIDANCE } from "@/lib/teacher/question-import-contract";
import { getQuestionBankFieldLabel } from "@/lib/teacher/question-bank-validation";

type ImportFieldErrors = Partial<Record<"file", string>>;
type QuestionImportFinalizeFailure = {
  row_number?: number | null;
  question_text?: string;
  errors?: Record<string, string[]>;
};

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

function rowMessages(row: QuestionImportPreviewRow) {
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

function hasDuplicateSignal(row: QuestionImportPreviewRow) {
  return rowMessages(row).some((message) => {
    const normalized = message.toLowerCase();
    return normalized.includes("duplicate") || normalized.includes("already exists");
  });
}

function hasComprehensionConflictSignal(row: QuestionImportPreviewRow) {
  return rowMessages(row).some((message) => {
    const normalized = message.toLowerCase();
    return normalized.includes("passage order") || normalized.includes("comprehension order");
  });
}

function finalizeFailureMessages(failure: QuestionImportFinalizeFailure) {
  return Object.values(failure.errors ?? {}).flatMap((value) =>
    normalizeImportMessages(
      Array.isArray(value)
        ? value.map((item) => String(item))
        : typeof value === "string"
          ? value
          : undefined,
    ),
  );
}

export function TeacherQuestionImportWorkspace({
  backHref = "/teacher/question-bank",
  csvContent,
  finalizeApiPath = "/api/question-bank/finalize-import",
  formId = "teacher-question-import-form",
  previewApiPath = "/api/question-bank/preview-import",
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
  const [preview, setPreview] = useState<QuestionImportPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ImportFieldErrors>({});
  const [finalizeRecovery, setFinalizeRecovery] = useState<{
    createdCount: number;
    failedCount: number;
    failures: QuestionImportFinalizeFailure[];
  } | null>(null);

  const validPreviewRows = useMemo(
    () => preview?.rows.filter((row) => row.is_valid) ?? [],
    [preview],
  );
  const invalidPreviewRows = useMemo(
    () => preview?.rows.filter((row) => !row.is_valid) ?? [],
    [preview],
  );
  const repeatedErrorFields = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of invalidPreviewRows) {
      for (const field of row.error_fields ?? []) {
        counts.set(field, (counts.get(field) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [invalidPreviewRows]);
  const repeatedExpectations = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of invalidPreviewRows) {
      for (const expectation of row.expectations ?? []) {
        counts.set(expectation, (counts.get(expectation) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [invalidPreviewRows]);
  const duplicateRows = useMemo(
    () => invalidPreviewRows.filter((row) => hasDuplicateSignal(row)),
    [invalidPreviewRows],
  );
  const comprehensionConflictRows = useMemo(
    () => invalidPreviewRows.filter((row) => hasComprehensionConflictSignal(row)),
    [invalidPreviewRows],
  );
  const sampleTemplates = useMemo<QuestionImportSampleTemplate[]>(
    () => buildQuestionImportSampleTemplates(templateColumns),
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
    setFinalizeRecovery(null);

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
    setFinalizeRecovery(null);

    try {
      const response = await fetch(finalizeApiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          Object.fromEntries(
            Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ImportFieldErrors,
        );
        throw new Error(nextMessage);
      }

      const payload = (await response.json()) as {
        created_count?: number;
        failed_count?: number;
        failures?: Array<{ row_number?: number | null; question_text?: string; errors?: Record<string, string[]> }>;
        error?: string;
      };

      const createdCount =
        "created_count" in payload && typeof payload.created_count === "number"
          ? payload.created_count
          : 0;
      const failedCount =
        "failed_count" in payload && typeof payload.failed_count === "number"
          ? payload.failed_count
          : 0;
      const failures = Array.isArray(payload.failures) ? payload.failures : [];
      setMessage(
        failedCount > 0
          ? `${createdCount} questions were imported. ${failedCount} row(s) are still blocked after final import. Fix those rows first, then preview the CSV again.`
          : `${createdCount} questions were imported into the question bank.`,
      );
      setFinalizeRecovery(
        failedCount > 0
          ? {
              createdCount,
              failedCount,
              failures,
            }
          : null,
      );
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
    <div className={`questionImportShell ${workspaceClassName}`.trim()}>
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      {finalizeRecovery ? (
        <section className="contentCard questionImportPanel">
          <div className="builderSectionHeader">
            <div>
              <strong>Finalize recovery</strong>
              <p>
                Some questions were created, but a few rows were blocked in the final backend checks.
              </p>
            </div>
          </div>

          <div className="builderMiniBanner">
            <div>
              <strong>What imported vs what is blocked</strong>
              <span>
                {finalizeRecovery.createdCount} row(s) were created. {finalizeRecovery.failedCount} row(s) stayed blocked.
                Fix the blocked rows first, then preview the CSV again before retrying the final import.
              </span>
            </div>
          </div>

          <div className="questionImportRowGrid">
            {finalizeRecovery.failures.map((failure, index) => {
              const failureMessages = finalizeFailureMessages(failure);
              const failureLabel =
                typeof failure.row_number === "number" ? `Row ${failure.row_number}` : `Blocked row ${index + 1}`;

              return (
                <article
                  className="questionImportRowCard questionImportRowCardInvalid"
                  key={`${failure.row_number ?? "blocked"}-${failure.question_text ?? index}`}
                >
                  <div className="questionImportRowMeta">
                    <strong>{failureLabel}</strong>
                    <span>Blocked after finalize</span>
                  </div>
                  <p>{failure.question_text?.trim() || "The backend blocked this row after preview validation."}</p>
                  {failureMessages.length ? (
                    <ul className="questionImportErrorList">
                      {failureMessages.map((failureMessage) => (
                        <li key={`${failureLabel}-${failureMessage}`}>{failureMessage}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

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
          <span>Duplicate risk rows</span>
          <strong>{duplicateRows.length}</strong>
          <small>
            {duplicateRows.length
              ? "Rows match existing or repeated question content"
              : "No duplicate-content risks detected in this preview"}
          </small>
        </article>
        <article className="builderSummaryCard">
          <span>Comprehension order conflicts</span>
          <strong>{comprehensionConflictRows.length}</strong>
          <small>
            {comprehensionConflictRows.length
              ? "Rows reuse passage order inside the same set"
              : "No comprehension-order conflicts detected"}
          </small>
        </article>
      </section>

      <section className="contentCard questionImportPanel">
        <div className="builderSectionHeader">
          <div>
            <strong>Template and upload</strong>
            <p>
              Download the live CSV structure, fill it with question rows, then preview the import before committing anything.
            </p>
          </div>
          <div className="questionBankButtonRow">
            <button className="button buttonSecondary" onClick={downloadTemplate} type="button">
              Download Template
            </button>
            <Link className="button buttonGhost" href={backHref}>
              View Bank
            </Link>
          </div>
        </div>

        <div className="builderMiniBanner">
          <div>
            <strong>Expected CSV headers</strong>
            <span>{templateColumns.join(" • ")}</span>
          </div>
        </div>

        <div className="builderMiniBanner">
          <div>
            <strong>Type-specific columns</strong>
            <span>
              {QUESTION_IMPORT_TYPE_GUIDANCE}
            </span>
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
              If you use <code>passage_title</code>, import that comprehension set first and match the title exactly.
            </span>
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
                data-testid="question-import-file-input"
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
              {isPreviewing ? "Building Preview..." : "Preview Import"}
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
                Review valid rows, inspect row-level issues, and only finalize once the import looks clean.
              </p>
            </div>
            <button
              className="button buttonPrimary"
              disabled={isFinalizing || preview.valid_payloads.length === 0}
              onClick={finalizeImport}
              type="button"
            >
              {isFinalizing ? "Importing Questions..." : `Import Valid Rows (${preview.valid_rows})`}
            </button>
          </div>

          {validPreviewRows.length && invalidPreviewRows.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Some rows can proceed now, some are blocked</strong>
                <span>
                  {validPreviewRows.length} valid row(s) can still be finalized from this preview. {invalidPreviewRows.length} row(s)
                  need fixes first, starting with duplicate content or the field-level issues listed below.
                </span>
              </div>
            </div>
          ) : null}

          {repeatedErrorFields.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Most common fix areas</strong>
                <span>
                  {repeatedErrorFields
                    .slice(0, 5)
                    .map(([field, count]) => `${labelImportField(field)} (${count})`)
                    .join(" • ")}
                </span>
              </div>
            </div>
          ) : null}

          {duplicateRows.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Duplicate rows need attention first</strong>
                <span>
                  {duplicateRows.length} row(s) look like repeated or already-existing questions. Review the
                  question text and academic scope before the final import. Any remaining valid rows can still proceed.
                </span>
              </div>
            </div>
          ) : null}

          {comprehensionConflictRows.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Comprehension order conflicts detected</strong>
                <span>
                  {comprehensionConflictRows.length} row(s) reuse a `passage_order`. Each linked question inside the
                  same comprehension set needs a unique order.
                </span>
              </div>
            </div>
          ) : null}

          {repeatedExpectations.length ? (
            <div className="builderMiniBanner">
              <div>
                <strong>Most repeated row guidance</strong>
                <span>
                  {repeatedExpectations
                    .slice(0, 3)
                    .map(([expectation, count]) => `${expectation} (${count})`)
                    .join(" • ")}
                </span>
              </div>
            </div>
          ) : null}

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
                  {row.passage_title ? (
                    <span className="questionBankMetaChip">
                      Passage: {row.passage_title}
                      {row.passage_order ? ` • Order ${row.passage_order}` : ""}
                    </span>
                  ) : null}
                  {row.status ? (
                    <span className="questionBankMetaChip">{row.status}</span>
                  ) : null}
                  {row.tag_values?.map((tagValue) => (
                    <span className="questionBankTagChip" key={`${row.row_number}-tag-${tagValue}`}>
                      {tagValue}
                    </span>
                  ))}
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
                <strong>{validPreviewRows.length} rows are ready to import</strong>
                <span>
                  Importing now will create backend questions from the current valid preview payloads.
                </span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
