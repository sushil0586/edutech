const CSV_MIME_TYPES = new Set([
  "application/csv",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
]);

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_PREFIX = "image/";

const ATTACHMENT_TYPE_RULES = {
  image: {
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimePrefixes: ["image/"],
    maxSizeBytes: 5 * 1024 * 1024,
    label: "image",
  },
  diagram: {
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimePrefixes: ["image/"],
    maxSizeBytes: 5 * 1024 * 1024,
    label: "diagram image",
  },
  pdf: {
    extensions: [".pdf"],
    mimePrefixes: ["application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
    label: "PDF",
  },
  audio: {
    extensions: [".mp3", ".wav", ".m4a", ".aac", ".ogg"],
    mimePrefixes: ["audio/"],
    maxSizeBytes: 20 * 1024 * 1024,
    label: "audio file",
  },
  video: {
    extensions: [".mp4", ".webm", ".mov", ".m4v"],
    mimePrefixes: ["video/"],
    maxSizeBytes: 50 * 1024 * 1024,
    label: "video file",
  },
  other: {
    extensions: [],
    mimePrefixes: [],
    maxSizeBytes: 25 * 1024 * 1024,
    label: "attachment file",
  },
} as const;

export const RESPONSE_ARTIFACT_TYPE_RULES = {
  audio_recording: {
    extensions: [".mp3", ".wav", ".m4a", ".aac", ".ogg"],
    mimePrefixes: ["audio/"],
    maxSizeBytes: 25 * 1024 * 1024,
    label: "audio recording",
  },
  video_recording: {
    extensions: [".mp4", ".webm", ".mov", ".m4v"],
    mimePrefixes: ["video/"],
    maxSizeBytes: 100 * 1024 * 1024,
    label: "video recording",
  },
  image_upload: {
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimePrefixes: ["image/"],
    maxSizeBytes: 10 * 1024 * 1024,
    label: "image file",
  },
  document_upload: {
    extensions: [".pdf"],
    mimePrefixes: ["application/pdf"],
    maxSizeBytes: 20 * 1024 * 1024,
    label: "PDF document",
  },
} as const;

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

export function validateImageUpload(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  const mimeType = file.type.trim().toLowerCase();

  if (!normalizedName.match(/\.(png|jpe?g|gif|webp|svg)$/)) {
    return "Upload a PNG, JPG, GIF, WEBP, or SVG image.";
  }

  if (file.size <= 0) {
    return "The uploaded image is empty.";
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    return "Upload an image smaller than 5 MB.";
  }

  if (mimeType && !mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return "Upload a valid image file.";
  }

  return "";
}

export function validateQuestionAttachmentUpload(
  file: File,
  attachmentType: keyof typeof ATTACHMENT_TYPE_RULES | string,
) {
  const rule = ATTACHMENT_TYPE_RULES[attachmentType as keyof typeof ATTACHMENT_TYPE_RULES];
  if (!rule) {
    return "Choose a valid attachment type.";
  }

  const normalizedName = file.name.trim().toLowerCase();
  const mimeType = file.type.trim().toLowerCase();
  const extension = normalizedName.includes(".")
    ? normalizedName.slice(normalizedName.lastIndexOf("."))
    : "";

  if (file.size <= 0) {
    return "The uploaded attachment is empty.";
  }

  if (file.size > rule.maxSizeBytes) {
    return `Upload a ${rule.label} smaller than ${Math.floor(rule.maxSizeBytes / (1024 * 1024))} MB.`;
  }

  if (attachmentType === "other") {
    return "";
  }

  const extensionMatches = rule.extensions.includes(extension as never);
  const mimeMatches = rule.mimePrefixes.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix),
  );

  if (!extensionMatches && !mimeMatches) {
    return `Upload a valid ${rule.label}.`;
  }

  return "";
}

export function validateStudentResponseArtifactUpload(
  file: File,
  assetKind: keyof typeof RESPONSE_ARTIFACT_TYPE_RULES | string,
) {
  const rule =
    RESPONSE_ARTIFACT_TYPE_RULES[
      assetKind as keyof typeof RESPONSE_ARTIFACT_TYPE_RULES
    ];

  if (!rule) {
    return "Choose a valid response artifact type.";
  }

  const normalizedName = file.name.trim().toLowerCase();
  const mimeType = file.type.trim().toLowerCase();
  const extension = normalizedName.includes(".")
    ? normalizedName.slice(normalizedName.lastIndexOf("."))
    : "";

  if (file.size <= 0) {
    return "The uploaded response artifact is empty.";
  }

  if (file.size > rule.maxSizeBytes) {
    return `Upload a ${rule.label} smaller than ${Math.floor(rule.maxSizeBytes / (1024 * 1024))} MB.`;
  }

  const extensionMatches = rule.extensions.includes(extension as never);
  const mimeMatches = rule.mimePrefixes.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix),
  );

  if (!extensionMatches && !mimeMatches) {
    return `Upload a valid ${rule.label}.`;
  }

  return "";
}
