import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/exams/advanced-templates/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE_URL}/api/v1/exams/advanced-templates/`, {
    method: "POST",
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
