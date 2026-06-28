import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ entitlementId: string }> },
  method: "GET" | "PATCH",
) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["platform_admin"])) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const { entitlementId } = await context.params;
  const body = method === "PATCH" ? await request.json().catch(() => ({})) : undefined;
  const response = await fetch(`${API_BASE_URL}/api/v1/economy/admin/question-bank-entitlements/${entitlementId}/`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
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
  request: NextRequest,
  context: { params: Promise<{ entitlementId: string }> },
) {
  return forwardRequest(request, context, "GET");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ entitlementId: string }> },
) {
  return forwardRequest(request, context, "PATCH");
}
