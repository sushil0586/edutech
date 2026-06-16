"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type RosterImportPreviewRow = {
  row_number: number;
  status: string;
  display_name: string;
  identifier: string;
  username: string;
  create_login: boolean;
  errors: Record<string, string>;
};

type RosterImportPreview = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: RosterImportPreviewRow[];
  valid_payloads: Record<string, unknown>[];
};

type BulkImportResult = {
  created_count: number;
  failed_count: number;
  errors: Record<string, unknown>[];
  credentials: Record<string, unknown>[];
};

type RosterImportDialogProps = {
  open: boolean;
  title: string;
  subtitle: string;
  instituteId: string;
  resource: "students" | "teachers";
  onClose: () => void;
  onImported: (result: BulkImportResult) => void;
};

type ImportFieldErrors = Partial<Record<"file" | "institute", string>>;

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const fieldErrors: ImportFieldErrors = {
    file: Array.isArray(payload.file) ? String(payload.file[0]) : typeof payload.file === "string" ? payload.file : "",
    institute:
      Array.isArray(payload.institute)
        ? String(payload.institute[0])
        : typeof payload.institute === "string"
          ? payload.institute
          : "",
  };
  const message =
    (typeof payload.detail === "string" && payload.detail) ||
    (typeof payload.error === "string" && payload.error) ||
    fieldErrors.file ||
    fieldErrors.institute ||
    `Request failed with status ${response.status}`;
  return { fieldErrors, message };
}

export function RosterImportDialog({
  open,
  title,
  subtitle,
  instituteId,
  resource,
  onClose,
  onImported,
}: RosterImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ImportFieldErrors>({});
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const templateUrl = useMemo(
    () => `/api/admin/roster/${resource}/template`,
    [resource],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  async function downloadTemplate() {
    setLoading(true);
    setMessage("");
    setFieldErrors({});
    try {
      const response = await fetch(templateUrl);
      if (!response.ok) {
        const { message } = await readErrorMessage(response);
        throw new Error(message);
      }
      const payload = (await response.json()) as { csv_content?: string };
      const blob = new Blob([payload.csv_content ?? ""], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${resource}_import_template.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Template downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template download failed.");
    } finally {
      setLoading(false);
    }
  }

  async function previewImport() {
    if (!file) {
      setFieldErrors({ file: "Choose a CSV file before previewing." });
      setMessage("Choose a CSV file before previewing.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("institute", instituteId);
      const response = await fetch(`/api/admin/roster/${resource}/preview`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message } = await readErrorMessage(response);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ImportFieldErrors,
        );
        throw new Error(message);
      }
      const payload = (await response.json()) as { preview?: RosterImportPreview };
      setPreview(payload.preview ?? null);
      setMessage("Preview generated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setLoading(false);
    }
  }

  async function finalizeImport() {
    if (!preview) {
      setMessage("Generate a preview before finalizing.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});
    try {
      const response = await fetch(`/api/admin/roster/${resource}/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institute: instituteId,
          valid_payloads: preview.valid_payloads,
        }),
      });
      if (!response.ok) {
        const { fieldErrors: nextFieldErrors, message } = await readErrorMessage(response);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(nextFieldErrors).filter(([, value]) => Boolean(value)),
          ) as ImportFieldErrors,
        );
        throw new Error(message);
      }
      const result = (await response.json()) as BulkImportResult;
      setMessage("Import completed successfully.");
      onImported(result);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Finalize failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="rosterImportOverlay" role="presentation" onClick={onClose}>
      <div
        aria-modal="true"
        className="rosterImportDialog dashboardPanel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="studentPageTight">
          <div className="academicSectionHeader">
            <div>
              <span className="eyebrow">Roster import</span>
              <h3>{title}</h3>
            </div>
            <button className="appTopbarAction setupSecondaryAction" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <p className="academicSectionDescription">{subtitle}</p>

          <div className="setupFieldActions">
            <button className="appTopbarAction" disabled={loading} onClick={() => void downloadTemplate()} type="button">
              <span className="appTopbarActionIcon" aria-hidden="true">⬇</span>
              Download template
            </button>
          </div>

          <div className="setupFormGrid setupFormGridDense">
            <label className="setupField">
              <span>CSV file</span>
              <input
                accept=".csv"
                aria-invalid={Boolean(fieldErrors.file)}
                className={fieldErrors.file ? "setupFieldInvalid" : undefined}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              {fieldErrors.file ? <small className="setupFieldError">{fieldErrors.file}</small> : null}
            </label>
          </div>

          <div className="setupFieldActions">
            <button className="appTopbarAction" disabled={loading || !file} onClick={() => void previewImport()} type="button">
              <span className="appTopbarActionIcon" aria-hidden="true">◌</span>
              Preview import
            </button>
            <button className="appTopbarAction" disabled={loading || !preview} onClick={() => void finalizeImport()} type="button">
              <span className="appTopbarActionIcon" aria-hidden="true">✓</span>
              Import valid rows
            </button>
          </div>

          {message ? <p className="authMeta">{message}</p> : null}

          {preview ? (
            <div className="featurePlaceholder rosterPreviewPanel">
              <div className="dashboardSummaryGrid rosterPreviewMetrics">
                <article className="metricCard metricCardPrimary">
                  <span>Rows</span>
                  <strong>{preview.total_rows}</strong>
                </article>
                <article className="metricCard">
                  <span>Valid</span>
                  <strong>{preview.valid_rows}</strong>
                </article>
                <article className="metricCard">
                  <span>Invalid</span>
                  <strong>{preview.invalid_rows}</strong>
                </article>
              </div>

              <div className="rosterPreviewList">
                {preview.rows.map((row) => (
                  <div className="rosterPreviewRow" key={row.row_number}>
                    <div>
                      <strong>{row.display_name || `Row ${row.row_number}`}</strong>
                      <span>{row.identifier}</span>
                      {row.username ? <span>Username: {row.username}</span> : null}
                    </div>
                    <div>
                      <strong>{row.status === "valid" ? "Valid" : "Issue"}</strong>
                      <span>{row.create_login ? "Login included" : "Profile only"}</span>
                    </div>
                    <div>
                      {row.status !== "valid" ? (
                        <span className="authMeta">
                          {Object.entries(row.errors)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" | ")}
                        </span>
                      ) : (
                        <span className="authMeta">Ready to import.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
