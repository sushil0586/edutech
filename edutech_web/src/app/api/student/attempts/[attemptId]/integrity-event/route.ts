import { NextResponse } from "next/server";
import {
  fetchCurrentAccountProfile,
  getSessionAccessToken,
} from "@/lib/auth/session";

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
      { error: "Student API is not configured." },
      { status: 500 },
    );
  }

  if (!profile || profile.role !== "student" || !accessToken) {
    return NextResponse.json(
      { error: "Student session is not available." },
      { status: 401 },
    );
  }

  try {
    const payload = await request.json();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/attempts/${attemptId}/integrity-event/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to report this integrity event.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
