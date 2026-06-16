import { NextResponse } from "next/server";
import { finalizeTeacherQuestionImport } from "@/lib/api/teacher-builder";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";

export async function POST(request: Request) {
  const profile = await fetchCurrentAccountProfile();

  if (!profile || profile.role !== "teacher" || !profile.institute) {
    return NextResponse.json({ error: "Teacher session is not available." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      preview_rows?: unknown;
      valid_payloads?: unknown;
    };

    if (!Array.isArray(payload.preview_rows) || !Array.isArray(payload.valid_payloads)) {
      return NextResponse.json(
        { error: "Preview rows and valid payloads are required to finalize import." },
        { status: 400 },
      );
    }

    const result = await finalizeTeacherQuestionImport({
      institute: profile.institute,
      preview_rows: payload.preview_rows,
      valid_payloads: payload.valid_payloads,
    });

    return NextResponse.json({
      success: true,
      created_count: result.created_count,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to finalize the question import.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
