import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminEconomyQuestionBankPage } from "../page-objects/admin/admin-economy-question-bank.po";
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

type CreatedInstitute = {
  id: string;
  name: string;
  code: string;
};

type AdminQuestionBankPackage = {
  id: string;
  code: string;
  name: string;
  institute: string;
  institute_code: string;
};

const SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

function uniqueSeed() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
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

async function createInstituteViaApi(page: Page, name: string, code: string): Promise<CreatedInstitute> {
  const response = await page.request.post("/api/admin/institutes", {
    data: {
      name,
      code,
      email: `${code.toLowerCase()}@example.test`,
      phone: `91${String(Date.now()).slice(-8)}`,
      website: `https://${code.toLowerCase()}.example.test`,
      description: "Disposable package-scope expansion institute created by Playwright.",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CreatedInstitute;
}

async function grantSharedLibraryFeatureViaApi(page: Page, instituteId: string, packageId: string) {
  const response = await page.request.post("/api/admin/economy/question-bank-feature-entitlements", {
    data: {
      institute: instituteId,
      feature_code: SHARED_LIBRARY_FEATURE_CODE,
      source_package: packageId,
      metadata: {
        source: "admin-package-scope-expansion-institute-linker.mutable.spec.ts",
      },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function deleteInstituteViaApi(page: Page, instituteId: string | null) {
  if (!instituteId) {
    return;
  }
  try {
    await page.request.delete(`/api/admin/institutes/${instituteId}`, { timeout: 5000 });
  } catch {
    // Best-effort cleanup.
  }
}

async function openMasterDefaults(page: Page, institute: CreatedInstitute) {
  await page.goto(`/admin/academic-setup?institute=${institute.id}&section=master-defaults`);
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /apply preset/i })).toBeVisible();
}

async function setAcademicYear(page: Page, label: string, start: string, end: string) {
  await page.getByLabel(/academic year name/i).fill(label);
  await page.getByLabel(/academic year start/i).fill(start);
  await page.getByLabel(/academic year end/i).fill(end);
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

async function createInstituteLoginViaUi(page: Page, instituteId: string): Promise<DirectLoginCredentials> {
  const apiResponse = await page.request.post(`/api/admin/account-management/institutes/${instituteId}/create-login`, {
    data: {
      auto_generate: true,
    },
  });
  if (apiResponse.ok()) {
    const payload = (await apiResponse.json()) as {
      username?: string;
      generated_password?: string;
    };
    if (payload.username && payload.generated_password) {
      return {
        username: payload.username.trim(),
        password: payload.generated_password.trim(),
      };
    }
  }

  await page.goto(`/admin/institutes?institute=${instituteId}`);
  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(detailCard).toBeVisible();

  const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
  await expect(accountPanel).toContainText(/credential controls/i);

  const extractVisibleCredentials = async () => {
    const panelText = await accountPanel.innerText();
    const usernameMatch = panelText.match(/username:\s*([^\s]+)/i);
    const passwordMatch = panelText.match(/generated password:\s*([^\s]+)/i);
    if (!usernameMatch || !passwordMatch) {
      return null;
    }
    return {
      username: usernameMatch[1]!.trim(),
      password: passwordMatch[1]!.trim(),
    } satisfies DirectLoginCredentials;
  };

  const existingCredentials = await extractVisibleCredentials();
  if (existingCredentials) {
    return existingCredentials;
  }

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

  return {
    username: payload.username!.trim(),
    password: payload.generated_password!.trim(),
  };
}

async function readInlineSummaryCount(page: Page, label: RegExp) {
  const note = await page
    .locator(".questionBankCardMetaNote")
    .filter({ hasText: label })
    .first()
    .innerText();
  const count = Number((note.match(/\d+/) ?? ["0"])[0]);
  return count;
}

test.describe("Admin package scope expansion institute proof", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin package scope expansion institute proof",
    ),
  );

  test("@workflow @mutable admin can widen a package from math-only to math-plus-science and the institute linker reflects the change", async ({
    page,
  }) => {
    test.setTimeout(300000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = await getAdminAccessToken(page);
    const packages = await fetchAdminQuestionBankPackages(page, adminAccessToken);
    const scholarPackage = packages.find((pkg) => pkg.code === "SCHOLAR-QUESTION-BANK-ACCESS");
    expect(scholarPackage).toBeTruthy();

    const economyPage = new AdminEconomyQuestionBankPage(page);
    await economyPage.goto();

    const seed = uniqueSeed();
    const packageName = `AA PW Scope Expansion ${seed}`;
    const packageCode = `AA-PW-SCOPE-${seed.slice(-6)}`;
    const instituteCode = `PSX${seed.slice(-5)}`;
    const instituteName = `PW Scope Expansion Institute ${seed}`;
    const academicYearLabel = `2040-2041 Scope ${seed}`;
    let instituteId: string | null = null;

    try {
      await economyPage.selectPackageInstituteById(scholarPackage!.institute);
      await economyPage.selectPackageType(/subject library/i);
      await economyPage.fillPackageIdentity(
        packageName,
        packageCode,
        "Disposable browser-only package created to prove package-scope widening from math to science.",
      );
      await economyPage.selectAccessMode(/link on demand/i);
      const firstScopeRow = economyPage.scopeRows().first();
      await economyPage.selectScopeProgram(firstScopeRow, /class 7/i);
      await economyPage.selectScopeSubject(firstScopeRow, /math/i);
      await economyPage.setScopeActive(firstScopeRow);
      await economyPage.createPackage();
      await expect(economyPage.packageCard().getByTestId("package-save-outcome")).toContainText(/math/i);

      const institute = await createInstituteViaApi(page, instituteName, instituteCode);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, academicYearLabel, "2040-04-01", "2041-03-31");
      await page.getByLabel(/academic preset/i).selectOption("class_7_cbse_core");
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption(packageCode);
      await page.getByLabel(/question linking mode/i).selectOption("auto_link_selected_scope");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");
      await applyPreset(page);
      const createdPackage = (await fetchAdminQuestionBankPackages(page, adminAccessToken)).find(
        (pkg) => pkg.code === packageCode,
      );
      expect(createdPackage).toBeTruthy();
      await grantSharedLibraryFeatureViaApi(page, institute.id, createdPackage!.id);

      const instituteCredentials = await createInstituteLoginViaUi(page, institute.id);

      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      const linker = new InstituteSharedLibraryLinkerPage(page);
      await linker.goto();
      await linker.expectLoaded();
      await linker.selectProgram(/class 7/i);
      await linker.selectSubject(/science/i);
      await linker.loadTopics();
      await linker.expectSubjectSummary(/science/i);

      const scienceBefore = await readInlineSummaryCount(page, /available in platform bank/i);
      expect(scienceBefore).toBe(0);

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      await economyPage.goto(createdPackage!.institute);
      await economyPage.openCatalogView();
      await economyPage.selectCatalogInstituteFilter(createdPackage!.institute);
      await economyPage.selectCatalogRowsToShow("12");
      await economyPage.editPackage(packageName);
      await economyPage.quickAddSubjectRow(/add science/i);
      await economyPage.savePackageUpdate();
      await expect(economyPage.packageCard().getByTestId("package-save-outcome")).toContainText(/science/i);

      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await linker.goto();
      await linker.expectLoaded();
      await linker.selectProgram(/class 7/i);
      await linker.selectSubject(/science/i);
      await linker.loadTopics();
      await linker.expectSubjectSummary(/science/i);

      const scienceAfter = await readInlineSummaryCount(page, /available in platform bank/i);
      expect(scienceAfter).toBe(900);
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });
});
