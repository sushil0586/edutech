import { NextResponse } from "next/server";
import { fetchPortalList } from "@/lib/api/portal";
import { requireInstituteAdminSession } from "@/lib/auth/session";

type TeacherOption = {
  id: string;
  full_name: string;
  employee_code: string;
  is_active: boolean;
};

export async function GET() {
  try {
    const profile = await requireInstituteAdminSession();
    const teachers = await fetchPortalList<TeacherOption>(
      `/api/v1/teachers/${profile.institute ? `?institute=${profile.institute}&page_size=100` : "?page_size=100"}`,
    );

    return NextResponse.json({ teachers });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Unable to load institute teacher filters.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
