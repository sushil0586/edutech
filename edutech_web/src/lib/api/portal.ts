import { cache } from "react";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

type PortalApiState = {
  apiBaseUrl: string;
  apiConfigured: boolean;
};

function getPortalApiState(): PortalApiState {
  return {
    apiBaseUrl: API_BASE_URL,
    apiConfigured: Boolean(API_BASE_URL),
  };
}

async function performPortalRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const state = getPortalApiState();

  if (!state.apiConfigured) {
    throw new Error("Portal API is not configured.");
  }

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Portal API request failed for ${path} with ${response.status}`;

    try {
      const payload = (await response.json()) as Record<string, unknown>;
      const detail = payload.detail;
      const apiMessage = payload.message;

      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = String(detail[0]);
      } else if (typeof apiMessage === "string" && apiMessage.trim()) {
        message = apiMessage;
      } else {
        const firstError = Object.values(payload).find((value) => {
          if (typeof value === "string" && value.trim()) return true;
          if (Array.isArray(value) && value.length > 0) return true;
          return false;
        });

        if (typeof firstError === "string") {
          message = firstError;
        } else if (Array.isArray(firstError) && firstError.length > 0) {
          message = String(firstError[0]);
        }
      }
    } catch {
      // Use the default message when the payload is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

const requestPortalJsonCached = cache(async <T>(path: string, accessToken: string) => {
  return performPortalRequest<T>(path, accessToken);
});

async function requestPortalJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new Error("Portal session is not available.");
  }

  const method = init?.method ?? "GET";
  const shouldUseCachedRead = method === "GET" && !init?.body && !init?.headers;

  if (shouldUseCachedRead) {
    return requestPortalJsonCached<T>(path, accessToken);
  }

  return performPortalRequest<T>(path, accessToken, init);
}

export async function fetchPortalCount(path: string) {
  const payload = await requestPortalJson<unknown>(path);

  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "count" in payload &&
    typeof (payload as { count?: unknown }).count === "number"
  ) {
    return (payload as { count: number }).count;
  }

  return 0;
}

export async function fetchPortalRecord<T>(path: string) {
  return requestPortalJson<T>(path);
}

export type InstituteDashboardSummary = {
  institute: {
    id: string;
    name: string;
    code: string;
    is_active: boolean;
    exam_default_count: number;
  };
  counts: {
    academic_years: number;
    programs: number;
    cohorts: number;
    subjects: number;
    topics: number;
    students: number;
    teachers: number;
    exams: number;
    results: number;
  };
  derived: {
    people_count: number;
    academic_structure_count: number;
    active_coverage_signals: number;
    readiness_score: number;
  };
};

export async function fetchInstituteDashboardSummary() {
  return requestPortalJson<InstituteDashboardSummary>("/api/v1/institute/dashboard/summary/");
}

export async function fetchPortalList<T>(path: string) {
  const payload = await requestPortalJson<{
    results?: T[];
    count?: number;
  }>(path);

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (Array.isArray(payload as unknown[])) {
    return payload as unknown as T[];
  }

  return [];
}
