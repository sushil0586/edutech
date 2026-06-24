import { NextResponse } from "next/server";
import {
  fetchCurrentAccountProfile,
  getSessionAccessToken,
} from "@/lib/auth/session";
import { validateStudentResponseArtifactUpload } from "@/lib/http/upload-validation";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const profile = await fetchCurrentAccountProfile();
  const accessToken = await getSessionAccessToken();
  const { attemptId } = await params;

  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Student API is not configured." },
      { status: 500 },
    );
  }

  if (!profile || profile.role !== "student" || !accessToken) {
    return NextResponse.json(
      { detail: "Student session is not available." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const question = String(formData.get("question") ?? "").trim();
  const assetKind = String(formData.get("asset_kind") ?? "").trim();
  const file = formData.get("file");

  if (!question) {
    return NextResponse.json(
      { detail: "Question is required for response artifact uploads." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "Choose a response artifact file before uploading." },
      { status: 400 },
    );
  }

  const fileError = validateStudentResponseArtifactUpload(file, assetKind);
  if (fileError) {
    return NextResponse.json({ detail: fileError }, { status: 400 });
  }

  const upstreamForm = new FormData();
  upstreamForm.set("question", question);
  upstreamForm.set("asset_kind", assetKind);
  upstreamForm.set("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/attempts/${attemptId}/upload-response-artifact/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: upstreamForm,
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
