import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";
import { validateImageUpload } from "@/lib/http/upload-validation";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export async function POST(request: Request) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Portal API is not configured." }, { status: 500 });
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["teacher", "institute_admin", "platform_admin"])) {
    return NextResponse.json({ detail: "Portal session is not available." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Upload an image file first." }, { status: 400 });
  }

  const fileError = validateImageUpload(file);
  if (fileError) {
    return NextResponse.json({ detail: fileError }, { status: 400 });
  }

  const upstreamForm = new FormData();
  upstreamForm.set("file", file);
  upstreamForm.set("alt_text", String(formData.get("alt_text") ?? "").trim());
  upstreamForm.set("title", String(formData.get("title") ?? "").trim());

  const response = await fetch(`${API_BASE_URL}/api/v1/question-bank/attachments/upload-inline-image/`, {
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
