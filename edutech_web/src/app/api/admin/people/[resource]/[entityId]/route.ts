import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const RESOURCE_PATHS: Record<string, string> = {
  students: "/api/v1/students/",
  teachers: "/api/v1/teachers/",
};

function ensureInstituteScope(
  instituteId: unknown,
  session: Awaited<ReturnType<typeof getAuthenticatedSession>>,
) {
  if (!session || session.profile.role !== "institute_admin") {
    return null;
  }

  if (!session.profile.institute) {
    return NextResponse.json(
      { detail: "Institute scope is not available for this session." },
      { status: 403 },
    );
  }

  if (typeof instituteId !== "string" || instituteId !== session.profile.institute) {
    return NextResponse.json(
      { detail: "You can only manage people inside your institute scope." },
      { status: 403 },
    );
  }

  return null;
}

async function ensureDeleteScope(
  backendPath: string,
  entityId: string,
  session: Awaited<ReturnType<typeof getAuthenticatedSession>>,
) {
  if (!session || session.profile.role !== "institute_admin") {
    return null;
  }

  if (!session.profile.institute) {
    return NextResponse.json(
      { detail: "Institute scope is not available for this session." },
      { status: 403 },
    );
  }

  const lookupResponse = await fetch(`${API_BASE_URL}${backendPath}${entityId}/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!lookupResponse.ok) {
    const text = await lookupResponse.text();
    return new NextResponse(text, {
      status: lookupResponse.status,
      headers: {
        "Content-Type": lookupResponse.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const payload = (await lookupResponse.json().catch(() => ({}))) as {
    institute?: unknown;
  };
  return ensureInstituteScope(payload.institute, session);
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
  const backendPath = RESOURCE_PATHS[resource];

  if (!backendPath) {
    return NextResponse.json({ detail: "Unsupported people resource." }, { status: 400 });
  }

  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Portal API is not configured." }, { status: 500 });
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["platform_admin", "institute_admin"])) {
    return NextResponse.json({ detail: "Portal session is not available." }, { status: 401 });
  }

  const body = request.body ? await request.json().catch(() => ({})) : {};
  const scopeError = ensureInstituteScope(
    typeof body === "object" && body ? (body as Record<string, unknown>).institute : undefined,
    session,
  );
  if (scopeError) {
    return scopeError;
  }

  const response = await fetch(`${API_BASE_URL}${backendPath}${entityId}/`, {
    method: "PATCH",
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

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string; entityId: string }>;
  },
) {
  const { resource, entityId } = await params;
  const backendPath = RESOURCE_PATHS[resource];

  if (!backendPath) {
    return NextResponse.json({ detail: "Unsupported people resource." }, { status: 400 });
  }

  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Portal API is not configured." }, { status: 500 });
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["platform_admin", "institute_admin"])) {
    return NextResponse.json({ detail: "Portal session is not available." }, { status: 401 });
  }

  const lookupResponse = await fetch(`${API_BASE_URL}${backendPath}${entityId}/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!lookupResponse.ok) {
    const text = await lookupResponse.text();
    return new NextResponse(text, {
      status: lookupResponse.status,
      headers: {
        "Content-Type": lookupResponse.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const payload = (await lookupResponse.json().catch(() => ({}))) as {
    institute?: unknown;
  };
  const scopeError = ensureInstituteScope(payload.institute, session);
  if (scopeError) {
    return scopeError;
  }

  return NextResponse.json(payload);
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string; entityId: string }>;
  },
) {
  const { resource, entityId } = await params;
  const backendPath = RESOURCE_PATHS[resource];

  if (!backendPath) {
    return NextResponse.json({ detail: "Unsupported people resource." }, { status: 400 });
  }

  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Portal API is not configured." }, { status: 500 });
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["platform_admin", "institute_admin"])) {
    return NextResponse.json({ detail: "Portal session is not available." }, { status: 401 });
  }

  const scopeError = await ensureDeleteScope(backendPath, entityId, session);
  if (scopeError) {
    return scopeError;
  }

  const response = await fetch(`${API_BASE_URL}${backendPath}${entityId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
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
