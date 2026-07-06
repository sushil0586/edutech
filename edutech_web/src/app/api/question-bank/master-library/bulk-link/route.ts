import { NextResponse } from "next/server";
import { getAuthenticatedSession, hasRequiredRole } from "@/lib/auth/session";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

type MasterLibraryQuestion = {
  id: string;
  source_subject_code: string;
  source_topic_code: string | null;
  has_access: boolean | null;
  access_status: string;
};

type MasterLibraryPage = {
  count: number;
  next: string | null;
  results: MasterLibraryQuestion[];
};

function toQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function readJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

export async function POST(request: Request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "Portal API is not configured." },
      { status: 500 },
    );
  }

  const session = await getAuthenticatedSession();
  if (!session || !hasRequiredRole(session.profile, ["institute_admin", "platform_admin"])) {
    return NextResponse.json(
      { detail: "Portal session is not available." },
      { status: 401 },
    );
  }
  const accessToken = session.accessToken;

  const payload = (await request.json().catch(() => ({}))) as {
    question_ids?: string[];
    search?: string;
    subject_code?: string;
    topic_code?: string;
    question_type?: string;
    difficulty_level?: string;
    ordering?: string;
    local_subject_code?: string;
    local_topic_code?: string;
  };

  const requestedQuestionIds = Array.isArray(payload.question_ids)
    ? payload.question_ids.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  let totalMatched = 0;
  let eligibleCount = 0;
  let linkedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  async function linkEligibleQuestions(questions: MasterLibraryQuestion[]) {
    eligibleCount += questions.length;
    for (const question of questions) {
      const linkResponse = await fetch(
        `${API_BASE_URL}/api/v1/question-bank/master-library/${question.id}/link/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            local_subject_code: payload.local_subject_code?.trim() || question.source_subject_code,
            local_topic_code: payload.local_topic_code?.trim() || question.source_topic_code || "",
          }),
          cache: "no-store",
        },
      );

      if (linkResponse.ok) {
        linkedCount += 1;
        continue;
      }

      skippedCount += 1;
      const errorPayload = await readJsonSafe(linkResponse);
      const detail =
        typeof errorPayload.detail === "string"
          ? errorPayload.detail
          : `Failed to link master question ${question.id}.`;
      if (errors.length < 5) {
        errors.push(detail);
      }
    }
  }

  if (requestedQuestionIds.length > 0) {
    const listResponse = await fetch(
      `${API_BASE_URL}/api/v1/question-bank/master-library/${toQueryString({
        page: 1,
        page_size: Math.max(requestedQuestionIds.length, 20),
        search: payload.search?.trim(),
        subject_code: payload.subject_code?.trim(),
        topic_code: payload.topic_code?.trim(),
        question_type: payload.question_type?.trim(),
        difficulty_level: payload.difficulty_level?.trim(),
        ordering: payload.ordering?.trim(),
      })}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!listResponse.ok) {
      const errorPayload = await readJsonSafe(listResponse);
      return NextResponse.json(
        {
          detail:
            typeof errorPayload.detail === "string"
              ? errorPayload.detail
              : "Unable to load the shared-library lane for bulk linking.",
        },
        { status: listResponse.status },
      );
    }

    const pagePayload = (await listResponse.json()) as MasterLibraryPage;
    const results = (Array.isArray(pagePayload.results) ? pagePayload.results : []).filter((question) =>
      requestedQuestionIds.includes(question.id),
    );
    totalMatched = results.length;
    const eligibleQuestions = results.filter((question) => {
      const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
      return Boolean(question.has_access) && accessState !== "linked";
    });
    skippedCount += results.length - eligibleQuestions.length;
    await linkEligibleQuestions(eligibleQuestions);
    return NextResponse.json(
      {
        total_matched: totalMatched,
        eligible_count: eligibleCount,
        linked_count: linkedCount,
        skipped_count: skippedCount,
        errors,
        truncated: false,
      },
      { status: 200 },
    );
  }

  let page = 1;
  const pageSize = 100;
  const maxPages = 30;
  while (page <= maxPages) {
    const listResponse = await fetch(
      `${API_BASE_URL}/api/v1/question-bank/master-library/${toQueryString({
        page,
        page_size: pageSize,
        search: payload.search?.trim(),
        subject_code: payload.subject_code?.trim(),
        topic_code: payload.topic_code?.trim(),
        question_type: payload.question_type?.trim(),
        difficulty_level: payload.difficulty_level?.trim(),
        ordering: payload.ordering?.trim(),
      })}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!listResponse.ok) {
      const errorPayload = await readJsonSafe(listResponse);
      return NextResponse.json(
        {
          detail:
            typeof errorPayload.detail === "string"
              ? errorPayload.detail
              : "Unable to load the shared-library lane for bulk linking.",
        },
        { status: listResponse.status },
      );
    }

    const pagePayload = (await listResponse.json()) as MasterLibraryPage;
    const results = Array.isArray(pagePayload.results) ? pagePayload.results : [];
    totalMatched = Number(pagePayload.count ?? totalMatched);

    const eligibleQuestions = results.filter((question) => {
      const accessState = question.access_status || (question.has_access ? "entitled" : "not_requested");
      return Boolean(question.has_access) && accessState !== "linked";
    });
    skippedCount += results.length - eligibleQuestions.length;
    await linkEligibleQuestions(eligibleQuestions);

    if (!pagePayload.next) {
      break;
    }
    page += 1;
  }

  return NextResponse.json(
    {
      total_matched: totalMatched,
      eligible_count: eligibleCount,
      linked_count: linkedCount,
      skipped_count: skippedCount,
      errors,
      truncated: page > maxPages,
    },
    { status: 200 },
  );
}
