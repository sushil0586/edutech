import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherSharedLibraryPublishReadinessEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_PUBLISH_READINESS",
);
const teacherApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: ";

type SessionProfile = {
  institute?: string | null;
};

type MasterLibraryRow = {
  id: string;
  question_text: string;
  has_access: boolean;
  access_availability: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type EntitlementRow = {
  id: string;
  institute: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

type QuestionBankPackageRow = {
  id: string;
  code: string;
  institute_code?: string;
  ownership_type?: string;
  metadata?: Record<string, unknown> | null;
};

type CatalogEntry = {
  namespace: string;
  code: string;
  is_default?: boolean;
};

type PaginatedResponse<T> = {
  results: T[];
};

type LookupAcademicYear = {
  id: string;
};

type LookupProgram = {
  id: string;
};

type LookupSubject = {
  id: string;
  program: string;
  name: string;
};

type CreatedExam = {
  id: string;
};

type CompactQuestionRow = {
  id: string;
  shared_library_access_state?: string | null;
  shared_library_access_active?: boolean;
};

type UsageLedgerRow = {
  id: string;
};

async function findSeededLinkedInventoryCard(cards: Locator, questionPrefix: string) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasLinkedCopy = (await card.getByText(/linked licensed copy/i).count()) > 0;

    if (hasLinkedCopy) {
      if (cardText.includes(questionPrefix)) {
        return card;
      }
      fallbackCard ??= card;
    }
  }

  return fallbackCard;
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function getJson<T>(page: Page, path: string, accessToken: string) {
  const response = await page.request.get(`${teacherApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok(), `GET ${path} failed with status ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

function pickDefaultOption(catalog: CatalogEntry[], namespace: string, fallback = "") {
  const namespaceEntries = catalog.filter((entry) => entry.namespace === namespace);
  return namespaceEntries.find((entry) => entry.is_default)?.code ?? namespaceEntries[0]?.code ?? fallback;
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

async function createTeacherExamShell(page: Page, payload: { title: string; code: string }) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const profile = await getJson<SessionProfile>(page, "/api/v1/auth/me/", accessToken);
  expect(profile.institute).toBeTruthy();

  const [academicYears, programs, subjects, optionCatalog] = await Promise.all([
    getJson<PaginatedResponse<LookupAcademicYear>>(
      page,
      "/api/v1/academics/academic-years/?is_active=true",
      accessToken,
    ),
    getJson<PaginatedResponse<LookupProgram>>(
      page,
      "/api/v1/academics/programs/?is_active=true&page_size=500",
      accessToken,
    ),
    getJson<PaginatedResponse<LookupSubject>>(
      page,
      "/api/v1/academics/subjects/?is_active=true&page_size=500",
      accessToken,
    ),
    getJson<PaginatedResponse<CatalogEntry>>(
      page,
      "/api/v1/academics/option-catalog/?is_active=true&page_size=200",
      accessToken,
    ),
  ]);

  const academicYearId = academicYears.results[0]?.id ?? "";
  expect(academicYearId).not.toBe("");

  const preferredSubject =
    subjects.results.find((subject) => /mathematics/i.test(subject.name)) ?? subjects.results[0] ?? null;
  expect(preferredSubject).not.toBeNull();

  const matchingProgram =
    programs.results.find((program) => program.id === preferredSubject!.program) ?? programs.results[0] ?? null;
  expect(matchingProgram).not.toBeNull();

  const response = await page.request.post(`${teacherApiBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: profile.institute,
      academic_year: academicYearId,
      program: matchingProgram!.id,
      subject: preferredSubject!.id,
      source_type: "teacher",
      title: payload.title,
      code: payload.code,
      description: "",
      exam_type: pickDefaultOption(optionCatalog.results, "exam_type"),
      delivery_mode: pickDefaultOption(optionCatalog.results, "exam_delivery_mode"),
      duration_minutes: 60,
      total_marks: "0",
      passing_marks: "0",
      instructions: "",
      allow_late_submit: false,
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: false,
      allow_review_after_submit: true,
      max_attempts: 1,
      timer_mode: pickDefaultOption(optionCatalog.results, "exam_timer_mode"),
      navigation_mode: pickDefaultOption(optionCatalog.results, "exam_navigation_mode"),
      attempt_policy: pickDefaultOption(optionCatalog.results, "exam_attempt_policy"),
      result_publish_mode: pickDefaultOption(optionCatalog.results, "exam_result_publish_mode"),
      review_mode: pickDefaultOption(optionCatalog.results, "exam_review_mode"),
      security_mode: pickDefaultOption(optionCatalog.results, "exam_security_mode"),
      rank_visibility_mode: "hidden",
      percentile_visibility_mode: "hidden",
      benchmark_visibility_mode: "peer_average_only",
      rank_freeze_policy: "freeze_on_exam_closure",
      allow_resume: true,
      allow_section_switching: true,
      allow_return_to_previous_section: true,
    },
    timeout: 20000,
  });
  expect(response.ok(), `Teacher exam create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as CreatedExam;
}

async function deleteTeacherExam(page: Page, examId: string) {
  const response = await page.request.delete(`/api/teacher/exams/${examId}`, {
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function createTeacherExamWithLinkedQuestion(page: Page, options: {
  examTitle: string;
  examCode: string;
  sectionName: string;
  searchProbe: string;
}) {
  const createdExam = await createTeacherExamShell(page, {
    title: options.examTitle,
    code: options.examCode,
  });
  const examId = createdExam.id;
  expect(examId).not.toBeNull();

  await page.goto(`/teacher/exams/${examId}/builder?tab=sections`);
  await page.getByRole("textbox", { name: /section name/i }).fill(options.sectionName);
  await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
  await page.getByRole("button", { name: /^add section$/i }).click();
  await expect(page).toHaveURL(/tab=sections&message=/);

  await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
  const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
    has: page.getByText(/attach one question manually/i),
  }).first();
  const questionSelect = manualAttachForm.locator('select[name="question"]');
  const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
    (optionsList, probe) =>
      optionsList
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label,
        }))
        .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
    options.searchProbe,
  );
  if (!matchingQuestionOption) {
    await expect(questionSelect).toBeVisible();
    const optionLabels = await questionSelect.locator("option").evaluateAll((optionsList) =>
      optionsList.map((option) => (option as HTMLOptionElement).label),
    );
    expect(optionLabels.some((label) => label.includes(options.searchProbe))).toBe(false);
    await deleteTeacherExam(page, examId!);
    return null;
  }
  await questionSelect.selectOption(matchingQuestionOption!.value);

  const sectionSelect = manualAttachForm.locator('select[name="section"]');
  const sectionOption = await sectionSelect.locator("option").evaluateAll(
    (optionsList, targetSectionName) =>
      optionsList
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label,
        }))
        .find((option) => option.label.trim() === targetSectionName) ?? null,
    options.sectionName,
  );
  expect(sectionOption).not.toBeNull();
  await sectionSelect.selectOption(sectionOption!.value);
  await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
  await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
  await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
  await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
  await expect(page).toHaveURL(/tab=questions&message=/);

  return examId!;
}

async function configureTeacherExamSchedule(page: Page, examId: string) {
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  const toDateTimeLocalValue = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  await page.goto(`/teacher/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("4");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
}

async function publishTeacherExam(page: Page, examId: string) {
  await page.goto(`/teacher/exams/${examId}`);
  const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
  if (await syncMarksButton.count()) {
    await syncMarksButton.click();
    await expect(page).toHaveURL(/message=/);
  }
  const publishButton = page.getByRole("button", { name: /publish exam/i });
  if (await publishButton.count()) {
    await publishButton.click();
    await expect(page).toHaveURL(/message=/);
  }
}

function teacherExamReadinessPanel(page: Page) {
  return page.locator("article").filter({
    has: page.getByText(/^exam publish readiness$/i),
  }).first();
}

test.describe("Teacher shared-library publish readiness", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("admin"),
    "Teacher or admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherSharedLibraryPublishReadinessEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_PUBLISH_READINESS",
      "teacher shared-library publish readiness coverage",
    ),
  );

  test("@workflow @mutable teacher exam detail shows paused shared-library entitlement as a publish blocker", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Shared Publish Readiness ${uniqueSeed}`;
    const examCode = `PW-TSPR-${uniqueSeed}`;
    const sectionName = `Teacher Publish Readiness Section ${uniqueSeed}`;
    let examId: string | null = null;
    let linkedQuestionId = "";

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(PAUSED_ONLY_PREFIX);
    await page.getByRole("button", { name: /apply filters/i }).click();

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();
    const inventoryCards = inventorySection.locator(".questionBankCard");
    const linkedInventoryCard = await findSeededLinkedInventoryCard(inventoryCards, PAUSED_ONLY_PREFIX);

    if (!linkedInventoryCard) {
      test.skip(
        true,
        "No teacher-visible linked shared-library question is available in local inventory.",
      );
    }

    const linkedQuestionText =
      ((await linkedInventoryCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const linkedMasterRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.replace(/\s+/g, " ").trim() === linkedQuestionText &&
          row.has_access &&
          row.access_availability === "available" &&
          row.matching_packages.length > 0,
      ) ?? null;

    if (!linkedMasterRow) {
      test.skip(
        true,
        "Could not resolve the matching master-library row for the selected shared question.",
      );
    }

    const packageCodes = linkedMasterRow!.matching_packages
      .map((entry) => entry.code)
      .filter((code) => code.trim().length > 0);
    expect(packageCodes.length).toBeGreaterThan(0);

    const compactQuestionListAfterLink = await getJson<PaginatedResponse<CompactQuestionRow>>(
      page,
      `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
      teacherAccessToken,
    );
    linkedQuestionId =
      compactQuestionListAfterLink.results.find((row) => row.shared_library_access_active)?.id ?? "";
    expect(linkedQuestionId).not.toBe("");

    examId = await createTeacherExamWithLinkedQuestion(page, {
      examTitle,
      examCode,
      sectionName,
      searchProbe,
    });
    if (!examId) {
      test.skip(
        true,
        "The linked shared question is no longer attachable in the teacher builder for this paused-only lane.",
      );
    }
    await configureTeacherExamSchedule(page, examId);

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");
    const entitlementsResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
    const targetEntitlements = entitlements.filter(
      (row) =>
        row.institute === profile.institute &&
        packageCodes.includes(row.question_bank_package_code) &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${profile.institute} and package set ${packageCodes.join(", ")}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright teacher publish readiness check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      const compactQuestionList = await getJson<PaginatedResponse<CompactQuestionRow>>(
        page,
        `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
        teacherAccessToken,
      );
      const pausedLinkedQuestion =
        compactQuestionList.results.find((row) => row.id === linkedQuestionId) ?? null;

      if (pausedLinkedQuestion?.shared_library_access_state !== "inactive") {
        test.skip(
          true,
          "The linked question remains covered by another active entitlement lane, so paused publish-blocker coverage is not expected for this row.",
        );
      }

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}(?:\\?.*)?$`));

      const readinessPanel = teacherExamReadinessPanel(page);
      await expect(readinessPanel).toBeVisible();
      await expect(readinessPanel).toContainText(/blocked/i);
      await expect(readinessPanel).toContainText(/inactive shared library entitlement/i);
      await expect(readinessPanel).toContainText(/no longer has an active entitlement for it/i);
    } finally {
      for (const entitlement of targetEntitlements) {
        const reactivateResponse = await page.request.patch(
          `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "active",
              notes: "Playwright teacher publish readiness check restored this entitlement.",
            },
          },
        );
        expect(reactivateResponse.ok()).toBe(true);
      }

      if (examId) {
        await deleteTeacherExam(page, examId);
      }
    }
  });

  test("@workflow @mutable teacher exam detail shows shared-library publish allowance warnings and blockers from package metadata", async ({
    page,
  }) => {
    test.setTimeout(240000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const teacherAccessToken = await getAccessToken(page);
    expect(teacherAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${teacherAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const uniqueSeed = Date.now();
    const seedExamTitle = `PW Teacher Shared Publish Limit Seed ${uniqueSeed}`;
    const seedExamCode = `PW-TSPLS-${uniqueSeed}`;
    const draftExamTitle = `PW Teacher Shared Publish Limit Draft ${uniqueSeed}`;
    const draftExamCode = `PW-TSPLD-${uniqueSeed}`;
    const seedSectionName = `Teacher Publish Limit Seed Section ${uniqueSeed}`;
    const draftSectionName = `Teacher Publish Limit Draft Section ${uniqueSeed}`;
    let seedExamId: string | null = null;
    let draftExamId: string | null = null;
    let packageId: string | null = null;
    let originalMetadata: Record<string, unknown> | null = null;
    let baselinePublishUsageCount = 0;

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(PAUSED_ONLY_PREFIX);
    await page.getByRole("button", { name: /apply filters/i }).click();

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();
    const inventoryCards = inventorySection.locator(".questionBankCard");
    const linkedInventoryCard = await findSeededLinkedInventoryCard(inventoryCards, PAUSED_ONLY_PREFIX);

    if (!linkedInventoryCard) {
      test.skip(true, "No teacher-visible linked shared-library question is available in local inventory.");
    }

    const linkedQuestionText =
      ((await linkedInventoryCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${teacherAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as { results?: MasterLibraryRow[] };
    const linkedMasterRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.question_text.replace(/\s+/g, " ").trim() === linkedQuestionText &&
          row.has_access &&
          row.access_availability === "available" &&
          row.matching_packages.length > 0,
      ) ?? null;

    if (!linkedMasterRow) {
      test.skip(true, "Could not resolve the matching master-library row for the selected shared question.");
    }

    const packageCode = linkedMasterRow!.matching_packages[0]?.code ?? "";
    expect(packageCode).not.toBe("");

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const packagesResponse = await page.request.get(
      `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-packages/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(packagesResponse.ok()).toBe(true);
    const packages = (await packagesResponse.json()) as QuestionBankPackageRow[];
    const targetPackage = pickPublicHubPackageByCode(packages, packageCode);
    expect(targetPackage).not.toBeNull();
    packageId = targetPackage!.id;
    originalMetadata = (targetPackage!.metadata as Record<string, unknown> | null) ?? {};

    try {
      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      const teacherPublishAccessToken = await getAccessToken(page);
      expect(teacherPublishAccessToken).not.toBe("");
      const baselineUsageEntries = await getJson<UsageLedgerRow[]>(
        page,
        `/api/v1/economy/admin/institute-question-bank-usage/?question_bank_package=${packageId}&action_type=exam_published`,
        adminAccessToken,
      );
      baselinePublishUsageCount = baselineUsageEntries.length;

      const nearLimitMetadata = {
        ...(originalMetadata ?? {}),
        max_exam_publish_count: baselinePublishUsageCount + 2,
      };
      const nearLimitResponse = await page.request.patch(
        `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-packages/${packageId}/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            metadata: nearLimitMetadata,
          },
        },
      );
      expect(nearLimitResponse.ok()).toBe(true);

      seedExamId = await createTeacherExamWithLinkedQuestion(page, {
        examTitle: seedExamTitle,
        examCode: seedExamCode,
        sectionName: seedSectionName,
        searchProbe,
      });
      if (!seedExamId) {
        test.skip(
          true,
          "The linked shared question is no longer attachable in the teacher builder for this paused-only lane.",
        );
      }
      await configureTeacherExamSchedule(page, seedExamId);
      await publishTeacherExam(page, seedExamId);

      draftExamId = await createTeacherExamWithLinkedQuestion(page, {
        examTitle: draftExamTitle,
        examCode: draftExamCode,
        sectionName: draftSectionName,
        searchProbe,
      });
      if (!draftExamId) {
        test.skip(
          true,
          "The linked shared question is no longer attachable in the teacher builder for this paused-only lane.",
        );
      }
      await configureTeacherExamSchedule(page, draftExamId);

      await page.goto(`/teacher/exams/${draftExamId}`);
      const readinessPanel = teacherExamReadinessPanel(page);
      await expect(readinessPanel).toBeVisible();
      await expect(readinessPanel).toContainText(/warning/i);
      await expect(readinessPanel).toContainText(/shared library publish limit near/i);
      await expect(readinessPanel).toContainText(/1 publish slot\(s\) remain/i);

      const reachedLimitMetadata = {
        ...(nearLimitMetadata ?? {}),
        max_exam_publish_count: baselinePublishUsageCount + 1,
      };
      const reachedLimitResponse = await page.request.patch(
        `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-packages/${packageId}/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            metadata: reachedLimitMetadata,
          },
        },
      );
      expect(reachedLimitResponse.ok()).toBe(true);

      await page.reload();
      await expect(readinessPanel).toContainText(/blocked/i);
      await expect(readinessPanel).toContainText(/shared library publish limit reached/i);
      await expect(readinessPanel).toContainText(
        new RegExp(
          `configured publish allowance \\(${baselinePublishUsageCount + 1}\\/${baselinePublishUsageCount + 1}\\)`,
          "i",
        ),
      );
    } finally {
      if (draftExamId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        await deleteTeacherExam(page, draftExamId);
      }

      if (seedExamId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        await deleteTeacherExam(page, seedExamId);
      }

      if (packageId) {
        const restoreResponse = await page.request.patch(
          `${teacherApiBaseUrl}/api/v1/economy/admin/question-bank-packages/${packageId}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              metadata: originalMetadata ?? {},
            },
          },
        );
        expect(restoreResponse.ok()).toBe(true);
      }
    }
  });
});
