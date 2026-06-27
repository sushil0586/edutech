export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

function parseTimeout(value: string | undefined) {
  if (!value) {
    return 20_000;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20_000;
  }

  return parsed;
}

export const API_REQUEST_TIMEOUT_MS = parseTimeout(
  process.env.EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS,
);

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}
