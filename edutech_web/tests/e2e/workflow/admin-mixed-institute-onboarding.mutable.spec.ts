import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminEconomyQuestionBankPage } from "../page-objects/admin/admin-economy-question-bank.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";
import { InstituteSharedLibraryLinkerPage } from "../page-objects/institute/institute-shared-library-linker.po";

const mutableAdminOnboardingTypesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);
const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const opbmsCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "opbms",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};
const SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

type CreatedInstitute = {
  id: string;
  name: string;
  code: string;
};

type AdminQuestionBankPackage = {
  id: string;
  code: string;
  scopes: Array<{
    program_name: string | null;
    subject_name: string | null;
  }>;
};

type AdminQuestionBankEntitlement = {
  id: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

type AdminFeatureEntitlement = {
  id: string;
  institute_code: string;
  feature_code: string;
  status: string;
  source_package_code?: string | null;
};

type AcademicProgram = {
  id: string;
  name: string;
  code: string;
};

type AcademicSubject = {
  id: string;
  name: string;
  code: string;
  program?: string | null;
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
      description: "Disposable mixed onboarding institute created by Playwright.",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { id: string; name: string; code: string };
  return body;
}

async function deleteInstituteViaApi(page: Page, instituteId: string | null) {
  if (!instituteId) {
    return;
  }
  try {
    await page.request.delete(`/api/admin/institutes/${instituteId}`, { timeout: 5000 });
  } catch {
    // Best-effort cleanup only.
  }
}

async function getAdminAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

async function fetchAdminQuestionBankPackages(page: Page, adminAccessToken: string) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminQuestionBankPackage[];
}

async function fetchAdminQuestionBankEntitlements(page: Page, adminAccessToken: string) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminQuestionBankEntitlement[];
}

async function fetchAdminFeatureEntitlements(page: Page, adminAccessToken: string) {
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/economy/admin/question-bank-feature-entitlements/`,
    {
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminFeatureEntitlement[];
}

async function fetchInstituteByCode(page: Page, adminAccessToken: string, instituteCode: string) {
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/institutes/?search=${encodeURIComponent(instituteCode)}`,
    {
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
      },
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { results?: CreatedInstitute[] } | CreatedInstitute[];
  const rows = Array.isArray(payload) ? payload : (payload.results ?? []);
  const institute = rows.find((row) => row.code === instituteCode);
  expect(institute).toBeTruthy();
  return institute!;
}

async function fetchRecords<T>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { results?: T[] } | T[];
  return Array.isArray(payload) ? payload : (payload.results ?? []);
}

async function fetchPrograms(page: Page, instituteId: string) {
  return fetchRecords<AcademicProgram>(
    page,
    `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=50`,
  );
}

async function fetchSubjects(page: Page, instituteId: string) {
  return fetchRecords<AcademicSubject>(
    page,
    `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=200`,
  );
}

async function ensureScholarScope(
  page: Page,
  economyPage: AdminEconomyQuestionBankPage,
  adminAccessToken: string,
  scopes: Array<{ program: RegExp; subject: RegExp }>,
) {
  const packages = await fetchAdminQuestionBankPackages(page, adminAccessToken);
  const scholarPackage = packages.find((pkg) => pkg.code === "SCHOLAR-QUESTION-BANK-ACCESS");
  expect(scholarPackage).toBeTruthy();

  const missingScopes = scopes.filter(
    (requiredScope) =>
      !scholarPackage!.scopes.some(
        (currentScope) =>
          requiredScope.program.test(currentScope.program_name || "") &&
          requiredScope.subject.test(currentScope.subject_name || ""),
      ),
  );

  if (!missingScopes.length) {
    return;
  }

  await economyPage.goto();
  await economyPage.openCatalogView();
  await economyPage.editPackage("Scholar Question Bank Access");

  for (const missingScope of missingScopes) {
    await economyPage.addScopeRow();
    const scopeRows = economyPage.scopeRows();
    const newScopeRow = scopeRows.nth((await scopeRows.count()) - 1);
    await economyPage.selectScopeProgram(newScopeRow, missingScope.program);
    await economyPage.selectScopeSubject(newScopeRow, missingScope.subject);
    await economyPage.setScopeActive(newScopeRow);
  }

  await economyPage.savePackageUpdate();
}

async function restoreEntitlementIfNeeded(
  page: Page,
  economyPage: AdminEconomyQuestionBankPage,
  entitlementId: string,
  currentStatus: string,
) {
  const entitlementRow = economyPage.entitlementRow(entitlementId);
  await expect(entitlementRow).toBeVisible();

  if (currentStatus === "revoked") {
    const restoreResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/admin/economy/question-bank-entitlements/${entitlementId}`) &&
      response.request().method() === "PATCH",
    );
    await entitlementRow.getByRole("button", { name: /restore institute access/i }).click();
    const restoreResponse = await restoreResponsePromise;
    expect(restoreResponse.ok(), await restoreResponse.text()).toBe(true);
  } else if (currentStatus === "paused") {
    const reactivateResponsePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/admin/economy/question-bank-entitlements/${entitlementId}`) &&
      response.request().method() === "PATCH",
    );
    await entitlementRow.getByRole("button", { name: /reactivate entitlement/i }).click();
    const reactivateResponse = await reactivateResponsePromise;
    expect(reactivateResponse.ok(), await reactivateResponse.text()).toBe(true);
  }

  await expect(entitlementRow).toContainText(/status:\s*active/i);
}

async function ensureSharedLibraryFeatureActive(
  page: Page,
  adminAccessToken: string,
  instituteId: string,
  instituteCode: string,
  packageId: string,
  packageCode: string,
) {
  const featureEntitlements = await fetchAdminFeatureEntitlements(page, adminAccessToken);
  const sharedLibraryEntitlement = featureEntitlements.find(
    (row) => row.institute_code === instituteCode && row.feature_code === SHARED_LIBRARY_FEATURE_CODE,
  );
  if (sharedLibraryEntitlement && sharedLibraryEntitlement.status.toLowerCase() === "active") {
    return;
  }

  const response = await page.request.post("/api/admin/economy/question-bank-feature-entitlements", {
    data: {
      institute: instituteId,
      feature_code: SHARED_LIBRARY_FEATURE_CODE,
      source_package: packageId,
      metadata: {
        source: "admin-mixed-institute-onboarding.mutable.spec.ts",
        package_code: packageCode,
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function openMasterDefaults(page: Page, institute: CreatedInstitute) {
  await page.goto(`/admin/academic-setup?institute=${institute.id}&section=master-defaults`);
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`institute=${institute.id}(&|$)`));
  await expect(page.getByRole("button", { name: /apply preset/i })).toBeVisible();
}

async function setAcademicYear(page: Page, label: string, start: string, end: string) {
  await page.getByLabel(/academic year name/i).fill(label);
  await page.getByLabel(/academic year start/i).fill(start);
  await page.getByLabel(/academic year end/i).fill(end);
}

async function deselectSubject(page: Page, label: string) {
  const section = page.locator("section.contentCard").filter({
    has: page.getByText(/select subjects to apply/i).first(),
  }).first();
  const checkbox = section.getByRole("checkbox", { name: label, exact: true });
  await checkbox.click();
  await expect.poll(async () => checkbox.isChecked()).toBe(false);
}

async function applyPreset(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /apply preset/i }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page.getByText(/last apply result/i).first()).toBeVisible();
}

async function createInstituteLoginViaUi(page: Page, instituteId: string) {
  await page.goto(`/admin/institutes?institute=${instituteId}`);
  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(detailCard).toBeVisible();

  const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
  await expect(accountPanel).toContainText(/credential controls/i);

  const createLoginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
      response.request().method() === "POST",
  );
  await accountPanel.getByRole("button", { name: /create login/i }).click();
  const createLoginResponse = await createLoginResponsePromise;
  expect(createLoginResponse.ok(), await createLoginResponse.text()).toBe(true);

  const payload = (await createLoginResponse.json()) as {
    username?: string;
    generated_password?: string;
  };
  expect(payload.username).toBeTruthy();
  expect(payload.generated_password).toBeTruthy();
  await expect(accountPanel.getByText(/created login for/i)).toBeVisible();

  return {
    username: payload.username!.trim(),
    password: payload.generated_password!.trim(),
  };
}

async function openLinkedQuestionBankForScope(page: Page, programLabel: RegExp, subjectLabel: RegExp) {
  const questionBank = new InstituteQuestionBankPage(page);
  await questionBank.gotoLinked();
  await questionBank.expectLinkedLoaded();
  await questionBank.selectAcademicFilters(programLabel, subjectLabel);
  await page.getByRole("button", { name: /apply filters/i }).click();
  await questionBank.expectLinkedScopeSummary();
}

async function readSummaryCount(page: Page, label: RegExp) {
  const resolvedLabel = /total linked questions/i.test(label.source)
    ? /total linked rows in this filtered scope/i
    : label;
  const value = await page
    .locator(".builderSummaryCard")
    .filter({ hasText: resolvedLabel })
    .first()
    .locator("strong")
    .innerText();
  return Number(value.replace(/[^\d]/g, ""));
}

test.describe("Admin mixed institute onboarding", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES=1 and PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS=1 for mixed institute onboarding coverage.",
  );

  test("@workflow @mutable admin can extend OPBMS access and onboard a fresh mixed-preset institute", async ({
    page,
  }) => {
    test.setTimeout(240000);
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = await getAdminAccessToken(page);
    const economyPage = new AdminEconomyQuestionBankPage(page);

    await ensureScholarScope(page, economyPage, adminAccessToken, [
      { program: /class 7/i, subject: /science/i },
      { program: /class 8/i, subject: /math/i },
    ]);
    const packages = await fetchAdminQuestionBankPackages(page, adminAccessToken);
    const scholarPackage = packages.find((pkg) => pkg.code === "SCHOLAR-QUESTION-BANK-ACCESS");
    expect(scholarPackage).toBeTruthy();

    await economyPage.goto();
    await economyPage.showEntitlementsForPackage("Scholar Question Bank Access (SCHOLAR-QUESTION-BANK-ACCESS)");
    const entitlements = await fetchAdminQuestionBankEntitlements(page, adminAccessToken);
    const opbmsScholarEntitlement = entitlements.find(
      (entitlement) =>
        entitlement.institute_code === "OPBMS" &&
        entitlement.question_bank_package_code === "SCHOLAR-QUESTION-BANK-ACCESS",
    );
    expect(opbmsScholarEntitlement).toBeTruthy();
    await restoreEntitlementIfNeeded(
      page,
      economyPage,
      opbmsScholarEntitlement!.id,
      opbmsScholarEntitlement!.status.toLowerCase(),
    );

    const opbmsInstitute = await fetchInstituteByCode(page, adminAccessToken, "OPBMS");
    await ensureSharedLibraryFeatureActive(
      page,
      adminAccessToken,
      opbmsInstitute.id,
      opbmsInstitute.code,
      scholarPackage!.id,
      scholarPackage!.code,
    );
    await openMasterDefaults(page, opbmsInstitute);
    await setAcademicYear(page, "2038-2039 OPBMS Class8", "2038-04-01", "2039-03-31");
    await page.getByLabel(/academic preset/i).selectOption("class_8_cbse_core");
    await page.getByLabel(/apply mode/i).selectOption("full");
    await page.getByLabel(/question-bank package access/i).selectOption("disabled");
    await page.getByLabel(/advanced builder access/i).selectOption("disabled");
    await applyPreset(page);

    const opbmsPrograms = await fetchPrograms(page, opbmsInstitute.id);
    const opbmsClass8Program = opbmsPrograms.find((entry) => entry.code === "CLS8");
    expect(opbmsClass8Program).toBeTruthy();
    const opbmsSubjects = await fetchSubjects(page, opbmsInstitute.id);
    const opbmsClass8Math = opbmsSubjects.find(
      (entry) => entry.code === "CLS8-MATH" && entry.program === opbmsClass8Program!.id,
    );
    expect(opbmsClass8Math).toBeTruthy();

    await loginWithCredentials(page, opbmsCredentials, "institute");
    await expectInstituteWorkspace(page);

    const sharedLibraryLinker = new InstituteSharedLibraryLinkerPage(page);
    await sharedLibraryLinker.gotoForScope(opbmsClass8Program!.id, opbmsClass8Math!.id);
    await sharedLibraryLinker.expectLoaded();
    await sharedLibraryLinker.expectSubjectSummary(/math/i);
    await sharedLibraryLinker.expectSubjectTotal(/platform source in this subject/i, 200);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const seed = uniqueSeed();
    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, `PW Mixed Onboarding ${seed}`, `PWM${seed.slice(-5)}`);
      instituteId = institute.id;
      const mixedAcademicYearLabel = `2038-2039 Mixed ${seed}`;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, mixedAcademicYearLabel, "2038-04-01", "2039-03-31");
      await page.getByLabel(/apply mode/i).selectOption("selected_subjects");
      await page.waitForTimeout(500);
      for (const label of [
        "Social Science 12 topics · CLS7-SST",
        "Computer 15 topics · CLS7-COMP",
        "General Knowledge 12 topics · CLS7-GK",
      ]) {
        await deselectSubject(page, label);
      }
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("SCHOLAR-QUESTION-BANK-ACCESS");
      await page.getByLabel(/question linking mode/i).selectOption("auto_link_selected_scope");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");
      await applyPreset(page);
      await expect(page.getByText(/package access granted|package access reactivated/i).first()).toBeVisible();
      await expect(page.getByText(/advanced builder granted|advanced builder reactivated/i).first()).toBeVisible();

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, mixedAcademicYearLabel, "2038-04-01", "2039-03-31");
      await page.getByLabel(/academic preset/i).selectOption("class_8_cbse_core");
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("SCHOLAR-QUESTION-BANK-ACCESS");
      await page.getByLabel(/question linking mode/i).selectOption("auto_link_selected_scope");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");
      await applyPreset(page);

      const createdInstituteCredentials = await createInstituteLoginViaUi(page, institute.id);
      await loginWithCredentials(page, createdInstituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await openLinkedQuestionBankForScope(page, /class 7/i, /math/i);
      await expect(page.getByText(/subject:\s*math/i).first()).toBeVisible();
      expect(await readSummaryCount(page, /total linked questions/i)).toBeGreaterThanOrEqual(650);

      await openLinkedQuestionBankForScope(page, /class 7/i, /science/i);
      await expect(page.getByText(/subject:\s*science/i).first()).toBeVisible();
      expect(await readSummaryCount(page, /total linked questions/i)).toBeGreaterThanOrEqual(900);

      await openLinkedQuestionBankForScope(page, /class 8/i, /math/i);
      await expect(page.getByText(/subject:\s*math/i).first()).toBeVisible();
      expect(await readSummaryCount(page, /total linked questions/i)).toBe(200);

      await page.goto("/institute/exams/advanced");
      await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
      await expect(page.getByText(/not enabled for this institute yet/i)).toHaveCount(0);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });
});
