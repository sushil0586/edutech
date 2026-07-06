import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminOnboardingTypesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type CreatedInstitute = {
  id: string;
  name: string;
  code: string;
};

type PresetApplyResult = {
  summary: {
    academic_years: { created: number; updated: number };
    programs: { created: number; updated: number };
    subjects: { created: number; updated: number };
    topics: { created: number; updated: number };
  };
  access_results?: {
    question_bank_package: {
      enabled: boolean;
      package_code: string | null;
      status: string;
    };
    shared_library: {
      enabled: boolean;
      feature_code: string;
      status: string;
      source_package_code: string | null;
    };
    advanced_builder: {
      enabled: boolean;
      feature_code: string;
      status: string;
      source_package_code: string | null;
    };
  };
  question_assignment_results?: {
    mode?: string;
    status?: string;
  };
};

type TopicRecord = {
  id: string;
  name: string;
  code: string;
  parent_topic: string | null;
};

type AdminQuestionEntitlement = {
  id: string;
  institute_code?: string;
  question_bank_package_code?: string;
  status?: string;
};

type AdminFeatureEntitlement = {
  id: string;
  institute_code?: string;
  feature_code?: string;
  status?: string;
  source_package_code?: string | null;
};

function uniqueSeed() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function createInstituteViaApi(page: Page, name: string, code: string): Promise<CreatedInstitute> {
  const response = await page.request.post("/api/admin/institutes", {
    data: {
      name,
      code,
      email: `${code.toLowerCase()}@example.test`,
      phone: `91${String(Date.now()).slice(-8)}`,
      website: `https://${code.toLowerCase()}.example.test`,
      description: "Disposable onboarding test institute.",
    },
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { id: string; name: string; code: string };
  return {
    id: body.id,
    name: body.name,
    code: body.code,
  };
}

async function deleteInstituteViaApi(page: Page, instituteId: string | null) {
  if (!instituteId) {
    return;
  }
  try {
    await page.request.delete(`/api/admin/institutes/${instituteId}`, { timeout: 5000 });
  } catch {
    // Mutable onboarding cleanup is best-effort because seeded institute rows can be expensive to tear down.
  }
}

async function openMasterDefaults(page: Page, institute: CreatedInstitute) {
  await page.goto(`/admin/academic-setup?institute=${institute.id}&section=master-defaults`);
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`institute=${institute.id}(&|$)`));
  await expect(page.getByRole("combobox", { name: /select institute/i })).toHaveValue(institute.id);
  await expect(page.getByText(/master defaults/i).first()).toBeVisible();
  await expect(page.getByText(/onboarding profile defaults/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /apply preset/i })).toBeVisible();
}

async function setAcademicYear(page: Page, label: string) {
  await page.getByLabel(/academic year name/i).fill(label);
  await page.getByLabel(/academic year start/i).fill("2033-04-01");
  await page.getByLabel(/academic year end/i).fill("2034-03-31");
}

async function setAcademicYearWindow(page: Page, label: string, start: string, end: string) {
  await page.getByLabel(/academic year name/i).fill(label);
  await page.getByLabel(/academic year start/i).fill(start);
  await page.getByLabel(/academic year end/i).fill(end);
}

async function previewThenApply(page: Page) {
  await page.getByRole("button", { name: /preview changes/i }).click();
  await expect(page.getByText(/preview summary/i).first()).toBeVisible();
  const applyResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /apply preset/i }).click();
  const applyResponse = await applyResponsePromise;
  expect(applyResponse.ok()).toBe(true);
  await expect(page.getByText(/last apply result/i).first()).toBeVisible();
  await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
}

async function expectOnboardingOutcomeSummary(page: Page, instituteName: string) {
  const resultSection = page.locator("section.contentCard").filter({
    has: page.getByText(/last apply result/i).first(),
  }).first();
  const completionSummary = resultSection.getByTestId("onboarding-completion-summary");
  await expect(completionSummary).toBeVisible();
  await expect(
    completionSummary.getByText(/ready for guided use|needs operator follow-up/i).first(),
  ).toBeVisible();
  await expect(completionSummary.getByText(/what is ready now/i).first()).toBeVisible();
  await expect(completionSummary.getByText(/still needs attention/i).first()).toBeVisible();
  await expect(resultSection.getByText(/question usability after onboarding/i).first()).toBeVisible();
  await expect(resultSection.getByText(/operational health/i).first()).toBeVisible();
  await expect(resultSection.getByText(new RegExp(instituteName, "i")).first()).toBeVisible();
  await expect(resultSection.getByRole("link", { name: /open people/i }).first()).toBeVisible();
  await expect(resultSection.getByRole("link", { name: /open academic setup/i }).first()).toBeVisible();
  await expect(resultSection.getByRole("link", { name: /open question access/i }).first()).toBeVisible();
  await expect(resultSection.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
}

function createdOrUpdatedCount(bucket: { created: number; updated: number }) {
  return bucket.created + bucket.updated;
}

async function fetchRecords(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { results?: unknown[] } | unknown[];
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function getAccessToken(page: Page) {
  return (
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? ""
  );
}

async function fetchBackendRecords(page: Page, accessToken: string, path: string) {
  const response = await page.request.get(`${backendBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { results?: unknown[] } | unknown[];
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function countSubjects(page: Page, instituteId: string) {
  const results = await fetchRecords(page, `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=200`);
  return results.length;
}

async function countTopics(page: Page, instituteId: string) {
  const results = await fetchRecords(page, `/api/admin/academics/topics?institute=${encodeURIComponent(instituteId)}&page_size=400`);
  return results.length;
}

async function countPrograms(page: Page, instituteId: string) {
  const results = await fetchRecords(page, `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=50`);
  return results.length;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const optionValue = await locator.locator("option").evaluateAll((options) => {
    const match = options.find((option) => (option as HTMLOptionElement).value.trim().length > 0);
    return match ? (match as HTMLOptionElement).value : "";
  });
  expect(optionValue).toBeTruthy();
  await locator.selectOption(optionValue);
  return optionValue;
}

async function fetchQuestionBankPackages(page: Page) {
  const response = await page.request.get("/api/admin/economy/question-bank-packages");
  expect(response.ok()).toBe(true);
  return (await response.json()) as Array<{
    id: string;
    code: string;
    ownership_type?: string;
    is_active?: boolean;
  }>;
}

async function fetchPrograms(page: Page, instituteId: string) {
  return (await fetchRecords(
    page,
    `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=50`,
  )) as Array<{ id: string; name: string; code: string }>;
}

async function fetchSubjects(page: Page, instituteId: string) {
  return (await fetchRecords(
    page,
    `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=200`,
  )) as Array<{ id: string; name: string; code: string; program?: string | null }>;
}

async function fetchTopics(page: Page, instituteId: string, subjectId: string) {
  return (await fetchRecords(
    page,
    `/api/admin/academics/topics?institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subjectId)}&page_size=200`,
  )) as TopicRecord[];
}

async function expectAcademicCounts(
  page: Page,
  instituteId: string,
  expected: { programs?: number; subjects?: number; topics?: number },
) {
  if (typeof expected.programs === "number") {
    await expect.poll(async () => countPrograms(page, instituteId)).toBe(expected.programs);
  }
  if (typeof expected.subjects === "number") {
    await expect.poll(async () => countSubjects(page, instituteId)).toBe(expected.subjects);
  }
  if (typeof expected.topics === "number") {
    await expect.poll(async () => countTopics(page, instituteId)).toBe(expected.topics);
  }
}

test.describe("Admin onboarding types", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
      "admin onboarding mode browser coverage",
    ),
  );

  test("@workflow @mutable admin can complete manual full-preset onboarding on a fresh institute", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Full ${seed}`, `PWF${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await expect(page.getByText(/no profile selected/i).first()).toBeVisible();
      await setAcademicYear(page, `2033-2034 Full ${seed}`);
      await page.getByLabel(/apply mode/i).selectOption("full");
      await previewThenApply(page);

      await expect(page.getByText(/profile manual/i).first()).toBeVisible();
      await expect(page.getByText(/audit returned no immediate structural findings|audit returned/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await expectOnboardingOutcomeSummary(page, institute.name);
      await expect(page.getByTestId("onboarding-completion-summary").getByText(/ready for guided use/i)).toBeVisible();

      expect(await countPrograms(page, institute.id)).toBeGreaterThanOrEqual(1);
      expect(await countSubjects(page, institute.id)).toBeGreaterThanOrEqual(5);
      expect(await countTopics(page, institute.id)).toBeGreaterThan(20);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard an institute with only selected subjects", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Subjects ${seed}`, `PWS${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2033-2034 Subjects ${seed}`);
      await page.getByLabel(/apply mode/i).selectOption("selected_subjects");
      await page.waitForTimeout(500);
      const subjectsSection = page.locator("section.contentCard").filter({
        has: page.getByText(/select subjects to apply/i).first(),
      }).first();
      await expect(subjectsSection).toBeVisible();
      const mathCheckbox = subjectsSection.getByRole("checkbox", { name: /math/i });
      const scienceCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Science 18 topics · CLS7-SCI",
        exact: true,
      });
      const socialScienceCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Social Science 12 topics · CLS7-SST",
        exact: true,
      });
      const computerCheckbox = subjectsSection.getByRole("checkbox", {
        name: "Computer 15 topics · CLS7-COMP",
        exact: true,
      });
      const generalKnowledgeCheckbox = subjectsSection.getByRole("checkbox", {
        name: "General Knowledge 12 topics · CLS7-GK",
        exact: true,
      });
      await expect(mathCheckbox).toBeVisible();
      for (const checkbox of [socialScienceCheckbox, computerCheckbox, generalKnowledgeCheckbox]) {
        if (await checkbox.isChecked()) {
          await checkbox.click();
        }
        await expect.poll(async () => checkbox.isChecked()).toBe(false);
      }
      await expect.poll(async () => mathCheckbox.isChecked()).toBe(true);
      await expect.poll(async () => scienceCheckbox.isChecked()).toBe(true);
      await page.getByRole("button", { name: /preview changes/i }).click();
      await expect(page.getByText(/preview summary/i).first()).toBeVisible();
      await expect(page.getByText(/subjects/i).first()).toBeVisible();
      await expect(page.getByText(/topics to create/i).first()).toBeVisible();
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;
      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      await expect(page.getByText(/profile manual/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await expectOnboardingOutcomeSummary(page, institute.name);
      await expect(page.getByTestId("onboarding-completion-summary").getByText(/ready for guided use/i)).toBeVisible();

      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(2);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(50);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard an institute with only selected topic groups", async ({ page }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Topics ${seed}`, `PWT${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYearWindow(page, `2041-2042 Topics ${seed}`, "2041-04-01", "2042-03-31");
      await page.getByLabel(/apply mode/i).selectOption("selected_topic_groups");
      await page.waitForTimeout(500);
      const topicGroupsSection = page.locator("section.contentCard").filter({
        has: page.getByText(/select topic groups to apply/i).first(),
      }).first();
      await expect(topicGroupsSection).toBeVisible();
      await expect(topicGroupsSection.getByRole("checkbox", { name: /numbers and place value/i })).toBeVisible();
      for (const label of [
        "Arithmetic and Decimals 3 child topics · MATH-ARITH",
        "Introductory Algebra 3 child topics · MATH-ALGEBRA",
        "Geometry 3 child topics · MATH-GEOMETRY",
        "Fractions 3 child topics · MATH-FRACTIONS",
        "Logical and Computational Thinking 3 child topics · MATH-LOGIC",
      ]) {
        const checkbox = topicGroupsSection.getByRole("checkbox", { name: label, exact: true });
        await checkbox.click();
        await expect.poll(async () => checkbox.isChecked()).toBe(false);
        await page.waitForTimeout(200);
      }
      await page.getByRole("button", { name: /preview changes/i }).click();
      await expect(page.getByText(/preview summary/i).first()).toBeVisible();
      await expect(page.getByText(/82 topics to (create|update)/i)).toBeVisible();
      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      if (!applyResponse.ok()) {
        throw new Error(`selected_topic_groups apply failed: ${applyResponse.status()} ${await applyResponse.text()}`);
      }
      const applyResult = (await applyResponse.json()) as PresetApplyResult;
      expect(createdOrUpdatedCount(applyResult.summary.academic_years)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(5);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(82);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin can onboard a fresh institute with the Class 8 Math preset through master defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Class8 ${seed}`, `PW8${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2035-2036 Class8 ${seed}`);
      await page.getByLabel(/academic preset/i).selectOption("class_8_cbse_core");
      await page.getByLabel(/apply mode/i).selectOption("full");

      await page.getByRole("button", { name: /preview changes/i }).click();
      await expect(page.getByText(/preview summary/i).first()).toBeVisible();
      await expect(page.getByText(/1 subject/i).first()).toBeVisible();
      await expect(page.getByText(/8 topics to create/i).first()).toBeVisible();

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      expect(createdOrUpdatedCount(applyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(applyResult.summary.subjects)).toBe(1);
      expect(createdOrUpdatedCount(applyResult.summary.topics)).toBe(8);

      await expectAcademicCounts(page, institute.id, {
        programs: 1,
        subjects: 1,
        topics: 8,
      });

      const programs = await fetchPrograms(page, institute.id);
      const class8Program = programs.find((item) => item.code === "CLS8");
      expect(class8Program).toBeTruthy();

      const subjects = await fetchSubjects(page, institute.id);
      const class8Math = subjects.find((item) => item.code === "CLS8-MATH");
      expect(class8Math).toBeTruthy();
      expect(class8Math?.program).toBe(class8Program?.id);

      const topics = await fetchTopics(page, institute.id, class8Math!.id);
      const parentTopics = topics.filter((item) => item.parent_topic === null);
      const childTopics = topics.filter((item) => item.parent_topic !== null);
      expect(parentTopics.map((item) => item.name).sort()).toEqual([
        "Algebraic Expressions and Identities",
        "Comparing Quantities",
        "Linear Equations in One Variable",
        "Rational Numbers",
      ]);
      expect(childTopics).toHaveLength(4);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin can grant question-bank and advanced-builder access during onboarding from master defaults", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Access ${seed}`, `PWA${seed.slice(-5)}`);
      instituteId = institute.id;
      const adminAccessToken = await getAccessToken(page);
      expect(adminAccessToken).toBeTruthy();

      const packageCatalog = await fetchQuestionBankPackages(page);
      const eligiblePackage = packageCatalog.find(
        (pkg) => pkg.ownership_type === "platform" && pkg.is_active !== false,
      );
      if (!eligiblePackage) {
        test.skip(true, "No active platform-managed question-bank package is available for master-default onboarding.");
      }

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2036-2037 Access ${seed}`);
      await page.getByLabel(/academic preset/i).selectOption("class_8_cbse_core");
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await expect
        .poll(async () => page.getByLabel(/default question-bank package/i).inputValue())
        .toBe(eligiblePackage.code);
      await page.getByLabel(/question linking mode/i).selectOption("access_only");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyResult = (await applyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/last apply result/i).first()).toBeVisible();
      await expect(page.getByText(/package access granted|package access reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/shared library granted|shared library reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/advanced builder granted|advanced builder reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/linking mode grant access only/i).first()).toBeVisible();
      await expect(page.getByText(/manual linking still required/i).first()).toBeVisible();
      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await expectOnboardingOutcomeSummary(page, institute.name);
      await expect(page.getByTestId("onboarding-completion-summary").getByText(/ready for guided use/i)).toBeVisible();
      await expect(
        page.getByTestId("onboarding-completion-summary").getByText(/staff still need to link questions manually/i),
      ).toBeVisible();

      expect(applyResult.access_results?.question_bank_package.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        applyResult.access_results?.question_bank_package.status ?? "",
      );
      expect(applyResult.access_results?.question_bank_package.package_code).toBeTruthy();
      expect(applyResult.access_results?.shared_library.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(applyResult.access_results?.shared_library.status ?? "");
      expect(applyResult.access_results?.shared_library.feature_code).toBe("QUESTION_BANK_SHARED_LIBRARY");
      expect(applyResult.access_results?.shared_library.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
      expect(applyResult.access_results?.advanced_builder.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        applyResult.access_results?.advanced_builder.status ?? "",
      );
      expect(applyResult.access_results?.advanced_builder.feature_code).toBe("ADVANCED_EXAM_BUILDER");
      expect(applyResult.question_assignment_results?.mode).toBe("access_only");
      expect(applyResult.question_assignment_results?.status).toBe("completed");

      const questionEntitlements = (await fetchBackendRecords(
        page,
        adminAccessToken,
        `/api/v1/economy/admin/question-bank-entitlements/`,
      )) as AdminQuestionEntitlement[];
      const packageEntitlement = questionEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.question_bank_package_code === applyResult.access_results?.question_bank_package.package_code,
      );
      expect(packageEntitlement).toBeTruthy();
      expect(packageEntitlement?.status?.toLowerCase()).toBe("active");

      const featureEntitlements = (await fetchBackendRecords(
        page,
        adminAccessToken,
        `/api/v1/economy/admin/question-bank-feature-entitlements/`,
      )) as AdminFeatureEntitlement[];
      const builderEntitlement = featureEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.feature_code === "ADVANCED_EXAM_BUILDER",
      );
      const sharedLibraryEntitlement = featureEntitlements.find(
        (row) =>
          row.institute_code === institute.code &&
          row.feature_code === "QUESTION_BANK_SHARED_LIBRARY",
      );
      expect(sharedLibraryEntitlement).toBeTruthy();
      expect(sharedLibraryEntitlement?.status?.toLowerCase()).toBe("active");
      expect(sharedLibraryEntitlement?.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
      expect(builderEntitlement).toBeTruthy();
      expect(builderEntitlement?.status?.toLowerCase()).toBe("active");
      expect(builderEntitlement?.source_package_code).toBe(
        applyResult.access_results?.question_bank_package.package_code ?? null,
      );
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin can reapply onboarding on an existing institute without duplicating academic structure", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Reapply ${seed}`, `PWR${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2037-2038 Reapply ${seed}`);
      await page.getByLabel(/apply mode/i).selectOption("full");
      await previewThenApply(page);
      await expectOnboardingOutcomeSummary(page, institute.name);

      const initialProgramCount = await countPrograms(page, institute.id);
      const initialSubjectCount = await countSubjects(page, institute.id);
      const initialTopicCount = await countTopics(page, institute.id);

      expect(initialProgramCount).toBeGreaterThanOrEqual(1);
      expect(initialSubjectCount).toBeGreaterThanOrEqual(5);
      expect(initialTopicCount).toBeGreaterThan(20);

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2037-2038 Reapply ${seed}`);
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/question linking mode/i).selectOption("access_only");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");

      const reapplyResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /apply preset/i }).click();
      const reapplyResponse = await reapplyResponsePromise;
      expect(reapplyResponse.ok()).toBe(true);
      const reapplyResult = (await reapplyResponse.json()) as PresetApplyResult;

      await expect(page.getByText(/onboarding applied to/i).first()).toBeVisible();
      await expectOnboardingOutcomeSummary(page, institute.name);
      await expect(page.getByTestId("onboarding-completion-summary").getByText(/ready for guided use/i)).toBeVisible();

      expect(createdOrUpdatedCount(reapplyResult.summary.programs)).toBeGreaterThanOrEqual(1);
      expect(createdOrUpdatedCount(reapplyResult.summary.subjects)).toBeGreaterThanOrEqual(initialSubjectCount);
      expect(createdOrUpdatedCount(reapplyResult.summary.topics)).toBeGreaterThanOrEqual(initialTopicCount);
      expect(reapplyResult.access_results?.question_bank_package.enabled).toBe(true);
      expect(["granted", "reactivated"]).toContain(
        reapplyResult.access_results?.advanced_builder.status ?? "",
      );
      expect(reapplyResult.question_assignment_results?.mode).toBe("access_only");

      await expect.poll(async () => countPrograms(page, institute.id)).toBe(initialProgramCount);
      await expect.poll(async () => countSubjects(page, institute.id)).toBe(initialSubjectCount);
      await expect.poll(async () => countTopics(page, institute.id)).toBe(initialTopicCount);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });

  test("@workflow @mutable admin sees strong operator warnings for incomplete onboarding access setup before apply", async ({
    page,
  }) => {
    test.setTimeout(120000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Onboarding Warning ${seed}`, `PWW${seed.slice(-5)}`);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, `2038-2039 Warning ${seed}`);
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("");
      await page.getByLabel(/question linking mode/i).selectOption("access_only");
      await page.getByLabel(/advanced builder access/i).selectOption("disabled");

      const warningStack = page.locator('[role="status"][aria-live="polite"]').first();
      await expect(warningStack).toBeVisible();
      await expect(warningStack.getByText(/question-bank access is enabled, but no package is selected yet/i)).toBeVisible();
      await expect(warningStack.getByText(/you selected grant access only/i)).toBeVisible();
      await expect(
        warningStack.getByText(/question-bank access is enabled while advanced builder is disabled/i),
      ).toBeVisible();

      const previewResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/admin\/academics\/presets\/preview$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: /preview changes/i }).click();
      const previewResponse = await previewResponsePromise;
      expect(previewResponse.ok()).toBe(false);
      await expect(page.getByText(/select a question-bank package when package access is enabled/i)).toBeVisible();
      await expect(page.getByText(/preview summary/i)).toHaveCount(0);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });
});
