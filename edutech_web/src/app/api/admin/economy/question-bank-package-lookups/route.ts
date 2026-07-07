import { NextRequest, NextResponse } from "next/server";
import { fetchPortalList } from "@/lib/api/portal";

type ProgramRecord = {
  id: string;
  institute: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  institute: string;
  program?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
};

type TopicRecord = {
  id: string;
  institute: string;
  subject?: string | null;
  name: string;
  code?: string;
  is_active: boolean;
};

export async function GET(request: NextRequest) {
  const instituteId = request.nextUrl.searchParams.get("institute")?.trim() ?? "";
  const querySuffix = instituteId ? `&institute=${encodeURIComponent(instituteId)}` : "";

  try {
    const [programs, subjects, topics] = await Promise.all([
      fetchPortalList<ProgramRecord>(`/api/v1/academics/programs/?page_size=200${querySuffix}`),
      fetchPortalList<SubjectRecord>(`/api/v1/academics/subjects/?page_size=200${querySuffix}`),
      fetchPortalList<TopicRecord>(`/api/v1/academics/topics/?page_size=400${querySuffix}`),
    ]);

    return NextResponse.json({
      programs,
      subjects,
      topics,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Unable to load package editor lookups.",
      },
      { status: 500 },
    );
  }
}
