import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

function unauthorizedResponse() {
  return NextResponse.json(
    { detail: "Portal session is not available." },
    { status: 401 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ presetPackId: string }> },
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (
    !session ||
    !hasRequiredRole(session.profile, ["institute_admin", "platform_admin"])
  ) {
    return unauthorizedResponse();
  }

  const { presetPackId } = await params;
  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE_URL}/api/v1/exams/preset-packs/${presetPackId}/`, {
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ presetPackId: string }> },
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (
    !session ||
    !hasRequiredRole(session.profile, ["institute_admin", "platform_admin"])
  ) {
    return unauthorizedResponse();
  }

  const { presetPackId } = await params;
  const response = await fetch(`${API_BASE_URL}/api/v1/exams/preset-packs/${presetPackId}/`, {
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
