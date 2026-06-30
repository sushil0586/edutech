import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
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

  const queryString = request.nextUrl.searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/economy/admin/question-bank-package-report/${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    },
  );

  const body = await response.arrayBuffer();
  const nextResponse = new NextResponse(body, {
    status: response.status,
  });

  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");

  if (contentType) {
    nextResponse.headers.set("Content-Type", contentType);
  }
  if (contentDisposition) {
    nextResponse.headers.set("Content-Disposition", contentDisposition);
  }

  return nextResponse;
}
