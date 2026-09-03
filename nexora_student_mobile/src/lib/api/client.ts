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

export type MobileApiTrace = {
  phase: "start" | "response" | "non_ok" | "error" | "success";
  url: string;
  method: string;
  timeoutMs?: number;
  status?: number;
  ok?: boolean;
  message?: string;
  errorName?: string;
  errorMessage?: string;
};

let latestMobileApiTrace: MobileApiTrace | null = null;

export function getLatestMobileApiTrace() {
  return latestMobileApiTrace;
}

function setLatestMobileApiTrace(trace: MobileApiTrace) {
  latestMobileApiTrace = trace;
}

function logApiTrace(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.log(`[mobile-api] ${message}`, details);
    return;
  }

  console.log(`[mobile-api] ${message}`);
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
  const url = `${API_BASE_URL}${path}`;
  const method = init?.method ?? "GET";

  let response: Response;
  try {
    setLatestMobileApiTrace({
      phase: "start",
      url,
      method,
      timeoutMs: API_REQUEST_TIMEOUT_MS,
    });
    logApiTrace("request:start", {
      url,
      method,
      timeoutMs: API_REQUEST_TIMEOUT_MS,
    });

    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
      body: init?.body,
      signal: controller.signal,
    });
    setLatestMobileApiTrace({
      phase: "response",
      url,
      method,
      status: response.status,
      ok: response.ok,
    });
    logApiTrace("request:response", {
      url,
      method,
      status: response.status,
      ok: response.ok,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    setLatestMobileApiTrace({
      phase: "error",
      url,
      method,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    logApiTrace("request:error", {
      url,
      method,
      errorName: error instanceof Error ? error.name : "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
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

    setLatestMobileApiTrace({
      phase: "non_ok",
      url,
      method,
      status: response.status,
      message,
    });
    logApiTrace("request:non-ok", {
      url,
      method,
      status: response.status,
      message,
      fieldErrors,
    });

    throw new MobileApiError(message, fieldErrors, response.status);
  }

  const payload = (await response.json()) as T;
  setLatestMobileApiTrace({
    phase: "success",
    url,
    method,
    status: response.status,
    ok: response.ok,
  });
  logApiTrace("request:success", {
    url,
    method,
  });
  return payload;
}
