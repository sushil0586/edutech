import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherSharedLibraryRequestEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const BLOCKED_MATCHABLE_PREFIX = "BLOCKED MATCHABLE DEMO :: ";
const DEMO_SHARED_LIBRARY_BLOCKED_CODE = "DEMO_SHARED_LIBRARY_BLOCKED";
const MATCHING_DEMO_PACKAGE_CODES = [
  "DEMO_SHARED_LIBRARY_ACCESS",
  "DEMO_SHARED_LIBRARY_BLOCKED",
  "DEMO_SHARED_LIBRARY_QUOTA",
  "DEMO_SHARED_LIBRARY_PAUSED_ONLY",
];

type SessionProfile = {
  institute?: string | null;
};

type MasterLibraryRow = {
  id: string;
  source_institute_code?: string;
  source_program_code?: string;
  source_subject_code?: string;
  source_topic_code?: string;
  question_text: string;
  has_access: boolean;
  access_availability: string;
  access_status?: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type QuestionBankPackageRow = {
  id: string;
  institute: string;
  institute_name: string;
  institute_code?: string;
  code: string;
  ownership_type?: string;
};

type EntitlementRow = {
  id: string;
  institute?: string;
  institute_code: string;
  question_bank_package_code: string;
  subscription_plan: string | null;
  status: string;
};

type PaginatedResponse<T> = {
  results: T[];
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

async function findTeacherRequestableCard(section: Locator, questionText: string) {
  const cards = section.locator(".questionBankCard");
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;
  const normalizedQuestionText = questionText.replace(/\s+/g, " ").trim().toLowerCase();

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const hasRequestButton =
      (await card.getByRole("button", { name: /request access/i }).count()) > 0;

    if (!hasRequestButton) {
      continue;
    }

    const cardText = ((await card.textContent()) ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (cardText.includes(normalizedQuestionText)) {
      return card;
    }

    fallbackCard ??= card;
  }

  return fallbackCard;
}

async function waitForTeacherSharedLibraryCards(page: Page) {
  const sharedLibrarySection = page.locator("section.contentCard").filter({
    has: page.getByRole("heading", { name: /shared platform library/i }),
  }).first();
  await expect(sharedLibrarySection).toBeVisible();
  await expect
    .poll(async () => sharedLibrarySection.locator(".questionBankCard").count(), {
      message: "Expected shared-library cards to render after filters load.",
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  return sharedLibrarySection;
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
  const program = programsBody.results.find((entry) => entry.code === args.programCode) ?? null;
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
    subjectsBody.results.find(
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
    topicsBody.results.find(
      (entry) => entry.code === args.topicCode && entry.subject === subject!.id,
    ) ?? null;
  expect(topic).not.toBeNull();

  return {
    programId: program!.id,
    subjectId: subject!.id,
    topicId: topic!.id,
  };
}

async function applyQuestionBankScopeFilters(
  page: Page,
  args: {
    programId: string;
    subjectId: string;
    topicId?: string;
  },
) {
  const filterForm = page.getByTestId("question-bank-filter-form").first();
  const programSelect = filterForm.getByTestId("question-bank-program-filter");
  const subjectSelect = filterForm.getByTestId("question-bank-subject-filter");
  const topicSelect = filterForm.getByTestId("question-bank-topic-filter");

  await programSelect.selectOption(args.programId);
  await expect.poll(async () => programSelect.inputValue()).toBe(args.programId);
  await expect
    .poll(async () => subjectSelect.evaluate((element) => !(element as HTMLSelectElement).disabled))
    .toBe(true);

  await subjectSelect.selectOption(args.subjectId);
  await expect.poll(async () => subjectSelect.inputValue()).toBe(args.subjectId);

  if (args.topicId) {
    await expect
      .poll(async () => topicSelect.evaluate((element) => !(element as HTMLSelectElement).disabled))
      .toBe(true);
    await topicSelect.selectOption(args.topicId);
    await expect.poll(async () => topicSelect.inputValue()).toBe(args.topicId);
  }
}

async function gotoTeacherQuestionBankFiltered(
  page: Page,
  args: {
    search?: string;
    programId?: string;
    subjectId?: string;
    topicId?: string;
  },
) {
  const params = new URLSearchParams();
  if (args.search) {
    params.set("search", args.search);
  }
  if (args.programId) {
    params.set("program", args.programId);
  }
  if (args.subjectId) {
    params.set("subject", args.subjectId);
  }
  if (args.topicId) {
    params.set("topic", args.topicId);
  }
  await page.goto(`/teacher/question-bank?${params.toString()}`);
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
}

async function findResolvableTeacherRequestableRow(
  page: Page,
  accessToken: string,
  rows: MasterLibraryRow[],
) {
  for (const row of rows) {
    if (
      !row.has_access ||
      row.matching_packages.length === 0 ||
      row.access_availability === "quota_exhausted" ||
      row.access_status === "requested" ||
      row.access_status === "linked" ||
      !row.source_program_code ||
      !row.source_subject_code
    ) {
      continue;
    }

    try {
      await resolveAcademicScopeIds(page, accessToken, {
        programCode: row.source_program_code,
        subjectCode: row.source_subject_code,
        topicCode: row.source_topic_code,
      });
      return row;
    } catch {
      continue;
    }
  }

  return null;
}

function pickPublicHubPackageByCode(packages: QuestionBankPackageRow[], packageCode: string) {
  return (
    packages.find(
      (row) =>
        row.code === packageCode &&
        row.ownership_type === "platform" &&
        row.institute_code?.toUpperCase().startsWith("PUB"),
    ) ??
    packages.find((row) => row.code === packageCode && row.ownership_type === "platform") ??
    packages.find((row) => row.code === packageCode) ??
    null
  );
}

test.describe("Teacher shared-library mutable request flow", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherSharedLibraryRequestEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_REQUEST",
      "teacher shared-library request coverage",
    ),
  );

  test("@workflow @mutable teacher can request access for a shared-library question with matching package coverage", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const requestableRow = await findResolvableTeacherRequestableRow(
      page,
      teacherAccessToken,
      masterLibraryBody.results ?? [],
    );

    if (!requestableRow) {
      test.skip(true, "No teacher-visible shared-library row is currently requestable with matching package coverage.");
    }

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const requestedQuestionText = requestableRow!.question_text.replace(/\s+/g, " ").trim();
    expect(requestedQuestionText).not.toBe("");
    const requestedSearchProbe = requestedQuestionText;
    const requestableScopeIds = await resolveAcademicScopeIds(page, teacherAccessToken, {
      programCode: requestableRow!.source_program_code!,
      subjectCode: requestableRow!.source_subject_code!,
      topicCode: requestableRow!.source_topic_code,
    });

    await gotoTeacherQuestionBankFiltered(page, {
      search: requestedSearchProbe,
      programId: requestableScopeIds.programId,
      subjectId: requestableScopeIds.subjectId,
      topicId: requestableScopeIds.topicId,
    });
    await expect(page).toHaveURL(/search=/);

    const filteredSharedLibrarySection = await waitForTeacherSharedLibraryCards(page);
    await expect
      .poll(
        async () =>
          (await findTeacherRequestableCard(filteredSharedLibrarySection, requestedQuestionText)) !==
          null,
        {
          message: "Expected a teacher-requestable shared-library card to become visible.",
          timeout: 15000,
        },
      )
      .toBe(true);
    const requestableCardSnapshot = await findTeacherRequestableCard(
      filteredSharedLibrarySection,
      requestedQuestionText,
    );
    expect(requestableCardSnapshot).not.toBeNull();
    await expect(requestableCardSnapshot).toBeVisible();
    await expect(requestableCardSnapshot.getByText(/matching packages:/i).first()).toBeVisible();
    const requestButton = requestableCardSnapshot.getByRole("button", { name: /request access/i });
    await expect(requestButton).toBeVisible();

    const requestResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/teacher/question-bank/master-library/") &&
        response.url().includes("/request-access") &&
        response.request().method() === "POST",
    );

    await requestButton.click();
    const requestResponse = await requestResponsePromise;
    expect(requestResponse.ok()).toBe(true);

    await expect(page).toHaveURL(/\/teacher\/question-bank\?.*message=/);
    await expect(page.getByText(/shared question access request submitted\./i).first()).toBeVisible();

    await gotoTeacherQuestionBankFiltered(page, {
      search: requestedSearchProbe,
      programId: requestableScopeIds.programId,
      subjectId: requestableScopeIds.subjectId,
      topicId: requestableScopeIds.topicId,
    });
    await expect(page).toHaveURL(/search=/);

    const refreshedSharedLibrarySection = await waitForTeacherSharedLibraryCards(page);
    const pendingCard = refreshedSharedLibrarySection.locator(".questionBankCard").filter({
      hasText: /request pending/i,
    }).first();
    await expect(pendingCard).toBeVisible();
    await expect(pendingCard.getByRole("button", { name: /request access/i })).toHaveCount(0);
  });

  test("@workflow @mutable teacher shared-library card becomes access-active after admin applies the matching package to the same institute", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    let requestableRow = await findResolvableTeacherRequestableRow(
      page,
      teacherAccessToken,
      masterLibraryBody.results ?? [],
    );
    let requestableScopeIds =
      requestableRow == null
        ? null
        : await resolveAcademicScopeIds(page, teacherAccessToken, {
            programCode: requestableRow.source_program_code!,
            subjectCode: requestableRow.source_subject_code!,
            topicCode: requestableRow.source_topic_code,
          });

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const packagesResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(packagesResponse.ok()).toBe(true);
    const packages = (await packagesResponse.json()) as QuestionBankPackageRow[];

    const uniqueSeed = Date.now();
    const planName = `Playwright Shared Access Bridge ${uniqueSeed}`;
    const planCode = `PW-SAB-${uniqueSeed}`;
    let createdPlanId: string | null = null;
    let createdEntitlementIds: string[] = [];
    let selectedQuestionText = "";
    let searchProbe = "";
    let targetPackageCode = "";
    const pausedEntitlements: Array<{ id: string; previousStatus: string }> = [];

    try {
      if (!requestableRow) {
        requestableRow = await findResolvableTeacherRequestableRow(
          page,
          teacherAccessToken,
          masterLibraryBody.results ?? [],
        );
        requestableScopeIds =
          requestableRow == null
            ? null
            : await resolveAcademicScopeIds(page, teacherAccessToken, {
                programCode: requestableRow.source_program_code!,
                subjectCode: requestableRow.source_subject_code!,
                topicCode: requestableRow.source_topic_code,
              });
      }

      if (!requestableRow) {
        test.skip(true, "No teacher shared-library question with matching package coverage is available.");
      }

      selectedQuestionText = requestableRow!.question_text.replace(/\s+/g, " ").trim();
      expect(selectedQuestionText).not.toBe("");
      searchProbe = selectedQuestionText;

      const targetPackageCodeFromRow =
        requestableRow!.question_text.startsWith(BLOCKED_MATCHABLE_PREFIX)
          ? DEMO_SHARED_LIBRARY_BLOCKED_CODE
          : (requestableRow!.matching_packages.find((entry) => entry.code.trim().length > 0)?.code ?? "");
      expect(targetPackageCodeFromRow).not.toBe("");

      const targetPackage = pickPublicHubPackageByCode(packages, targetPackageCodeFromRow);
      expect(targetPackage).not.toBeNull();

      targetPackageCode = targetPackage!.code;

      const entitlementsResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        },
      );
      expect(entitlementsResponse.ok()).toBe(true);
      const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
      const matchingActiveEntitlements = entitlements.filter(
        (row) =>
          row.institute === profile.institute &&
          MATCHING_DEMO_PACKAGE_CODES.includes(row.question_bank_package_code) &&
          row.status === "active",
      );

      for (const entitlement of matchingActiveEntitlements) {
        pausedEntitlements.push({ id: entitlement.id, previousStatus: entitlement.status });
        const pauseResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "revoked",
              notes: "Playwright teacher shared-library bridge setup.",
            },
          },
        );
        if (!pauseResponse.ok()) {
          continue;
        }
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await gotoTeacherQuestionBankFiltered(page, {
        search: searchProbe,
        programId: requestableScopeIds!.programId,
        subjectId: requestableScopeIds!.subjectId,
        topicId: requestableScopeIds!.topicId,
      });
      await expect(page).toHaveURL(/search=/);

      const filteredSharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(filteredSharedLibrarySection).toBeVisible();

      const blockedCard = filteredSharedLibrarySection.locator(".questionBankCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(blockedCard).toBeVisible();
      await expect(blockedCard.getByRole("button", { name: /request access/i })).toHaveCount(0);

      await loginAsRole(page, "admin");
      expect(await getAccessToken(page)).not.toBe("");

      const createPlanResponse = await page.request.post(
        `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            institute: targetPackage!.institute,
            name: planName,
            code: planCode,
            description: "Playwright shared-library activation bridge coverage.",
            metadata: {},
            is_active: true,
            cycles: [
              {
                billing_interval: "monthly",
                interval_count: 1,
                price_amount: "0.00",
                currency: "INR",
                metadata: {},
                is_active: true,
                star_credit_rules: [],
              },
            ],
            question_bank_package_links: [
              {
                question_bank_package: targetPackage!.id,
                grant_mode: "included",
                is_default: true,
                metadata: {},
                is_active: true,
              },
            ],
          },
        },
      );
      expect(createPlanResponse.ok()).toBe(true);
      const createPlanBody = (await createPlanResponse.json()) as {
        data?: {
          id?: string;
          code?: string;
        };
      };
      createdPlanId = createPlanBody.data?.id ?? null;
      expect(createdPlanId).not.toBeNull();

      const applyPlanResponse = await page.request.post(
        `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${createdPlanId}/apply-to-institute/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            institute: profile.institute,
          },
        },
      );
      expect(applyPlanResponse.ok()).toBe(true);
      const applyPlanBody = (await applyPlanResponse.json()) as {
        data?: {
          entitlement_count?: number;
          question_bank_package_codes?: string[];
        };
      };
      expect(applyPlanBody.data?.entitlement_count ?? 0).toBeGreaterThan(0);
      expect(applyPlanBody.data?.question_bank_package_codes ?? []).toContain(targetPackageCode);

      const createdEntitlementsResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        },
      );
      expect(createdEntitlementsResponse.ok()).toBe(true);
      const createdEntitlements = (await createdEntitlementsResponse.json()) as EntitlementRow[];
      createdEntitlementIds = createdEntitlements
        .filter(
          (row) =>
            row.institute === profile.institute &&
            row.question_bank_package_code === targetPackageCode &&
            row.subscription_plan === createdPlanId &&
            row.status === "active",
        )
        .map((row) => row.id);
      expect(createdEntitlementIds.length).toBeGreaterThan(0);

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await gotoTeacherQuestionBankFiltered(page, {
        search: searchProbe,
        programId: requestableScopeIds!.programId,
        subjectId: requestableScopeIds!.subjectId,
        topicId: requestableScopeIds!.topicId,
      });
      await expect(page).toHaveURL(/search=/);

      const activatedSharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(activatedSharedLibrarySection).toBeVisible();

      const activatedCard = activatedSharedLibrarySection.locator(".questionBankCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(activatedCard).toBeVisible();
      await expect(activatedCard.getByText(/access available/i).first()).toBeVisible();
      await expect(activatedCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
      await expect(activatedCard.getByRole("button", { name: /request access/i })).toBeVisible();
    } finally {
      if (createdEntitlementIds.length) {
        for (const entitlementId of createdEntitlementIds) {
          const revokeResponse = await page.request.patch(
            `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlementId}/`,
            {
              headers: {
                Authorization: `Bearer ${adminAccessToken}`,
                "Content-Type": "application/json",
              },
              data: {
                status: "revoked",
                notes: "Playwright shared-library activation bridge cleanup.",
              },
            },
          );
          if (!revokeResponse.ok()) {
            continue;
          }
        }
      }

      if (createdPlanId) {
        const deactivatePlanResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${createdPlanId}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              is_active: false,
            },
          },
        );
        if (!deactivatePlanResponse.ok()) {
          return;
        }
      }

      for (const entitlement of pausedEntitlements) {
        const restoreResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: entitlement.previousStatus,
              notes: "Playwright teacher shared-library bridge restore.",
            },
          },
        );
        if (!restoreResponse.ok()) {
          continue;
        }
      }
    }
  });
});
