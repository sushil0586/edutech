import { NextResponse } from "next/server";
import { previewTeacherQuestionImport } from "@/lib/api/teacher-builder";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { validateCsvUpload } from "@/lib/http/upload-validation";

export async function POST(request: Request) {
  const profile = await fetchCurrentAccountProfile();

  if (!profile || profile.role !== "teacher" || !profile.institute) {
    return NextResponse.json({ error: "Teacher session is not available." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a CSV file before previewing." }, { status: 400 });
    }

    const fileError = validateCsvUpload(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const preview = await previewTeacherQuestionImport({
      institute: profile.institute,
      file,
      fileName: file.name,
    });

    return NextResponse.json({ preview });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to preview the import file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
