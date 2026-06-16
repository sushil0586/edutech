import { NextRequest, NextResponse } from "next/server";
import { getSessionAccessToken } from "@/lib/auth/session";

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

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ resource: string }>;
  },
) {
  const { resource } = await params;
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

  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const query = request.nextUrl.searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}${backendPath}${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
