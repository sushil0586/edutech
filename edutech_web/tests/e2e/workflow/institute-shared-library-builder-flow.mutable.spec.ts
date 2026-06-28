import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSharedLibraryBuilderEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_BUILDER_FLOW",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");
const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: ";

type SessionProfile = {
  institute?: string | null;
};

type InstituteRecord = {
  id: string;
  code: string;
  name: string;
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
  institute_code: string;
  question_bank_package_code: string;
  status: string;
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

async function findLinkableSharedLibraryCard(cards: Locator) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const hasLinkButton = (await card.getByRole("button", { name: /link to local bank/i }).count()) > 0;

    if (hasLinkButton) {
      const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
      if (cardText.includes(PAUSED_ONLY_PREFIX)) {
        return card;
      }
      fallbackCard ??= card;
    }
  }

  return fallbackCard;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function getJson<T>(page: Page, path: string, accessToken: string) {
  const response = await page.request.get(`${instituteApiBaseUrl}${path}`, {
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

async function createInstituteExamShell(page: Page, payload: { title: string; code: string }) {
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

  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: profile.institute,
      academic_year: academicYearId,
      program: matchingProgram!.id,
      subject: preferredSubject!.id,
      source_type: "institute",
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
  expect(response.ok(), `Exam create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as CreatedExam;
}

test.describe("Institute shared-library to builder flow", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSharedLibraryBuilderEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_BUILDER_FLOW",
      "institute shared-library builder coverage",
    ),
  );

  test("@workflow @mutable institute can link a shared question and attach that same question in the exam builder", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Shared Builder Exam ${uniqueSeed}`;
    const examCode = `PW-SHARED-${uniqueSeed}`;
    const sectionName = `Shared Library Section ${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await page.goto("/institute/question-bank");
      console.log("builder-flow: at question bank");
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

      const sharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(sharedLibrarySection).toBeVisible();

      const sharedLibraryCards = sharedLibrarySection.locator(".questionBankCard");
      const linkableCard = await findLinkableSharedLibraryCard(sharedLibraryCards);

      if (!linkableCard) {
        test.skip(
          true,
          "No institute-visible shared-library card currently exposes Link to Local Bank.",
        );
      }

      const linkedQuestionText =
        ((await linkableCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
      expect(linkedQuestionText).not.toBe("");
      const searchProbe = linkedQuestionText.slice(0, 60);

      const linkResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/teacher/question-bank/master-library/") &&
          response.url().includes("/link") &&
          response.request().method() === "POST",
      );

      await linkableCard!.getByRole("button", { name: /link to local bank/i }).click();
      const linkResponse = await linkResponsePromise;
      expect(linkResponse.ok()).toBe(true);
      console.log("builder-flow: linked shared question");

      await expect(page).toHaveURL(/\/institute\/question-bank\?.*message=/);
      await expect(page.getByText(/shared question linked into the local bank\./i).first()).toBeVisible();

      const searchField = page.getByRole("textbox", { name: /search question text/i });
      await searchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const inventorySection = page.locator("section.contentCard").filter({
        hasText: "Question inventory",
      }).first();
      await expect(inventorySection).toBeVisible();
      await expect(
        inventorySection.locator(".questionBankCard").filter({ hasText: searchProbe }).first(),
      ).toBeVisible();
      console.log("builder-flow: linked question visible in inventory");

      const createdExam = await createInstituteExamShell(page, {
        title: examTitle,
        code: examCode,
      });
      examId = createdExam.id;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
      const builderSubjectField = page.getByRole("combobox", { name: /subject/i });
      if (await builderSubjectField.count()) {
        const selectedLabel = await builderSubjectField.locator("option:checked").textContent();
        if ((selectedLabel ?? "").match(/no subject selected/i)) {
          await builderSubjectField.selectOption({ label: "Mathematics" });
        }
      }
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section added/i)).toBeVisible();

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
        (options, probe) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
        searchProbe,
      );

      expect(matchingQuestionOption).not.toBeNull();
      await questionSelect.selectOption(matchingQuestionOption!.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();

      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();

      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      const linkedQuestionCard = page.locator(".builderQuestionCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(linkedQuestionCard).toBeVisible();
      await expect(
        linkedQuestionCard.locator("strong").filter({ hasText: new RegExp(sectionName) }).first(),
      ).toBeVisible();
      await expect(linkedQuestionCard.getByText(/4(\.00)? marks/i)).toBeVisible();
    } finally {
      if (examId) {
        await deleteInstituteExam(page, examId);
      }
    }
  });

  test("@workflow @mutable institute builder blocks reusing a linked shared question after entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${instituteApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const instituteResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/institutes/${profile.institute}/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(instituteResponse.ok()).toBe(true);
    const institute = (await instituteResponse.json()) as InstituteRecord;
    expect(institute.code).toBeTruthy();

    const uniqueSeed = Date.now();
    const examTitle = `PW Shared Builder Paused Exam ${uniqueSeed}`;
    const examCode = `PW-SHARED-PAUSED-${uniqueSeed}`;
    const sectionName = `Paused Linked Section ${uniqueSeed}`;
    let examId: string | null = null;
    let linkedQuestionId = "";

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const sharedLibraryCards = sharedLibrarySection.locator(".questionBankCard");
    const linkableCard = await findLinkableSharedLibraryCard(sharedLibraryCards);

    if (!linkableCard) {
      test.skip(
        true,
        "No institute-visible shared-library card currently exposes Link to Local Bank.",
      );
    }

    const linkedQuestionText =
      ((await linkableCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
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

    const linkResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/teacher/question-bank/master-library/") &&
        response.url().includes("/link") &&
        response.request().method() === "POST",
    );

    await linkableCard!.getByRole("button", { name: /link to local bank/i }).click();
    const linkResponse = await linkResponsePromise;
    expect(linkResponse.ok()).toBe(true);
    const compactQuestionListAfterLink = await getJson<PaginatedResponse<CompactQuestionRow>>(
      page,
      `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
      instituteAccessToken,
    );
    linkedQuestionId =
      compactQuestionListAfterLink.results.find((row) => row.shared_library_access_active)?.id ?? "";
    expect(linkedQuestionId).not.toBe("");

    await expect(page).toHaveURL(/\/institute\/question-bank\?.*message=/);
    await expect(page.getByText(/shared question linked into the local bank\./i).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(searchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();
    if (page.url().includes("/login")) {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto("/institute/question-bank");
      await searchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
    }
    await expect(page).toHaveURL(/search=/);

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();
    await expect(
      inventorySection.locator(".questionBankCard").filter({ hasText: searchProbe }).first(),
    ).toBeVisible();

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const entitlementsResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
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
        row.institute_code === institute.code &&
        packageCodes.includes(row.question_bank_package_code) &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${institute.code} and package set ${packageCodes.join(", ")}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright builder check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/question-bank");
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /search question text/i }).fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();

      const compactQuestionList = await getJson<PaginatedResponse<CompactQuestionRow>>(
        page,
        `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
        instituteAccessToken,
      );
      const pausedLinkedQuestion =
        compactQuestionList.results.find((row) => row.id === linkedQuestionId) ?? null;

      if (pausedLinkedQuestion?.shared_library_access_state !== "inactive") {
        test.skip(
          true,
          "The linked question remains covered by another active entitlement lane, so paused-entitlement blocking is not expected for this row.",
        );
      }

      const pausedInventoryCard = page
        .locator("section.contentCard")
        .filter({ hasText: "Question inventory" })
        .first()
        .locator(".questionBankCard")
        .filter({ hasText: searchProbe })
        .first();
      await expect(pausedInventoryCard).toBeVisible();
      await expect(pausedInventoryCard.getByText(/linked licensed copy/i).first()).toBeVisible();
      await expect(pausedInventoryCard.getByText(/read-only linked/i).first()).toBeVisible();

      const createdExam = await createInstituteExamShell(page, {
        title: examTitle,
        code: examCode,
      });
      examId = createdExam.id;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
      const builderSubjectField = page.getByRole("combobox", { name: /subject/i });
      if (await builderSubjectField.count()) {
        const selectedLabel = await builderSubjectField.locator("option:checked").textContent();
        if ((selectedLabel ?? "").match(/no subject selected/i)) {
          await builderSubjectField.selectOption({ label: "Mathematics" });
        }
      }
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
        (options, probe) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
        searchProbe,
      );

      if (!matchingQuestionOption) {
        await expect(questionSelect).toBeVisible();
        await expect(questionSelect.locator("option")).not.toContainText(searchProbe);
        return;
      }

      await questionSelect.selectOption(matchingQuestionOption.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();

      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();

      await expect(page).toHaveURL(/tab=questions&error=/);
      await expect(
        page.getByText(/no longer covered by the institute's active question-bank entitlements/i).first(),
      ).toBeVisible();
      await expect(
        page.locator(".builderQuestionCard").filter({ hasText: searchProbe }).first(),
      ).toHaveCount(0);
    } finally {
      for (const entitlement of targetEntitlements) {
        const reactivateResponse = await page.request.patch(
          `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "active",
              notes: "Playwright builder check restored this entitlement.",
            },
          },
        );
        expect(reactivateResponse.ok()).toBe(true);
      }

      if (examId) {
        await deleteInstituteExam(page, examId);
      }
    }
  });

  test("@workflow @mutable institute builder blocks updates for an already-attached linked shared question after entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${instituteApiBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const instituteResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/institutes/${profile.institute}/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(instituteResponse.ok()).toBe(true);
    const institute = (await instituteResponse.json()) as InstituteRecord;
    expect(institute.code).toBeTruthy();

    const uniqueSeed = Date.now();
    const examTitle = `PW Shared Builder Locked Update ${uniqueSeed}`;
    const examCode = `PW-SHARED-LOCK-${uniqueSeed}`;
    const sectionName = `Locked Linked Section ${uniqueSeed}`;
    let examId: string | null = null;
    let linkedQuestionId = "";

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    const sharedLibraryCards = sharedLibrarySection.locator(".questionBankCard");
    const linkableCard = await findLinkableSharedLibraryCard(sharedLibraryCards);

    if (!linkableCard) {
      test.skip(
        true,
        "No institute-visible shared-library card currently exposes Link to Local Bank.",
      );
    }

    const linkedQuestionText =
      ((await linkableCard!.locator("strong").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
    expect(linkedQuestionText).not.toBe("");
    const searchProbe = linkedQuestionText.slice(0, 60);

    const masterLibraryResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
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

    const linkResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/teacher/question-bank/master-library/") &&
        response.url().includes("/link") &&
        response.request().method() === "POST",
    );
    await linkableCard!.getByRole("button", { name: /link to local bank/i }).click();
    const linkResponse = await linkResponsePromise;
    expect(linkResponse.ok()).toBe(true);
    const compactQuestionListAfterLink = await getJson<PaginatedResponse<CompactQuestionRow>>(
      page,
      `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
      instituteAccessToken,
    );
    linkedQuestionId =
      compactQuestionListAfterLink.results.find((row) => row.shared_library_access_active)?.id ?? "";
    expect(linkedQuestionId).not.toBe("");

    const createdExam = await createInstituteExamShell(page, {
      title: examTitle,
      code: examCode,
    });
    examId = createdExam.id;
    expect(examId).not.toBeNull();

    await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
    const builderSubjectField = page.getByRole("combobox", { name: /subject/i });
    if (await builderSubjectField.count()) {
      const selectedLabel = await builderSubjectField.locator("option:checked").textContent();
      if ((selectedLabel ?? "").match(/no subject selected/i)) {
        await builderSubjectField.selectOption({ label: "Mathematics" });
      }
    }
    await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
    await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
    await page.getByRole("button", { name: /^add section$/i }).click();
    await expect(page).toHaveURL(/tab=sections&message=/);

    await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
    const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
      has: page.getByText(/attach one question manually/i),
    }).first();
    const questionSelect = manualAttachForm.locator('select[name="question"]');
    const matchingQuestionOption = await questionSelect.locator("option").evaluateAll(
      (options, probe) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .find((option) => option.value.trim().length > 0 && option.label.includes(probe)) ?? null,
      searchProbe,
    );
    expect(matchingQuestionOption).not.toBeNull();
    await questionSelect.selectOption(matchingQuestionOption!.value);

    const sectionSelect = manualAttachForm.locator('select[name="section"]');
    const sectionOption = await sectionSelect.locator("option").evaluateAll(
      (options, targetSectionName) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .find((option) => option.label.trim() === targetSectionName) ?? null,
      sectionName,
    );
    expect(sectionOption).not.toBeNull();
    await sectionSelect.selectOption(sectionOption!.value);
    await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
    await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
    await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
    await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
    await expect(page).toHaveURL(/tab=questions&message=/);
    await expect(page.getByText(/question linked to exam/i)).toBeVisible();

    await loginAsRole(page, "admin");
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");
    const entitlementsResponse = await page.request.get(
      `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
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
        row.institute_code === institute.code &&
        packageCodes.includes(row.question_bank_package_code) &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${institute.code} and package set ${packageCodes.join(", ")}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright builder update check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      const compactQuestionList = await getJson<PaginatedResponse<CompactQuestionRow>>(
        page,
        `/api/v1/question-bank/questions/?compact=1&search=${encodeURIComponent(searchProbe)}`,
        instituteAccessToken,
      );
      const pausedLinkedQuestion =
        compactQuestionList.results.find((row) => row.id === linkedQuestionId) ?? null;

      if (pausedLinkedQuestion?.shared_library_access_state !== "inactive") {
        test.skip(
          true,
          "The linked question remains covered by another active entitlement lane, so paused-entitlement update blocking is not expected for this row.",
        );
      }

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const linkedQuestionCard = page.locator(".builderQuestionCard").filter({
        hasText: searchProbe,
      }).first();
      await expect(linkedQuestionCard).toBeVisible();
      await expect(linkedQuestionCard).toContainText(sectionName);

      const linkedQuestionForm = linkedQuestionCard.locator("form.builderQuestionEditorGrid");
      await linkedQuestionForm.getByRole("spinbutton", { name: /^marks$/i }).fill("6");
      await linkedQuestionForm.getByRole("spinbutton", { name: /negative marks/i }).fill("1");
      await linkedQuestionForm.getByRole("button", { name: /save changes/i }).click();

      await expect(page).toHaveURL(/tab=questions&error=/);
      await expect(
        page.getByText(/no longer covered by the institute's active question-bank entitlements/i).first(),
      ).toBeVisible();
      await expect(
        linkedQuestionCard.getByText(/4(\.00)? marks/i),
      ).toBeVisible();
      await expect(
        linkedQuestionCard.getByText(/0(\.00)? negative/i),
      ).toBeVisible();
    } finally {
      for (const entitlement of targetEntitlements) {
        const reactivateResponse = await page.request.patch(
          `${instituteApiBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "active",
              notes: "Playwright builder update check restored this entitlement.",
            },
          },
        );
        expect(reactivateResponse.ok()).toBe(true);
      }

      if (examId) {
        await deleteInstituteExam(page, examId);
      }
    }
  });
});
