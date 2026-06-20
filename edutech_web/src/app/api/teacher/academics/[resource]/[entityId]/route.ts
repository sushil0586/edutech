import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const RESOURCE_PATHS: Record<string, string> = {
  "academic-years": "/api/v1/academics/academic-years/",
  programs: "/api/v1/academics/programs/",
  cohorts: "/api/v1/academics/cohorts/",
  subjects: "/api/v1/academics/subjects/",
  topics: "/api/v1/academics/topics/",
};

async function proxyAcademicRequest(
  resource: string,
  entityId: string,
  request: NextRequest,
  method: "PATCH" | "DELETE",
) {
  const backendPath = RESOURCE_PATHS[resource];

  if (!backendPath) {
    return NextResponse.json(
      { detail: "Unsupported academic resource." },
      { status: 400 },
    );
  }

  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["teacher", "institute_admin", "platform_admin"])) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const body =
    method === "PATCH" && request.body ? await request.json().catch(() => ({})) : undefined;
  const response = await fetch(`${API_BASE_URL}${backendPath}${entityId}/`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: method === "PATCH" ? JSON.stringify(body ?? {}) : undefined,
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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string; entityId: string }>;
  },
) {
  const { resource, entityId } = await params;
  return proxyAcademicRequest(resource, entityId, request, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string; entityId: string }>;
  },
) {
  const { resource, entityId } = await params;
  return proxyAcademicRequest(resource, entityId, request, "DELETE");
}
