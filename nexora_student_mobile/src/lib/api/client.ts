import { API_BASE_URL, API_REQUEST_TIMEOUT_MS, isApiConfigured } from "@/lib/config";

function firstError(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export class MobileApiError extends Error {
  fieldErrors?: Record<string, string>;
  status?: number;

  constructor(message: string, fieldErrors?: Record<string, string>, status?: number) {
    super(message);
    this.name = "MobileApiError";
    this.fieldErrors = fieldErrors;
    this.status = status;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      body: init?.body,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new MobileApiError(
        "The request took too long. Please check your connection and try again.",
      );
    }

    throw new MobileApiError(
      "We could not reach the Nexora server. Check your internet connection and try again.",
    );
  }

  clearTimeout(timeoutId);

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

    throw new MobileApiError(message, fieldErrors, response.status);
  }

  return (await response.json()) as T;
}
