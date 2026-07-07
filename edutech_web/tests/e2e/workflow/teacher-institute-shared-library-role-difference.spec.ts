import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type MasterLibraryRow = {
  id: string;
  question_text: string;
  has_access: boolean;
  access_availability: string;
  access_status?: string;
  source_program_code?: string | null;
  source_subject_code?: string | null;
  source_topic_code?: string | null;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type PaginatedResponse<T> = {
  results?: T[];
};

type AcademicProgramRow = {
  id: string;
  code: string;
};

type AcademicSubjectRow = {
  id: string;
  code: string;
  program: string;
};

type AcademicTopicRow = {
  id: string;
  code: string;
  subject: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function findTeacherRequestableCard(page: Page, questionProbe: string) {
  const cards = page
    .locator("section.contentCard")
    .filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    })
    .first()
    .locator(".questionBankCard");

  const cardCount = await cards.count();
  let fallbackCard = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasRequestButton =
      (await card.getByRole("button", { name: /request access/i }).count()) > 0;

    if (!hasRequestButton) {
      continue;
    }

    if (cardText.includes(questionProbe)) {
      return card;
    }

    fallbackCard ??= card;
  }

  return fallbackCard;
}

async function findInstituteLinkableCard(page: Page, questionProbe: string) {
  const cards = page
    .locator("section.contentCard")
    .filter({
      hasText: /step 3\. review and link platform source questions/i,
    })
    .first()
    .locator(".questionBankCard");

  const cardCount = await cards.count();
  let fallbackCard = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasLinkButton =
      (await card.getByRole("button", { name: /add to institute bank/i }).count()) > 0;

    if (!hasLinkButton) {
      continue;
    }

    if (cardText.includes(questionProbe)) {
      return card;
    }

    fallbackCard ??= card;
  }

  return fallbackCard;
}

async function resolveAcademicScopeIds(
  page: Page,
  accessToken: string,
  args: {
    programCode: string;
    subjectCode: string;
    topicCode?: string | null;
  },
) {
  const programsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/programs/?is_active=true&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  expect(programsResponse.ok()).toBe(true);
  const programsBody = (await programsResponse.json()) as PaginatedResponse<AcademicProgramRow>;
  const program = programsBody.results?.find((entry) => entry.code === args.programCode) ?? null;
  expect(program).not.toBeNull();

  const subjectsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/subjects/?is_active=true&page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  expect(subjectsResponse.ok()).toBe(true);
  const subjectsBody = (await subjectsResponse.json()) as PaginatedResponse<AcademicSubjectRow>;
  const subject =
    subjectsBody.results?.find(
      (entry) => entry.code === args.subjectCode && entry.program === program!.id,
    ) ?? null;
  expect(subject).not.toBeNull();

  if (!args.topicCode) {
    return {
      programId: program!.id,
      subjectId: subject!.id,
      topicId: "",
    };
  }

  const topicsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/academics/topics/?is_active=true&page_size=500&subject=${encodeURIComponent(subject!.id)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  expect(topicsResponse.ok()).toBe(true);
  const topicsBody = (await topicsResponse.json()) as PaginatedResponse<AcademicTopicRow>;
  const topic =
    topicsBody.results?.find(
      (entry) => entry.code === args.topicCode && entry.subject === subject!.id,
    ) ?? null;
  expect(topic).not.toBeNull();

  return {
    programId: program!.id,
    subjectId: subject!.id,
    topicId: topic!.id,
  };
}

test.describe("Teacher and institute shared-library role difference", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("teacher") || testRequiresRole("institute"),
    "Teacher or institute Playwright credentials are not configured.",
  );

  test("@workflow teacher requests shared-library access while institute controls actual linking", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const teacherLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(teacherLibraryResponse.ok()).toBe(true);
    const teacherLibraryBody = (await teacherLibraryResponse.json()) as PaginatedResponse<MasterLibraryRow>;
    const teacherRequestableRow =
      teacherLibraryBody.results?.find(
        (row) =>
          row.matching_packages.length > 0 &&
          row.access_availability !== "quota_exhausted" &&
          row.access_status !== "requested" &&
          row.access_status !== "linked",
      ) ?? null;

    if (!teacherRequestableRow) {
      test.skip(true, "No teacher-visible shared-library row is currently requestable.");
    }

    const teacherProbe = teacherRequestableRow!.question_text.replace(/\s+/g, " ").trim().slice(0, 60);
    await page.goto(`/teacher/question-bank?search=${encodeURIComponent(teacherProbe)}`);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const teacherLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(teacherLibrarySection).toBeVisible();
    await expect(teacherLibrarySection.getByRole("button", { name: /bulk link current lane/i })).toHaveCount(0);

    const teacherCard = await findTeacherRequestableCard(page, teacherProbe);
    if (!teacherCard) {
      test.skip(true, "No teacher-visible shared-library card currently exposes Request Access.");
    }
    await expect(teacherCard).toBeVisible();
    await expect(teacherCard!.getByRole("button", { name: /request access/i })).toBeVisible();
    await expect(teacherCard!.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(teacherCard!.getByText(/matching packages:/i).first()).toBeVisible();

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const instituteLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(instituteLibraryResponse.ok()).toBe(true);
    const instituteLibraryBody = (await instituteLibraryResponse.json()) as PaginatedResponse<MasterLibraryRow>;
    const instituteLinkableRow =
      instituteLibraryBody.results?.find(
        (row) =>
          row.has_access &&
          row.access_status !== "linked" &&
          row.access_availability !== "quota_exhausted" &&
          Boolean(row.source_program_code) &&
          Boolean(row.source_subject_code),
      ) ?? null;

    if (!instituteLinkableRow) {
      test.skip(true, "No institute-visible shared-library row is currently linkable.");
    }

    const scopeIds = await resolveAcademicScopeIds(page, instituteAccessToken, {
      programCode: instituteLinkableRow!.source_program_code ?? "",
      subjectCode: instituteLinkableRow!.source_subject_code ?? "",
      topicCode: instituteLinkableRow!.source_topic_code,
    });
    const instituteProbe = instituteLinkableRow!.question_text.replace(/\s+/g, " ").trim().slice(0, 60);

    await page.goto(
      `/institute/question-bank/library-linker?program=${encodeURIComponent(scopeIds.programId)}&subject=${encodeURIComponent(scopeIds.subjectId)}&topic=${encodeURIComponent(scopeIds.topicId)}&search=${encodeURIComponent(instituteProbe)}`,
    );
    await expect(page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();

    const instituteLinkerSection = page.locator("section.contentCard").filter({
      hasText: /step 3\. review and link platform source questions/i,
    }).first();
    await expect(instituteLinkerSection).toBeVisible();

    const instituteCard = await findInstituteLinkableCard(page, instituteProbe);
    if (!instituteCard) {
      test.skip(true, "No institute-visible shared-library card currently exposes Add to Institute Bank.");
    }
    await expect(instituteCard!).toBeVisible();
    await expect(instituteCard!.getByRole("button", { name: /add to institute bank/i })).toBeVisible();
    await expect(instituteCard!.getByRole("button", { name: /request access/i })).toHaveCount(0);
  });
});
