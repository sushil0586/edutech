import { NextRequest, NextResponse } from "next/server";
import {
  fetchTeacherQuestionPassages,
  fetchTeacherSubjects,
  fetchTeacherTopics,
} from "@/lib/api/teacher-builder";
import { requireInstituteAdminSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstituteAdminSession();
    const searchParams = request.nextUrl.searchParams;
    const program = searchParams.get("program")?.trim() || "";
    const subject = searchParams.get("subject")?.trim() || "";

    const [subjects, topics, passages] = await Promise.all([
      program
        ? fetchTeacherSubjects({
            institute: profile.institute,
            program,
          }).catch(() => [])
        : Promise.resolve([]),
      subject
        ? fetchTeacherTopics({
            institute: profile.institute,
            subject,
          }).catch(() => [])
        : Promise.resolve([]),
      subject
        ? fetchTeacherQuestionPassages({
            program: program || undefined,
            subject,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      subjects,
      topics,
      passages,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Unable to load institute question-bank lookups.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
