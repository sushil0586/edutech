import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";
import { examPresetPacks as defaultExamPresetPacks } from "@/lib/assessment/exam-preset-packs";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

function unauthorizedResponse() {
  return NextResponse.json(
    { detail: "Portal session is not available." },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (
    !session ||
    !hasRequiredRole(session.profile, ["teacher", "institute_admin", "platform_admin"])
  ) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  if (!searchParams.has("is_active")) {
    searchParams.set("is_active", "true");
  }
  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/exams/preset-packs/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { count?: number; results?: Array<Record<string, unknown>> }
    | null;

  if (!response.ok || !payload) {
    const text = JSON.stringify(payload ?? { detail: "Unable to load preset packs." });
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const backendResults = Array.isArray(payload.results) ? payload.results : [];
  const mergedById = new Map<string, Record<string, unknown>>();
  for (const pack of defaultExamPresetPacks) {
    mergedById.set(pack.id, pack as unknown as Record<string, unknown>);
  }
  for (const pack of backendResults) {
    const id = String(pack.code ?? pack.id ?? "").trim();
    if (!id) continue;
    const starterPack = mergedById.get(id) ?? {};
    mergedById.set(id, {
      ...starterPack,
      id,
      resourceId: pack.id ? String(pack.id) : undefined,
      label: pack.label ?? id,
      family: pack.family ?? "Custom",
      note: pack.note ?? "",
      chip: pack.chip ?? "Managed",
      config: pack.config ?? {},
      scope_type: pack.scope_type ?? "institute",
      institute: pack.institute ?? null,
      can_manage: Boolean(pack.can_manage),
    });
  }

  return NextResponse.json({
    count: mergedById.size,
    results: Array.from(mergedById.values()),
  });
}

export async function POST(request: Request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (
    !session ||
    !hasRequiredRole(session.profile, ["institute_admin", "platform_admin"])
  ) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const response = await fetch(`${API_BASE_URL}/api/v1/exams/preset-packs/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
