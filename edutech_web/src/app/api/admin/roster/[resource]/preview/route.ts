import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";
import { validateCsvUpload } from "@/lib/http/upload-validation";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const RESOURCE_PATHS: Record<string, string> = {
  students: "/api/v1/students/preview-import/",
  teachers: "/api/v1/teachers/preview-import/",
};

export async function POST(
  request: Request,
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

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["platform_admin"])) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const institute = formData.get("institute");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "Upload a CSV file first." },
      { status: 400 },
    );
  }

  const fileError = validateCsvUpload(file);
  if (fileError) {
    return NextResponse.json({ detail: fileError }, { status: 400 });
  }

  const upstreamForm = new FormData();
  upstreamForm.set("file", file);
  if (typeof institute === "string" && institute.trim()) {
    upstreamForm.set("institute", institute.trim());
  }

  const response = await fetch(`${API_BASE_URL}${backendPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: upstreamForm,
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
