import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
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

const SHARED_LIBRARY_FEATURE_CODE = "QUESTION_BANK_SHARED_LIBRARY";

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
  description?: string;
  package_type?: string;
  ownership_type?: string;
  access_mode?: string;
  is_public_catalog?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
  scopes?: Array<{
    id?: string;
    program?: string | null;
    subject?: string | null;
    topic?: string | null;
    question_source_type?: string;
    difficulty_level?: string;
    question_type?: string;
    master_visibility?: string;
    max_questions_total?: number | null;
    max_questions_per_topic?: number | null;
    metadata?: Record<string, unknown>;
    is_active?: boolean;
  }>;
};

function uniqueSeed() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function selectOptionValueByLabelPattern(locator: ReturnType<Page["locator"]>, pattern: RegExp) {
  await expect
    .poll(
      async () =>
        locator.locator("option").evaluateAll(
          (options, source) => {
            const expression = new RegExp(source.pattern, source.flags);
            const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
            return match ? (match as HTMLOptionElement).value : "";
          },
          { pattern: pattern.source, flags: pattern.flags },
        ),
      {
        message: `Expected option matching ${pattern} to become available`,
      },
    )
    .not.toBe("");
  return locator.locator("option").evaluateAll(
    (options, source) => {
      const expression = new RegExp(source.pattern, source.flags);
      const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
      return match ? (match as HTMLOptionElement).value : "";
    },
    { pattern: pattern.source, flags: pattern.flags },
  );
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
      description: "Disposable support-style recovery institute created by Playwright.",
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
        source: "admin-package-scope-recovery-institute-linked.mutable.spec.ts",
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
    // Best-effort cleanup only.
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

test.describe("Admin package-scope recovery from the institute linked lane", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled || !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin package-scope recovery from the institute linked lane",
    ),
  );

  test("@workflow @mutable admin can widen math-only package coverage so institute science recovery becomes visible in linked and linker lanes", async ({
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
    const instituteQuestionBank = new InstituteQuestionBankPage(page);
    const linker = new InstituteSharedLibraryLinkerPage(page);

    await economyPage.goto();

    const seed = uniqueSeed();
    const packageName = `AA PW Scope Recovery ${seed}`;
    const packageCode = `AA-PW-REC-${seed.slice(-6)}`;
    const instituteCode = `PRX${seed.slice(-5)}`;
    const instituteName = `PW Scope Recovery Institute ${seed}`;
    const academicYearLabel = `2041-2042 Recovery ${seed}`;
    let class7ProgramId = "";
    let mathSubjectId = "";
    let scienceSubjectId = "";
    let instituteId: string | null = null;

    try {
      await economyPage.selectPackageInstituteById(scholarPackage!.institute);
      await economyPage.selectPackageType(/subject library/i);
      await economyPage.fillPackageIdentity(
        packageName,
        packageCode,
        "Disposable package created to prove support-style science recovery after admin scope widening.",
      );
      await economyPage.selectAccessMode(/link on demand/i);
      await economyPage.fillSortOrder("1");
      const firstScopeRow = economyPage.scopeRows().first();
      class7ProgramId = await selectOptionValueByLabelPattern(
        firstScopeRow.getByLabel(/program 1/i),
        /class 7/i,
      );
      await economyPage.selectScopeProgram(firstScopeRow, /class 7/i);
      mathSubjectId = await selectOptionValueByLabelPattern(
        firstScopeRow.getByLabel(/subject 1/i),
        /math/i,
      );
      scienceSubjectId = await selectOptionValueByLabelPattern(
        firstScopeRow.getByLabel(/subject 1/i),
        /^science$/i,
      );
      await economyPage.selectScopeSubject(firstScopeRow, /math/i);
      await economyPage.setScopeActive(firstScopeRow);
      await economyPage.createPackage();
      await expect(economyPage.packageCard().getByTestId("package-save-outcome")).toContainText(/math/i);

      const institute = await createInstituteViaApi(page, instituteName, instituteCode);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, academicYearLabel, "2041-04-01", "2042-03-31");
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

      await instituteQuestionBank.gotoLinked();
      await instituteQuestionBank.expectLinkedLoaded();
      await instituteQuestionBank.selectAcademicFilters(/class 7/i, /science/i);
      await instituteQuestionBank.applyFiltersIfPresent();
      await expect(page).toHaveURL(/subject=/);
      await expect(page.getByText(/subject:\s*science/i).first()).toBeVisible();
      await expect(page.getByText(/no linked questions match this selection/i).first()).toBeVisible();
      await expect(
        page.getByText(/next step:\s*open the shared library linker or broaden the academic filters/i).first(),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /open shared library linker for this scope/i })).toBeVisible();
      await expect(
        page.getByText(/current selection:\s*class 7\s*·\s*science\s*·\s*all topics/i).first(),
      ).toBeVisible();

      await linker.gotoForScope(class7ProgramId, scienceSubjectId);
      await expect(page).toHaveURL(
        new RegExp(`/institute/question-bank/library-linker\\?.*program=${class7ProgramId}.*subject=${scienceSubjectId}`),
      );
      await linker.expectLoaded();
      await linker.selectProgram(/class 7/i);
      await linker.selectSubject(/science/i);
      await linker.loadTopics();
      await linker.expectSubjectSummary(/science/i);
      await linker.expectSubjectTotal(/platform source in this subject/i, 0);

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const packageBeforeExpansion = (await fetchAdminQuestionBankPackages(page, adminAccessToken)).find(
        (pkg) => pkg.id === createdPackage!.id,
      );
      expect(packageBeforeExpansion).toBeTruthy();
      const existingMathScope = (packageBeforeExpansion!.scopes ?? []).find(
        (scope) => scope.is_active !== false && scope.subject === mathSubjectId,
      );
      expect(existingMathScope).toBeTruthy();

      const updateResponse = await page.request.patch(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/${createdPackage!.id}/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
            "Content-Type": "application/json",
          },
          data: {
            institute: createdPackage!.institute,
            name: packageName,
            code: packageCode,
            description: "Disposable package created to prove support-style science recovery after admin scope widening.",
            package_type: "subject_library",
            ownership_type: "platform",
            access_mode: "link_on_demand",
            is_public_catalog: true,
            sort_order: 100,
            is_active: true,
            metadata: {
              source: "admin-package-scope-recovery-institute-linked.mutable.spec.ts",
              updated_for: "science-recovery",
            },
            scopes: [
              {
                id: existingMathScope!.id,
                program: existingMathScope!.program ?? class7ProgramId,
                subject: existingMathScope!.subject ?? mathSubjectId,
                topic: existingMathScope!.topic ?? null,
                question_source_type: existingMathScope!.question_source_type ?? "platform_only",
                difficulty_level: existingMathScope!.difficulty_level ?? "",
                question_type: existingMathScope!.question_type ?? "",
                master_visibility: existingMathScope!.master_visibility ?? "",
                max_questions_total: existingMathScope!.max_questions_total ?? null,
                max_questions_per_topic: existingMathScope!.max_questions_per_topic ?? null,
                metadata: existingMathScope!.metadata ?? {},
                is_active: existingMathScope!.is_active ?? true,
              },
              {
                program: class7ProgramId,
                subject: scienceSubjectId,
                topic: null,
                question_source_type: "platform_only",
                difficulty_level: "",
                question_type: "",
                master_visibility: "",
                max_questions_total: null,
                max_questions_per_topic: null,
                metadata: {},
                is_active: true,
              },
            ],
          },
        },
      );
      expect(updateResponse.ok(), await updateResponse.text()).toBe(true);

      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await instituteQuestionBank.gotoLinked();
      await instituteQuestionBank.expectLinkedLoaded();
      await instituteQuestionBank.selectAcademicFilters(/class 7/i, /science/i);
      await instituteQuestionBank.applyFiltersIfPresent();
      await expect(page.getByText(/no linked questions match this selection/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open shared library linker for this scope/i })).toBeVisible();

      await linker.goto();
      await linker.expectLoaded();
      await linker.selectProgram(/class 7/i);
      await linker.selectSubject(/science/i);
      await linker.loadTopics();
      await linker.expectSubjectSummary(/science/i);

      const scienceAfter = await readInlineSummaryCount(page, /available in platform bank/i);
      expect(scienceAfter).toBeGreaterThan(0);
      await expect(page.getByText(/topics with available source questions:\s*[1-9]/i).first()).toBeVisible();

      const firstTopicReviewLink = page.getByRole("link", { name: /review this topic|currently open/i }).first();
      await expect(firstTopicReviewLink).toBeVisible();
      const reviewHref = await firstTopicReviewLink.getAttribute("href");
      expect(reviewHref).toBeTruthy();
      await page.goto(reviewHref!);
      await expect(page).toHaveURL(/\/institute\/question-bank\/library-linker\?.*topic=/);
      await expect(page.getByText(/step 3\. review and link platform source questions/i).first()).toBeVisible();
      await expect(page.getByText(/source question(?:s)? found in/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open linked rows for this topic/i })).toBeVisible();
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });
});
