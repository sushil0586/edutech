const CSV_MIME_TYPES = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
]);

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateCsvUpload(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  const mimeType = file.type.trim().toLowerCase();

  if (!normalizedName.endsWith(".csv")) {
    return "Upload a CSV file.";
  }

  if (file.size <= 0) {
    return "The uploaded CSV is empty.";
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return "Upload a CSV smaller than 5 MB.";
  }

  if (mimeType && !CSV_MIME_TYPES.has(mimeType)) {
    return "Upload a valid CSV file.";
  }

  return "";
}
