import { API_BASE_URL, isApiConfigured } from "@/lib/config";

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export class MobileApiError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "MobileApiError";
    this.fieldErrors = fieldErrors;
  }
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  if (!isApiConfigured()) {
    throw new MobileApiError("EXPO_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const fieldErrors = Object.fromEntries(
      Object.entries(payload)
        .map(([key, value]) => [key, firstError(value)] as const)
        .filter(([, value]) => Boolean(value)),
    );

    const message =
      firstError(payload.detail) ||
      firstError(payload.message) ||
      firstError(payload.error) ||
      Object.values(fieldErrors)[0] ||
      `Request failed with status ${response.status}`;

    throw new MobileApiError(message, fieldErrors);
  }

  return (await response.json()) as T;
}
