import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
};

type SubjectRecord = {
  id: string;
  name: string;
  code: string;
  program: string | null;
};

type TopicRecord = {
  id: string;
  name: string;
  code: string;
  subject: string;
  parent_topic: string | null;
};

type MasterLibraryQuestion = {
  id: string;
  question_text: string;
  source_program_code: string | null;
  source_subject_code: string | null;
  source_topic_code: string | null;
};

type PaginatedResponse<T> = {
  count?: number;
  results?: T[];
};

const CLASS_8_MATH_TOPIC_GROUPS = [
  "Rational Numbers",
  "Linear Equations in One Variable",
  "Comparing Quantities",
  "Algebraic Expressions and Identities",
] as const;

const EXPECTED_TOTAL_QUESTIONS = 200;
const EXPECTED_QUESTIONS_PER_TOPIC_GROUP = 50;
const CANDIDATE_PUBLIC_INSTITUTE_CODES = ["PUB001", "NEXORA-PUBLIC"] as const;
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function normalizeQuestionText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function fetchPaginated<T>(
  request: APIRequestContext,
  accessToken: string,
  path: string,
): Promise<PaginatedResponse<T>> {
  const response = await request.get(`${backendBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as PaginatedResponse<T>;
}

async function fetchResults<T>(request: APIRequestContext, accessToken: string, path: string): Promise<T[]> {
  const body = await fetchPaginated<T>(request, accessToken, path);
  if (Array.isArray(body.results)) {
    return body.results;
  }
  return Array.isArray(body as unknown) ? (body as T[]) : [];
}

async function fetchAllPaginatedResults<T>(
  request: APIRequestContext,
  accessToken: string,
  path: string,
): Promise<{ count: number; results: T[] }> {
  const separator = path.includes("?") ? "&" : "?";
  const firstPagePath = `${path}${separator}page=1`;
  const firstPage = await fetchPaginated<T>(request, accessToken, firstPagePath);
  const accumulated = Array.isArray(firstPage.results) ? [...firstPage.results] : [];
  const totalCount = firstPage.count ?? accumulated.length;

  let currentPage = 2;
  while (accumulated.length < totalCount) {
    const pageBody = await fetchPaginated<T>(
      request,
      accessToken,
      `${path}${separator}page=${currentPage}`,
    );
    const pageResults = Array.isArray(pageBody.results) ? pageBody.results : [];
    if (!pageResults.length) {
      break;
    }
    accumulated.push(...pageResults);
    currentPage += 1;
  }

  return {
    count: totalCount,
    results: accumulated,
  };
}

async function openAcademicSetup(page: Page) {
  await page.goto("/admin/academic-setup");
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
}

test.describe("Admin Class 8 Math master dataset verification", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test("@workflow @admin admin can verify the seeded Class 8 Math public master dataset", async ({ page }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await openAcademicSetup(page);

    const adminAccessToken = (
      await page.context().cookies()
    ).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
    expect(adminAccessToken).not.toBe("");

    const institutes = await fetchResults<InstituteRecord>(
      page.request,
      adminAccessToken,
      "/api/v1/institutes/?page_size=100",
    );
    const publicInstitute = institutes.find((item) => CANDIDATE_PUBLIC_INSTITUTE_CODES.includes(item.code as (typeof CANDIDATE_PUBLIC_INSTITUTE_CODES)[number]));
    expect(publicInstitute, "Expected a public/master institute such as PUB001 or NEXORA-PUBLIC.").toBeTruthy();

    const programs = await fetchResults<ProgramRecord>(
      page.request,
      adminAccessToken,
      `/api/v1/academics/programs/?institute=${encodeURIComponent(publicInstitute!.id)}&page_size=200`,
    );
    const class8Program = programs.find(
      (item) => /class 8/i.test(item.name) && /^class_8|^cls8/i.test(item.code),
    );
    expect(class8Program, "Expected a Class 8 program in the public academic registry.").toBeTruthy();

    const subjects = await fetchResults<SubjectRecord>(
      page.request,
      adminAccessToken,
      `/api/v1/academics/subjects/?institute=${encodeURIComponent(publicInstitute!.id)}&page_size=200`,
    );
    const class8MathSubject = subjects.find(
      (item) =>
        item.program === class8Program!.id &&
        /math/i.test(item.name) &&
        /math/i.test(item.code),
    );
    expect(class8MathSubject, "Expected a Class 8 Math subject under the public Class 8 program.").toBeTruthy();

    const topics = await fetchResults<TopicRecord>(
      page.request,
      adminAccessToken,
      `/api/v1/academics/topics/?institute=${encodeURIComponent(publicInstitute!.id)}&subject=${encodeURIComponent(class8MathSubject!.id)}&page_size=400`,
    );
    const parentTopicGroups = topics.filter((item) => item.parent_topic === null);
    const childTopics = topics.filter((item) => item.parent_topic !== null);

    const selectedTopicGroups = CLASS_8_MATH_TOPIC_GROUPS.map((name) => {
      const topicGroup = parentTopicGroups.find((item) => item.name === name);
      expect(topicGroup, `Expected Class 8 Math topic group "${name}" to exist.`).toBeTruthy();
      const children = childTopics.filter((item) => item.parent_topic === topicGroup!.id);
      expect(children.length, `Expected "${name}" to have at least one child topic.`).toBeGreaterThan(0);
      return {
        topicGroup: topicGroup!,
        children,
      };
    });

    const masterLibraryBody = await fetchAllPaginatedResults<MasterLibraryQuestion>(
      page.request,
      adminAccessToken,
      `/api/v1/question-bank/master-library/?source_institute_code=${encodeURIComponent(publicInstitute!.code)}&subject_code=${encodeURIComponent(class8MathSubject!.code)}&page_size=250`,
    );
    const masterQuestions = masterLibraryBody.results;
    const totalQuestionCount = masterLibraryBody.count;

    expect(totalQuestionCount, "Expected exactly 200 Class 8 Math public master questions.").toBe(
      EXPECTED_TOTAL_QUESTIONS,
    );
    expect(masterQuestions.length).toBe(EXPECTED_TOTAL_QUESTIONS);

    const uniqueIds = new Set(masterQuestions.map((item) => item.id));
    expect(uniqueIds.size, "Question rows should not be duplicated by id.").toBe(EXPECTED_TOTAL_QUESTIONS);

    const uniqueQuestionTexts = new Set(masterQuestions.map((item) => normalizeQuestionText(item.question_text)));
    expect(
      uniqueQuestionTexts.size,
      "Question texts should be distinct for the seeded Class 8 Math dataset.",
    ).toBe(EXPECTED_TOTAL_QUESTIONS);

    const childTopicCodeToGroupName = new Map<string, string>();
    for (const entry of selectedTopicGroups) {
      for (const child of entry.children) {
        childTopicCodeToGroupName.set(child.code, entry.topicGroup.name);
      }
    }

    const countsByTopicGroup = new Map<string, number>(
      CLASS_8_MATH_TOPIC_GROUPS.map((name) => [name, 0]),
    );

    for (const question of masterQuestions) {
      expect(question.source_program_code).toBe(class8Program!.code);
      expect(question.source_subject_code).toBe(class8MathSubject!.code);
      expect(question.source_topic_code, `Question ${question.id} should map to a source topic.`).toBeTruthy();
      const topicGroupName = childTopicCodeToGroupName.get(question.source_topic_code ?? "");
      expect(
        topicGroupName,
        `Question ${question.id} is mapped to topic ${question.source_topic_code}, which is outside the selected Class 8 Math scope.`,
      ).toBeTruthy();
      countsByTopicGroup.set(topicGroupName!, (countsByTopicGroup.get(topicGroupName!) ?? 0) + 1);
    }

    for (const topicGroupName of CLASS_8_MATH_TOPIC_GROUPS) {
      expect(
        countsByTopicGroup.get(topicGroupName),
        `Expected ${EXPECTED_QUESTIONS_PER_TOPIC_GROUP} questions for "${topicGroupName}".`,
      ).toBe(EXPECTED_QUESTIONS_PER_TOPIC_GROUP);
    }
  });
});
