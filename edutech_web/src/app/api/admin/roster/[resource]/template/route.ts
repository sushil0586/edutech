import { NextResponse } from "next/server";
import { getSessionAccessToken } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const RESOURCE_PATHS: Record<string, string> = {
  students: "/api/v1/students/import-template/",
  teachers: "/api/v1/teachers/import-template/",
};

export async function GET(
  _request: Request,
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
      { detail: "Unsupported roster resource." },
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

  const response = await fetch(`${API_BASE_URL}${backendPath}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
