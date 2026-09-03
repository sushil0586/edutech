import { NextRequest, NextResponse } from "next/server";
import {
  PORTAL_ROLE_GROUPS,
  getAuthenticatedSession,
  hasRequiredRole,
} from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

type AcademicYearRecord = {
  id: string;
  name: string;
  is_current: boolean;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  category: string;
  is_active: boolean;
};

type CohortRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

function normalizePeopleView(view: string | null) {
  return view === "teachers" ? "teachers" : "students";
}

async function fetchList<T>(accessToken: string, path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [] as T[];
  }

  const payload = (await response.json().catch(() => ({}))) as { results?: T[] };
  return Array.isArray(payload.results) ? payload.results : [];
}

async function fetchCount(accessToken: string, path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return 0;
  }

  const payload = (await response.json().catch(() => ({}))) as { count?: number };
  return Number(payload.count ?? 0);
}

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "Portal API is not configured." }, { status: 500 });
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, PORTAL_ROLE_GROUPS.platformAdminOnly)) {
    return NextResponse.json({ detail: "Portal session is not available." }, { status: 401 });
  }

  const view = normalizePeopleView(request.nextUrl.searchParams.get("view"));
  const instituteId = request.nextUrl.searchParams.get("institute")?.trim() || "";
  const instituteQuery = instituteId ? `?institute=${instituteId}&page_size=100` : "?page_size=100";
  const rosterQuery = instituteId ? `?institute=${instituteId}&page_size=8` : "?page_size=8";
  const resourcePath = view === "students" ? "/api/v1/students/" : "/api/v1/teachers/";
  const countPath = instituteId ? `${resourcePath}?institute=${instituteId}` : resourcePath;
  const needsStudentAcademics = view === "students";

  const [academicYears, programs, cohorts, visibleRows, visibleCount] = await Promise.all([
    needsStudentAcademics
      ? fetchList<AcademicYearRecord>(session.accessToken, `/api/v1/academics/academic-years/${instituteQuery}`)
      : Promise.resolve([] as AcademicYearRecord[]),
    needsStudentAcademics
      ? fetchList<ProgramRecord>(session.accessToken, `/api/v1/academics/programs/${instituteQuery}`)
      : Promise.resolve([] as ProgramRecord[]),
    needsStudentAcademics
      ? fetchList<CohortRecord>(session.accessToken, `/api/v1/academics/cohorts/${instituteQuery}`)
      : Promise.resolve([] as CohortRecord[]),
    fetchList<Record<string, unknown>>(session.accessToken, `${resourcePath}${rosterQuery}`),
    fetchCount(session.accessToken, countPath),
  ]);

  return NextResponse.json({
    academicYears,
    activeView: view,
    cohorts,
    programs,
    selectedInstituteId: instituteId || null,
    visibleCount,
    visibleRows,
  });
}
