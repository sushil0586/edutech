import { NextResponse } from "next/server";
import {
  PORTAL_ROLE_GROUPS,
  getAuthenticatedSession,
  hasRequiredRole,
} from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

async function fetchCount(accessToken: string, path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return 0;
  }

  const payload = (await response.json().catch(() => ({}))) as { count?: number };
  return Number(payload.count ?? 0);
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, PORTAL_ROLE_GROUPS.platformAdminOnly)) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
  };

  const [instituteResponse, onboardingRunsResponse, studentCount, teacherCount, examCount] =
    await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/institutes/${id}/`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetch(`${API_BASE_URL}/api/v1/institutes/${id}/onboarding-runs/`, {
        method: "GET",
        headers,
        cache: "no-store",
      }),
      fetchCount(session.accessToken, `/api/v1/students/?institute=${id}`),
      fetchCount(session.accessToken, `/api/v1/teachers/?institute=${id}`),
      fetchCount(session.accessToken, `/api/v1/exams/?institute=${id}`),
    ]);

  if (!instituteResponse.ok) {
    const text = await instituteResponse.text();
    return new NextResponse(text, {
      status: instituteResponse.status,
      headers: {
        "Content-Type": instituteResponse.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const institute = await instituteResponse.json().catch(() => null);
  const onboardingRunsPayload = (await onboardingRunsResponse.json().catch(() => [])) as unknown;
  const onboardingRuns = Array.isArray(onboardingRunsPayload) ? onboardingRunsPayload : [];

  return NextResponse.json({
    counts: {
      examCount,
      studentCount,
      teacherCount,
    },
    institute,
    onboardingRuns,
  });
}
