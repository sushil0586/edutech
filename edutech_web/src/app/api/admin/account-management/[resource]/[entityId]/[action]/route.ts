import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

async function proxyToBackend(
  path: string,
  method: "POST",
  allowedRoles: readonly string[],
  body: Record<string, unknown> = {},
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, allowedRoles)) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string; entityId: string; action: string }>;
  },
) {
  const { resource, entityId, action } = await params;
  const body = request.body ? await request.json().catch(() => ({})) : {};

  if (resource === "students" && action === "create-login") {
    return proxyToBackend(
      `/api/v1/accounts/students/${entityId}/create-login/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  if (resource === "teachers" && action === "create-login") {
    return proxyToBackend(
      `/api/v1/accounts/teachers/${entityId}/create-login/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  if (resource === "institutes" && action === "create-login") {
    return proxyToBackend(
      `/api/v1/accounts/institutes/${entityId}/create-login/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  if (resource === "users" && action === "reset-password") {
    return proxyToBackend(
      `/api/v1/accounts/users/${entityId}/reset-password/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  if (resource === "users" && action === "enable") {
    return proxyToBackend(
      `/api/v1/accounts/users/${entityId}/enable/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  if (resource === "users" && action === "disable") {
    return proxyToBackend(
      `/api/v1/accounts/users/${entityId}/disable/`,
      "POST",
      ["platform_admin", "institute_admin"],
      body,
    );
  }

  return NextResponse.json(
    { detail: "Unsupported account-management action." },
    { status: 400 },
  );
}
