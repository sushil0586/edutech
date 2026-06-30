import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type WalletSummary = {
  institute?: string;
  available_stars: number;
  student_name?: string;
};

type ConfirmOrderResponse = {
  data?: {
    payment_order?: {
      id: string;
      status: string;
      order_type: string;
    };
    ledger_entry?: {
      stars_delta: number;
    } | null;
    student_subscription?: {
      status: string;
    } | null;
  };
  message?: string;
};

type EconomyPolicyConfig = {
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_confirm_order_currency: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
  latest_audit?: {
    message?: string;
  } | null;
};

type EconomyPolicyConfigResponse = {
  data?: EconomyPolicyConfig;
  message?: string;
};

type AdminQuestionBankEntitlement = {
  id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  notes: string;
  granted_via?: string;
};

type AdminQuestionBankFeatureEntitlement = {
  id: string;
  status: string;
  feature_code?: string;
  institute_code?: string;
};

type StudentAvailableExam = {
  id: string;
  title: string;
  code: string;
  exam_type?: string;
  can_resume?: boolean;
  can_start?: boolean;
  availability_state?: string;
};

type SessionProfile = {
  institute?: string | null;
};

type MutableAccessPolicy = {
  id: string;
  institute: string;
  content_type: string;
  content_key: string;
  content_label: string;
  policy_type: string;
  star_cost: number;
  entitlement_code: string;
  priority: number;
  subject: string | null;
  is_active: boolean;
};

type MutableUnlockRule = {
  id: string;
  institute: string;
  content_type: string;
  content_key: string;
  content_label: string;
  rule_type: string;
  required_star_balance: number | null;
  required_entitlement_code: string;
  required_completion_count: number | null;
  required_score_percentage: string | null;
  admin_override_allowed: boolean;
  priority: number;
  subject: string | null;
  is_active: boolean;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function listSelectOptions(selectLocator: ReturnType<Page["locator"]>) {
  return selectLocator.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      value: (option as HTMLOptionElement).value,
      label: (option as HTMLOptionElement).label,
    })),
  );
}

async function createQuestionBankPackageDirectly(
  page: Page,
  accessToken: string,
  {
    instituteId,
    packageName,
    packageCode,
  }: {
    instituteId: string;
    packageName: string;
    packageCode: string;
  },
) {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: instituteId,
      name: packageName,
      code: packageCode,
      description: "Playwright auto-provisioned package for mutable admin economy coverage.",
      package_type: "subject_library",
      ownership_type: "institute",
      access_mode: "link_on_demand",
      is_public_catalog: true,
      sort_order: 25,
      metadata: {
        source: "playwright-admin-economy-mutable",
      },
      is_active: true,
      scopes: [
        {
          program: "",
          subject: "",
          topic: "",
          question_source_type: "platform_only",
          difficulty_level: "",
          question_type: "",
          master_visibility: "",
          max_questions_total: null,
          max_questions_per_topic: null,
          metadata: {
            source: "playwright-admin-economy-mutable",
          },
          is_active: true,
        },
      ],
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    data?: {
      id?: string;
      code?: string;
      name?: string;
    };
  };
}

type CreatedStarPackResponse = {
  data?: {
    id: string;
    institute: string;
    name: string;
    code: string;
    stars_credited: number;
    price_amount: string;
    currency: string;
  };
  message?: string;
};

function economyCard(page: Page, heading: RegExp) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: heading }),
  }).first();
}

function supportActionsCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
  }).first();
}

function unlockRefreshCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /current unlock states after recalculation/i,
    }),
  }).first();
}

function economyPolicyCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: /institute-admin support limits/i }),
  }).first();
}

type AdminEconomyTab =
  | "overview"
  | "catalog"
  | "access-control"
  | "question-bank"
  | "support-ops"
  | "bootstrap";

type AdminEconomyFocus =
  | "all"
  | "policy"
  | "usage"
  | "boundary"
  | "governance"
  | "star-packs"
  | "referrals"
  | "rewards"
  | "policies"
  | "unlocks"
  | "settings"
  | "packages"
  | "visibility"
  | "plans"
  | "requests"
  | "student-support";

function adminEconomyHref(
  tab: AdminEconomyTab,
  focus: AdminEconomyFocus = "all",
  instituteId = "",
) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (focus !== "all") {
    query.set("focus", focus);
  }
  if (instituteId) {
    query.set("institute", instituteId);
  }
  return `/admin/economy?${query.toString()}`;
}

async function gotoAdminEconomyLane(
  page: Page,
  tab: AdminEconomyTab,
  focus: AdminEconomyFocus = "all",
  instituteId = "",
) {
  await page.goto(adminEconomyHref(tab, focus, instituteId));
  await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
}

test.describe("Admin mutable economy actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin economy star grant coverage",
    ),
  );

  test("@workflow @mutable admin can grant stars and observe wallet growth for an in-scope student", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "support-ops", "student-support");
    await expect(
      page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
    ).toBeVisible();

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.getByLabel(/^student$/i);
    await expect(studentSelect).toBeVisible();
    const studentId = await studentSelect.inputValue();
    expect(studentId).toBeTruthy();

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as WalletSummary;

    const grantAmount = 5;
    const uniqueSeed = Date.now();
    const grantReason = `Playwright mutable economy grant ${uniqueSeed}`;
    const grantReference = `PW-ECO-${uniqueSeed}`;

    const starsInput = supportCard.getByLabel(/stars to grant/i);
    const reasonInput = supportCard.locator('input[placeholder*="Manual adjustment"]').first();
    const referenceInput = supportCard.locator('input[placeholder*="Optional ticket"]').first();

    await starsInput.fill(String(grantAmount));
    await reasonInput.fill(grantReason);
    await referenceInput.fill(grantReference);

    const grantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/grant-stars") &&
        response.request().method() === "POST",
    );
    await supportCard.getByRole("button", { name: /grant stars/i }).click();
    const grantResponse = await grantResponsePromise;
    expect(grantResponse.ok()).toBe(true);

    await expect(page.getByText(/stars granted successfully\./i)).toBeVisible();

    await expect
      .poll(
        async () => {
          const walletAfterResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
          expect(walletAfterResponse.ok()).toBe(true);
          const walletAfter = (await walletAfterResponse.json()) as WalletSummary;
          return walletAfter.available_stars;
        },
        { timeout: 20000 },
      )
      .toBe(walletBefore.available_stars + grantAmount);

    await expect(reasonInput).toHaveValue("");
    await expect(referenceInput).toHaveValue("");
  });

  test("@workflow @mutable admin can update platform economy support policy from admin economy", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const currentPolicyResponse = await page.request.get("/api/admin/economy/policy-config");
    expect(currentPolicyResponse.ok()).toBe(true);
    const currentPolicy = (await currentPolicyResponse.json()) as EconomyPolicyConfig;

    const nextPolicy = {
      institute_admin_can_grant_stars: !currentPolicy.institute_admin_can_grant_stars,
      institute_admin_max_grant_stars: Math.max(
        1,
        currentPolicy.institute_admin_max_grant_stars +
          (currentPolicy.institute_admin_max_grant_stars >= 999 ? -5 : 5),
      ),
      institute_admin_can_confirm_orders: !currentPolicy.institute_admin_can_confirm_orders,
      institute_admin_max_confirm_order_amount: (
        Number(currentPolicy.institute_admin_max_confirm_order_amount) + 111.11
      ).toFixed(2),
    };

    try {
      await gotoAdminEconomyLane(page, "access-control", "settings");

      const policyCard = economyPolicyCard(page);
      await expect(policyCard).toBeVisible();

      await policyCard
        .getByLabel(/institute admin can grant stars/i)
        .selectOption(nextPolicy.institute_admin_can_grant_stars ? "yes" : "no");
      await policyCard
        .getByLabel(/max stars per grant/i)
        .fill(String(nextPolicy.institute_admin_max_grant_stars));
      await policyCard
        .getByLabel(/institute admin can confirm orders/i)
        .selectOption(nextPolicy.institute_admin_can_confirm_orders ? "yes" : "no");
      await policyCard
        .getByLabel(/max order amount/i)
        .fill(nextPolicy.institute_admin_max_confirm_order_amount);

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/economy/policy-config") &&
          response.request().method() === "PATCH",
      );

      await policyCard.getByRole("button", { name: /save economy policy/i }).click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.ok()).toBe(true);

      const updateBody = (await updateResponse.json()) as EconomyPolicyConfigResponse;
      expect(updateBody.data?.institute_admin_can_grant_stars).toBe(
        nextPolicy.institute_admin_can_grant_stars,
      );
      expect(updateBody.data?.institute_admin_max_grant_stars).toBe(
        nextPolicy.institute_admin_max_grant_stars,
      );
      expect(updateBody.data?.institute_admin_can_confirm_orders).toBe(
        nextPolicy.institute_admin_can_confirm_orders,
      );
      expect(updateBody.data?.institute_admin_max_confirm_order_amount).toBe(
        nextPolicy.institute_admin_max_confirm_order_amount,
      );

      await expect(policyCard.getByText(/economy operator policy updated successfully\./i)).toBeVisible();
      await expect(policyCard.getByText(/last updated by/i)).toBeVisible();
      await expect(policyCard.getByText(/changed: /i).first()).toBeVisible();

      const persistedPolicyResponse = await page.request.get("/api/admin/economy/policy-config");
      expect(persistedPolicyResponse.ok()).toBe(true);
      const persistedPolicy = (await persistedPolicyResponse.json()) as EconomyPolicyConfig;
      expect(persistedPolicy.institute_admin_can_grant_stars).toBe(
        nextPolicy.institute_admin_can_grant_stars,
      );
      expect(persistedPolicy.institute_admin_max_grant_stars).toBe(
        nextPolicy.institute_admin_max_grant_stars,
      );
      expect(persistedPolicy.institute_admin_can_confirm_orders).toBe(
        nextPolicy.institute_admin_can_confirm_orders,
      );
      expect(persistedPolicy.institute_admin_max_confirm_order_amount).toBe(
        nextPolicy.institute_admin_max_confirm_order_amount,
      );
    } finally {
      const restoreResponse = await page.request.patch("/api/admin/economy/policy-config", {
        data: {
          institute_admin_can_grant_stars: currentPolicy.institute_admin_can_grant_stars,
          institute_admin_max_grant_stars: currentPolicy.institute_admin_max_grant_stars,
          institute_admin_can_confirm_orders: currentPolicy.institute_admin_can_confirm_orders,
          institute_admin_max_confirm_order_amount:
            currentPolicy.institute_admin_max_confirm_order_amount,
        },
      });
      expect(restoreResponse.ok()).toBe(true);
    }
  });

  test("@workflow @mutable admin can update institute entitlement lifecycle window from admin economy", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const lifecycleStart = "2026-07-10T09:30";
    const lifecycleEnd = "2026-08-10T18:00";
    const lifecycleNote = `Playwright lifecycle window ${Date.now()}`;

    await gotoAdminEconomyLane(page, "question-bank", "visibility");

    const row = page.locator('[data-testid^="entitlement-row-"]').first();
    await expect(row).toBeVisible();
    const rowTestId = (await row.getAttribute("data-testid")) ?? "";
    const entitlementId = rowTestId.replace("entitlement-row-", "").trim();
    expect(entitlementId).toBeTruthy();

    await row.getByLabel("Starts at").fill(lifecycleStart);
    await row.getByLabel("Ends at").fill(lifecycleEnd);
    await row.getByLabel("Operator notes").fill(lifecycleNote);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/economy/question-bank-entitlements/${entitlementId}`) &&
        response.request().method() === "PATCH",
    );

    await row.getByRole("button", { name: /save lifecycle/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await expect(page.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    await expect(row.getByText(new RegExp(lifecycleNote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))).toBeVisible();
    await expect(row.getByText(/10 Jul 2026|Jul 10, 2026|10 Jul 26/i).first()).toBeVisible();
  });

  test("@workflow @mutable admin can create and update a star pack from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "catalog", "star-packs");

    const starPackCard = economyCard(page, /create and edit live wallet pack offers/i);
    await expect(starPackCard).toBeVisible();

    const uniqueSeed = Date.now();
    const createdName = `Playwright Pack ${uniqueSeed}`;
    const updatedName = `${createdName} Updated`;
    const createdCode = `PW-PACK-${uniqueSeed}`;

    await starPackCard.getByLabel(/pack name/i).fill(createdName);
    await starPackCard.getByLabel(/pack code/i).fill(createdCode);
    await starPackCard.getByLabel(/stars credited/i).fill("145");
    await starPackCard.getByLabel(/price amount/i).fill("149.00");
    await starPackCard.getByLabel(/currency/i).fill("INR");
    await starPackCard.getByLabel(/sort order/i).fill("7");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/star-packs") &&
        response.request().method() === "POST",
    );
    await starPackCard.getByRole("button", { name: /create star pack/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(starPackCard.getByText(/star pack created successfully\./i)).toBeVisible();
    const createdRow = starPackCard
      .locator(".weakTopicRow")
      .filter({ hasText: createdName })
      .filter({ hasText: createdCode })
      .first();
    await expect(createdRow).toBeVisible();

    await createdRow.getByRole("button", { name: /edit/i }).click();
    await expect(starPackCard.getByRole("button", { name: /update star pack/i })).toBeVisible();

    await starPackCard.getByLabel(/pack name/i).fill(updatedName);
    await starPackCard.getByLabel(/stars credited/i).fill("160");
    await starPackCard.getByLabel(/active status/i).selectOption("no");

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/admin\/economy\/star-packs\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "PATCH",
    );
    await starPackCard.getByRole("button", { name: /update star pack/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await expect(starPackCard.getByText(/star pack updated successfully\./i)).toBeVisible();
    const updatedRow = starPackCard
      .locator(".weakTopicRow")
      .filter({ hasText: updatedName })
      .filter({ hasText: /160 stars/i })
      .filter({ hasText: /paused/i })
      .first();
    await expect(updatedRow).toBeVisible();
  });

  test("@workflow @mutable admin can create a referral program from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "catalog", "referrals");

    const referralCard = economyCard(page, /create and edit referral campaigns and reward posture/i);
    await expect(referralCard).toBeVisible();

    const uniqueSeed = Date.now();
    const programName = `Playwright Referral ${uniqueSeed}`;

    await referralCard.getByLabel(/program name/i).fill(programName);
    await referralCard.getByLabel(/reward side/i).selectOption("referrer");
    await referralCard.getByLabel(/referrer stars/i).fill("80");
    await referralCard.getByLabel(/referee stars/i).fill("0");
    await referralCard.getByLabel(/active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/referral-programs") &&
        response.request().method() === "POST",
    );
    await referralCard.getByRole("button", { name: /create referral program/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(referralCard.getByText(/referral program created successfully\./i)).toBeVisible();
    await expect(
      referralCard
        .locator(".weakTopicRow")
        .filter({ hasText: programName })
        .first(),
    ).toBeVisible();
  });

  test("@workflow @mutable admin can update a referral program from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "catalog", "referrals");

    const referralCard = economyCard(page, /create and edit referral campaigns and reward posture/i);
    await expect(referralCard).toBeVisible();

    let editableRow = referralCard.locator(".weakTopicRow").first();
    if ((await editableRow.count()) === 0) {
      const instituteSelect = referralCard.getByLabel(/^institute$/i);
      const instituteId = await instituteSelect.inputValue();
      expect(instituteId).not.toBe("");

      const bootstrapResponse = await page.request.post("/api/admin/economy/referral-programs", {
        data: {
          institute: instituteId,
          name: `Playwright Referral Bootstrap ${Date.now()}`,
          referrer_stars: 40,
          referee_stars: 25,
          reward_side: "both",
          valid_from: "2026-06-01T00:00:00Z",
          valid_until: "2026-12-31T00:00:00Z",
          metadata: {
            source: "playwright-bootstrap",
          },
          is_active: true,
        },
      });
      expect(bootstrapResponse.ok(), await bootstrapResponse.text()).toBe(true);

      await page.reload();
      await expectAdminWorkspace(page);
      await gotoAdminEconomyLane(page, "catalog", "referrals");
      await expect(referralCard).toBeVisible();
      editableRow = referralCard.locator(".weakTopicRow").first();
      await expect(editableRow).toBeVisible();
    }

    const originalText = ((await editableRow.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const originalRewardSide = /referrer only/i.test(originalText)
      ? "referrer"
      : /referee only/i.test(originalText)
        ? "referee"
        : "both";
    const originalStatusActive = /paused/i.test(originalText) ? false : true;
    const nextRewardSide = originalRewardSide === "both" ? "referrer" : "both";
    const nextReferrerStars = "61";
    const nextRefereeStars = nextRewardSide === "referrer" ? "0" : "17";

    await editableRow.getByRole("button", { name: /edit/i }).click();
    await expect(referralCard.getByRole("button", { name: /update referral program/i })).toBeVisible();

    const editedName = `Playwright Referral Updated ${Date.now()}`;
    await referralCard.getByLabel(/program name/i).fill(editedName);
    await referralCard.getByLabel(/reward side/i).selectOption(nextRewardSide);
    await referralCard.getByLabel(/referrer stars/i).fill(nextReferrerStars);
    await referralCard.getByLabel(/referee stars/i).fill(nextRefereeStars);
    await referralCard.getByLabel(/active status/i).selectOption(originalStatusActive ? "no" : "yes");

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/admin\/economy\/referral-programs\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "PATCH",
    );
    await referralCard.getByRole("button", { name: /update referral program/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await expect(referralCard.getByText(/referral program updated successfully\./i)).toBeVisible();
    await expect(
      referralCard
        .locator(".weakTopicRow")
        .filter({ hasText: editedName })
        .filter({ hasText: /61/ })
        .first(),
    ).toBeVisible();
  });

  test("@workflow @mutable admin can attach and detach a question-bank package on a subscription plan", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "question-bank", "plans");

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();
    await subscriptionCard
      .getByRole("combobox", { name: /subscription plan workspace view/i })
      .selectOption("all");
    const subscriptionEditor = subscriptionCard.locator(".economySubscriptionEditorPanel").first();

    const instituteSelect = subscriptionEditor.locator(".economySubscriptionPlanGridPrimary select").first();
    const instituteOptions = await listSelectOptions(instituteSelect);

    const bootstrapInstitute =
      instituteOptions.find((option) => option.value && !/inactive/i.test(option.label)) ??
      instituteOptions.find((option) => option.value) ??
      null;
    if (!bootstrapInstitute) {
      test.skip(true, "No attachable question-bank packages are currently available for subscription plan mapping.");
    }
    let selectedInstituteLabel = bootstrapInstitute.label;
    await instituteSelect.selectOption(bootstrapInstitute.value);
    await page.waitForTimeout(200);

    const packageSection = subscriptionEditor.locator(".economyFormSection").nth(1);
    const packageCheckboxes = packageSection.locator('input[type="checkbox"]');
    let packageCheckboxCount = await packageCheckboxes.count();
    if (packageCheckboxCount === 0) {
      const adminAccessToken = await getAccessToken(page);
      expect(adminAccessToken).not.toBe("");
      await createQuestionBankPackageDirectly(page, adminAccessToken, {
        instituteId: bootstrapInstitute.value,
        packageName: `Playwright Linked Package ${Date.now()}`,
        packageCode: `pw_link_pkg_${Date.now()}`,
      });

      await page.reload();
      await expectAdminWorkspace(page);
      await gotoAdminEconomyLane(page, "question-bank", "plans");
      await expect(subscriptionCard).toBeVisible();
      await subscriptionCard
        .getByRole("combobox", { name: /subscription plan workspace view/i })
        .selectOption("all");
      await instituteSelect.selectOption(bootstrapInstitute.value);
      await page.waitForTimeout(200);
      packageCheckboxCount = await packageSection.locator('input[type="checkbox"]').count();
    }
    expect(packageCheckboxCount).toBeGreaterThan(0);

    const uniqueSeed = Date.now();
    const planName = `A0 Playwright Linked Plan ${uniqueSeed}`;
    const planCode = `PW-LINK-${uniqueSeed}`;
    const updatedPlanName = `${planName} Updated`;

    const firstPackageRow = packageSection.locator(".weakTopicRow").first();
    const firstPackageCodeText =
      ((await firstPackageRow.locator("span").nth(0).textContent()) ?? "").trim();
    const firstPackageCode = firstPackageCodeText.split("·")[0]?.trim() ?? "";
    expect(firstPackageCode).not.toBe("");

    await subscriptionEditor.getByLabel(/plan name/i).fill(planName);
    await subscriptionEditor.getByLabel(/plan code/i).fill(planCode);
    await subscriptionEditor.getByLabel(/^description$/i).fill("Playwright plan with package mapping");
    await firstPackageRow.locator('input[type="checkbox"]').check();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/subscription-plans") &&
        response.request().method() === "POST",
    );
    await subscriptionCard.getByRole("button", { name: /create subscription plan/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createBody = (await createResponse.json()) as {
      data?: {
        id?: string;
        institute?: string;
        code?: string;
        name?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        is_active?: boolean;
        cycles?: Array<{
          id?: string;
          billing_interval: string;
          interval_count: number;
          price_amount: string;
          currency: string;
          metadata?: Record<string, unknown>;
          is_active: boolean;
          star_credit_rules: Array<{
            id?: string;
            stars_credited: number;
            credit_on_activation: boolean;
            credit_on_renewal: boolean;
            metadata?: Record<string, unknown>;
            is_active: boolean;
          }>;
        }>;
        question_bank_package_links?: Array<unknown>;
      };
    };
    const createdPlanId = createBody.data?.id ?? "";
    expect(createdPlanId).toBeTruthy();
    expect(createBody.data?.code).toBe(planCode);
    expect(createBody.data?.question_bank_package_links ?? []).toHaveLength(1);

    await expect(subscriptionCard.getByText(/subscription plan created successfully\./i)).toBeVisible();
    await expect(subscriptionCard.getByRole("button", { name: /create subscription plan/i })).toBeVisible();
    await expect(subscriptionEditor.getByLabel(/plan name/i)).toHaveValue("");

    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const persistedPlan = createBody.data ?? null;
    expect(persistedPlan).toBeTruthy();
    expect(persistedPlan?.name).toBe(planName);
    expect(persistedPlan?.code).toBe(planCode);
    expect(persistedPlan?.question_bank_package_links ?? []).toHaveLength(1);

    const updateResponse = await page.request.patch(
      `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${createdPlanId}/`,
      {
        data: {
          institute: persistedPlan!.institute,
          name: updatedPlanName,
          code: persistedPlan!.code,
          description: persistedPlan!.description,
          metadata: persistedPlan!.metadata ?? {},
          is_active: persistedPlan!.is_active,
          cycles: persistedPlan!.cycles.map((cycle) => ({
            ...(cycle.id ? { id: cycle.id } : {}),
            billing_interval: cycle.billing_interval,
            interval_count: Number(cycle.interval_count),
            price_amount: cycle.price_amount,
            currency: cycle.currency,
            metadata: cycle.metadata ?? {},
            is_active: cycle.is_active,
            star_credit_rules: cycle.star_credit_rules.map((rule) => ({
              ...(rule.id ? { id: rule.id } : {}),
              stars_credited: Number(rule.stars_credited),
              credit_on_activation: rule.credit_on_activation,
              credit_on_renewal: rule.credit_on_renewal,
              metadata: rule.metadata ?? {},
              is_active: rule.is_active,
            })),
          })),
          question_bank_package_links: [],
        },
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    expect(updateResponse.ok()).toBe(true);
    const updateBody = (await updateResponse.json()) as {
      data?: {
        name?: string;
        question_bank_package_links?: Array<unknown>;
      };
    };
    expect(updateBody.data?.name).toBe(updatedPlanName);
    expect(updateBody.data?.question_bank_package_links ?? []).toHaveLength(0);
  });

  test("@workflow @mutable admin can create and update a question-bank package from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "question-bank", "packages");

    const packageCard = economyCard(page, /create and edit question-bank packages and scope coverage/i);
    await expect(packageCard).toBeVisible();

    const uniqueSeed = Date.now();
    const packageName = `Playwright Package ${uniqueSeed}`;
    const packageCode = `pw_pkg_${uniqueSeed}`;
    const updatedPackageName = `${packageName} Updated`;
    const packageEditor = packageCard.locator(".economyPackageEditorPanel").first();

    const instituteSelect = packageEditor.locator(".economyPackageFormGridPrimary select").first();
    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );

    const selectedInstituteValue =
      instituteOptions.find((option) => option.value && option.value !== "all")?.value ?? "";
    if (!selectedInstituteValue) {
      test.skip(true, "No concrete institute option is available for question-bank package creation.");
    }
    await instituteSelect.selectOption(selectedInstituteValue);

    await packageEditor.locator(".economyPackageFormGridPrimary input").nth(0).fill(packageName);
    await packageEditor.locator(".economyPackageFormGridPrimary input").nth(1).fill(packageCode);
    await packageEditor.locator(".economyPackageDescriptionField textarea").fill("Playwright package coverage");
    await packageEditor.locator(".economyPackageFormGridSecondary select").nth(0).selectOption("institute");

    const subjectSelect = packageEditor.locator(".economyPackageScopeGrid select").nth(1);
    const subjectOptions = await subjectSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );
    const selectableSubject = subjectOptions.find((option) => option.value);
    if (selectableSubject?.value) {
      await subjectSelect.selectOption(selectableSubject.value);
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-packages") &&
        response.request().method() === "POST",
    );
    await packageCard.getByRole("button", { name: /create question-bank package/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), await createResponse.text()).toBe(true);
    const createBody = (await createResponse.json()) as {
      data?: {
        id: string;
        name: string;
        code: string;
      };
    };
    const createdPackageId = createBody.data?.id ?? "";
    expect(createdPackageId).toBeTruthy();

    await expect(packageCard.getByText(/question bank package created successfully\./i)).toBeVisible();

    const updatePackageResponse = await page.request.patch(
      `/api/admin/economy/question-bank-packages/${createdPackageId}`,
      {
        data: {
          institute: selectedInstituteValue,
          name: updatedPackageName,
          code: packageCode,
          description: "Playwright package coverage",
          package_type: "subject_library",
          ownership_type: "institute",
          access_mode: "quota_limited",
          is_public_catalog: true,
          sort_order: 100,
          is_active: true,
          scopes: [
            {
              program: "",
              subject: selectableSubject?.value ?? "",
              topic: "",
              question_source_type: "platform_only",
              difficulty_level: "",
              question_type: "",
              master_visibility: "",
              max_questions_total: null,
              max_questions_per_topic: null,
              is_active: true,
            },
          ],
        },
      },
    );
    expect(updatePackageResponse.ok(), await updatePackageResponse.text()).toBe(true);

    const updatedPackagePayload = (await updatePackageResponse.json()) as {
      data?: {
        name?: string;
        access_mode?: string;
      };
    };
    expect(updatedPackagePayload.data?.name).toBe(updatedPackageName);
    expect(updatedPackagePayload.data?.access_mode).toBe("quota_limited");
  });

  test("@workflow @mutable admin can apply a linked subscription plan to an institute", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "question-bank", "all");

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();
    await subscriptionCard
      .getByRole("combobox", { name: /subscription plan workspace view/i })
      .selectOption("all");
    const subscriptionEditor = subscriptionCard.locator(".economySubscriptionEditorPanel").first();
    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();

    const instituteSelect = subscriptionEditor.locator(".economySubscriptionPlanGridPrimary select").first();
    const instituteOptions = await listSelectOptions(instituteSelect);
    const bootstrapInstitute =
      instituteOptions.find((option) => option.value && !/inactive/i.test(option.label)) ??
      instituteOptions.find((option) => option.value) ??
      null;
    if (!bootstrapInstitute) {
      test.skip(true, "No attachable question-bank packages or prelinked subscription plans are available in this environment.");
    }
    let selectedInstituteLabel = bootstrapInstitute.label;
    await instituteSelect.selectOption(bootstrapInstitute.value);
    await page.waitForTimeout(200);
    const packageSection = subscriptionEditor.locator(".economyFormSection").nth(1);
    let attachablePackageCount = await packageSection.locator('input[type="checkbox"]').count();

    if (attachablePackageCount === 0) {
      const adminAccessToken = await getAccessToken(page);
      expect(adminAccessToken).not.toBe("");
      await createQuestionBankPackageDirectly(page, adminAccessToken, {
        instituteId: bootstrapInstitute.value,
        packageName: `Playwright Apply Package ${Date.now()}`,
        packageCode: `pw_apply_pkg_${Date.now()}`,
      });

      await page.reload();
      await expectAdminWorkspace(page);
      await gotoAdminEconomyLane(page, "question-bank", "all");
      await expect(subscriptionCard).toBeVisible();
      await subscriptionCard
        .getByRole("combobox", { name: /subscription plan workspace view/i })
        .selectOption("all");
      await instituteSelect.selectOption(bootstrapInstitute.value);
      await page.waitForTimeout(200);
      attachablePackageCount = await packageSection.locator('input[type="checkbox"]').count();
    }
    expect(attachablePackageCount).toBeGreaterThan(0);
    const firstPackageRow = packageSection.locator(".weakTopicRow").first();
    await expect(firstPackageRow).toBeVisible();

    const uniqueSeed = Date.now();
    const planName = `A0 Playwright Apply Plan ${uniqueSeed}`;
    const planCode = `PW-APPLY-${uniqueSeed}`;

    await subscriptionEditor.getByLabel(/plan name/i).fill(planName);
    await subscriptionEditor.getByLabel(/plan code/i).fill(planCode);
    await subscriptionEditor.getByLabel(/^description$/i).fill("Playwright apply-to-institute coverage.");
    await firstPackageRow.locator('input[type="checkbox"]').check();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/subscription-plans") &&
        response.request().method() === "POST",
    );
    await subscriptionCard.getByRole("button", { name: /create subscription plan/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(subscriptionCard.getByText(/subscription plan created successfully\./i)).toBeVisible();
    const createdRow = subscriptionCard
      .locator(".weakTopicRow")
      .filter({ hasText: planName })
      .filter({ hasText: planCode })
      .first();
    await expect(createdRow).toBeVisible();

    const rowInstituteSelect = createdRow.getByLabel(new RegExp(`apply ${planName} to institute`, "i"));
    await rowInstituteSelect.selectOption({ label: selectedInstituteLabel });

    const applyResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/subscription-plans/") &&
        response.url().includes("/apply-to-institute") &&
        response.request().method() === "POST",
    );
    await createdRow.getByRole("button", { name: /apply access/i }).click();
    const applyResponse = await applyResponsePromise;
    expect(applyResponse.ok()).toBe(true);
    const applyBody = (await applyResponse.json()) as {
      data?: {
        entitlement_count?: number;
        target_institute_code?: string;
        question_bank_package_codes?: string[];
      };
      message?: string;
    };
    expect(applyBody.data?.entitlement_count ?? 0).toBeGreaterThan(0);
    await expect(subscriptionCard.getByText(/subscription plan question-bank links applied successfully\./i)).toBeVisible();
    await expect(subscriptionCard.getByText(/last apply result/i)).toBeVisible();
    await expect(subscriptionCard.getByText(/materialized entitlements/i)).toBeVisible();
    const expectedInstituteCode = applyBody.data?.target_institute_code ?? "";
    const expectedPackageCodes = applyBody.data?.question_bank_package_codes ?? [];
    if (expectedInstituteCode && expectedPackageCodes.length > 0) {
      const adminAccessToken = await getAccessToken(page);
      expect(adminAccessToken).not.toBe("");
      const entitlementListResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        },
      );
      expect(entitlementListResponse.ok()).toBe(true);
      const entitlementRows = (await entitlementListResponse.json()) as Array<{
        institute_code?: string;
        question_bank_package_code?: string;
        status?: string;
        granted_via?: string;
      }>;
      const matchedEntitlement = entitlementRows.find(
        (row) =>
          row.institute_code === expectedInstituteCode &&
          expectedPackageCodes.includes(row.question_bank_package_code ?? "") &&
          row.status === "active",
      );
      expect(matchedEntitlement).toBeTruthy();
    }
  });

  test("@workflow @mutable admin can pause and reactivate a subscription-backed question-bank entitlement", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const entitlementListResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementListResponse.ok()).toBe(true);
    const entitlementRows = (await entitlementListResponse.json()) as AdminQuestionBankEntitlement[];
    const targetSubscriptionEntitlement = entitlementRows.find(
      (row) => row.granted_via === "subscription" && row.status === "active",
    );
    if (!targetSubscriptionEntitlement) {
      test.skip(true, "No active subscription-backed question-bank entitlement exists in this environment.");
    }

    await gotoAdminEconomyLane(page, "question-bank", "visibility");

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();
    await visibilityCard.getByRole("combobox", { name: /rows to show/i }).selectOption("50");
    await visibilityCard.getByRole("combobox", { name: /granted via/i }).selectOption("subscription");

    const activeSubscriptionRow = visibilityCard.getByTestId(
      `entitlement-row-${targetSubscriptionEntitlement.id}`,
    );
    await expect(activeSubscriptionRow).toBeVisible();
    await expect(
      activeSubscriptionRow.getByRole("button", { name: /pause entitlement/i }),
    ).toBeEnabled();
    const activeSubscriptionRowTestId = await activeSubscriptionRow.getAttribute("data-testid");
    expect(activeSubscriptionRowTestId).toBeTruthy();
    const stableSubscriptionRow = page.getByTestId(activeSubscriptionRowTestId!);

    const pauseResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-entitlements/") &&
        response.request().method() === "PATCH",
    );
    await activeSubscriptionRow.getByRole("button", { name: /pause entitlement/i }).click();
    const pauseResponse = await pauseResponsePromise;
    expect(pauseResponse.ok()).toBe(true);
    await expect(visibilityCard.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    await expect(stableSubscriptionRow).toContainText(/status:\s*paused/i);
    await expect(stableSubscriptionRow).toContainText(/via subscription/i);
    await expect(stableSubscriptionRow.getByRole("button", { name: /reactivate entitlement/i })).toBeVisible();

    const reactivateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-entitlements/") &&
        response.request().method() === "PATCH",
    );
    await stableSubscriptionRow.getByRole("button", { name: /reactivate entitlement/i }).click();
    const reactivateResponse = await reactivateResponsePromise;
    expect(reactivateResponse.ok()).toBe(true);
    await expect(visibilityCard.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    await expect(stableSubscriptionRow).toContainText(/status:\s*active/i);
    await expect(stableSubscriptionRow).toContainText(/via subscription/i);
    await expect(stableSubscriptionRow.getByRole("button", { name: /pause entitlement/i })).toBeVisible();
  });

  test("@workflow @mutable admin can update lifecycle dates and notes for a question-bank entitlement", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const entitlementListResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementListResponse.ok()).toBe(true);
    const entitlementRows = (await entitlementListResponse.json()) as AdminQuestionBankEntitlement[];
    const targetSubscriptionEntitlement = entitlementRows.find(
      (row) => row.granted_via === "subscription" && row.status === "active",
    );
    if (!targetSubscriptionEntitlement) {
      test.skip(true, "No active subscription-backed question-bank entitlement exists in this environment.");
    }

    await gotoAdminEconomyLane(page, "question-bank", "visibility");

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();
    await visibilityCard.getByRole("combobox", { name: /rows to show/i }).selectOption("50");
    await visibilityCard.getByRole("combobox", { name: /granted via/i }).selectOption("subscription");

    const entitlementRow = visibilityCard.getByTestId(
      `entitlement-row-${targetSubscriptionEntitlement.id}`,
    );
    await expect(entitlementRow).toBeVisible();

    const rowTestId = (await entitlementRow.getAttribute("data-testid")) ?? "";
    const entitlementId = rowTestId.replace("entitlement-row-", "").trim();
    expect(entitlementId).toBeTruthy();
    const currentStartsAt = await entitlementRow.getByLabel(/starts at/i).inputValue();
    const currentEndsAt = await entitlementRow.getByLabel(/ends at/i).inputValue();
    const currentNotes = await entitlementRow.getByLabel(/operator notes/i).inputValue();
    const currentStatusText = ((await entitlementRow.textContent()) ?? "").toLowerCase();
    const currentStatus = currentStatusText.includes("paused")
      ? "paused"
      : currentStatusText.includes("revoked")
        ? "revoked"
        : "active";

    const uniqueSeed = Date.now();
    const nextNotes = `Playwright lifecycle note ${uniqueSeed}`;
    const nextEndsAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    const nextEndsAtLocal = (() => {
      const timezoneOffsetMs = nextEndsAt.getTimezoneOffset() * 60 * 1000;
      return new Date(nextEndsAt.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
    })();

    try {
      await entitlementRow.getByLabel(/ends at/i).fill(nextEndsAtLocal);
      await entitlementRow.getByLabel(/operator notes/i).fill(nextNotes);

      const saveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/economy/question-bank-entitlements/${entitlementId}`) &&
          response.request().method() === "PATCH",
      );
      await entitlementRow.getByRole("button", { name: /save lifecycle/i }).click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBe(true);

      await expect(visibilityCard.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
      await expect(
        entitlementRow.getByLabel(/operator notes/i),
      ).toHaveValue(nextNotes);

      const entitlementAfterResponse = await page.request.get(
        `/api/admin/economy/question-bank-entitlements/${entitlementId}`,
      );
      if (entitlementAfterResponse.ok()) {
        const entitlementAfter = (await entitlementAfterResponse.json()) as {
          data?: AdminQuestionBankEntitlement;
        };
        expect(entitlementAfter.data?.notes).toBe(nextNotes);
        expect(entitlementAfter.data?.ends_at).not.toBeNull();
      }
    } finally {
      await page.request.patch(`/api/admin/economy/question-bank-entitlements/${entitlementId}`, {
        data: {
          status: currentStatus,
          starts_at: currentStartsAt ? new Date(currentStartsAt).toISOString() : null,
          ends_at: currentEndsAt ? new Date(currentEndsAt).toISOString() : null,
          notes: currentNotes,
        },
      });
    }
  });

  test("@workflow @mutable admin can pause and reactivate a feature entitlement from question-bank visibility", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const featureListResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-feature-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(featureListResponse.ok()).toBe(true);
    const featureRows = (await featureListResponse.json()) as AdminQuestionBankFeatureEntitlement[];
    const targetFeatureEntitlement =
      featureRows.find((row) => row.status === "active") ??
      featureRows.find((row) => row.status === "paused");
    if (!targetFeatureEntitlement) {
      test.skip(true, "No feature entitlement row exists in this environment.");
    }
    if (targetFeatureEntitlement.status !== "active") {
      const activateResponse = await page.request.patch(
        `/api/admin/economy/question-bank-feature-entitlements/${targetFeatureEntitlement.id}`,
        {
          data: {
            status: "active",
          },
        },
      );
      expect(activateResponse.ok(), await activateResponse.text()).toBe(true);
    }

    await gotoAdminEconomyLane(page, "question-bank", "visibility");

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();
    await visibilityCard.getByRole("combobox", { name: /show dataset/i }).selectOption("features");
    await visibilityCard.getByRole("combobox", { name: /rows to show/i }).selectOption("50");
    await visibilityCard.getByRole("combobox", { name: /feature status/i }).selectOption("all");

    const featureRow = visibilityCard
      .locator(".weakTopicRow")
      .filter({
        hasText: new RegExp(targetFeatureEntitlement.feature_code.replaceAll("_", " "), "i"),
      })
      .first();
    await expect(featureRow).toBeVisible();

    const pauseResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-feature-entitlements/") &&
        response.request().method() === "PATCH",
    );
    await featureRow.getByRole("button", { name: /pause feature/i }).click();
    const pauseResponse = await pauseResponsePromise;
    expect(pauseResponse.ok()).toBe(true);
    const pauseBody = (await pauseResponse.json()) as {
      data?: AdminQuestionBankFeatureEntitlement;
    };
    const featureEntitlementId = pauseBody.data?.id ?? "";
    expect(featureEntitlementId).not.toBe("");
    const featureCodeMatch =
      pauseBody.data?.feature_code ??
      ((((await featureRow.textContent()) ?? "").match(/Feature:\s*([A-Za-z0-9_ -]+)/i) ?? [])[1] ?? "");
    const instituteCodeMatch =
      pauseBody.data?.institute_code ??
      ((((await featureRow.textContent()) ?? "").match(/\b([A-Z0-9-]{3,})\b\s*$/m) ?? [])[1] ?? "");
    expect(featureCodeMatch).not.toBe("");
    const featureRowLocator = visibilityCard.locator(".weakTopicRow").filter({
      hasText: featureCodeMatch.replace(/_/g, " ").replace(/\s+/g, " ").trim(),
    }).first();
    const stableFeatureRow =
      instituteCodeMatch
        ? visibilityCard
            .locator(".weakTopicRow")
            .filter({ hasText: instituteCodeMatch })
            .filter({
              hasText: featureCodeMatch.replace(/_/g, " ").replace(/\s+/g, " ").trim(),
            })
            .first()
        : featureRowLocator;

    try {
      await expect(visibilityCard.getByText(/question bank feature entitlement updated successfully\./i)).toBeVisible();
      await expect(stableFeatureRow).toContainText(/status:\s*paused/i);
      await expect(stableFeatureRow.getByRole("button", { name: /reactivate feature/i })).toBeVisible();

      const reactivateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/economy/question-bank-feature-entitlements/${featureEntitlementId}`) &&
          response.request().method() === "PATCH",
      );
      await stableFeatureRow.getByRole("button", { name: /reactivate feature/i }).click();
      const reactivateResponse = await reactivateResponsePromise;
      expect(reactivateResponse.ok()).toBe(true);

      await expect(visibilityCard.getByText(/question bank feature entitlement updated successfully\./i)).toBeVisible();
      await expect(stableFeatureRow).toContainText(/status:\s*active/i);
      await expect(stableFeatureRow.getByRole("button", { name: /pause feature/i })).toBeVisible();
    } finally {
      await page.request.patch(`/api/admin/economy/question-bank-feature-entitlements/${featureEntitlementId}`, {
        data: {
          status: "active",
        },
      });
    }
  });

  test("@workflow @mutable admin can create a reward rule from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "catalog", "rewards");

    const rewardCard = economyCard(page, /create and edit reward rules for signup, completion, and score ladders/i);
    await expect(rewardCard).toBeVisible();

    const uniqueSeed = Date.now();
    const ruleName = `Playwright Reward Rule ${uniqueSeed}`;

    await rewardCard.getByLabel(/rule name/i).fill(ruleName);
    await rewardCard.getByLabel(/rule type/i).selectOption("score_threshold");
    await rewardCard.getByLabel(/stars awarded/i).fill("120");
    await rewardCard.getByLabel(/priority/i).fill("35");
    await rewardCard.getByLabel(/score threshold %/i).fill("78");
    await rewardCard.getByLabel(/active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/reward-rules") &&
        response.request().method() === "POST",
    );
    await rewardCard.getByRole("button", { name: /create reward rule/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(rewardCard.getByText(/reward rule created successfully\./i)).toBeVisible();
    await expect(
      rewardCard
        .locator(".weakTopicRow")
        .filter({ hasText: ruleName })
        .filter({ hasText: /score threshold/i })
        .filter({ hasText: /120 stars/i })
        .filter({ hasText: /priority 35/i })
        .first(),
    ).toBeVisible();
  });

  test("@workflow @mutable admin can create a content access policy from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "access-control", "policies");

    const accessCard = economyCard(page, /create and edit premium access policies by content target/i);
    await expect(accessCard).toBeVisible();

    const uniqueSeed = Date.now();
    const contentKey = `pw-access-${uniqueSeed}`;
    const contentLabel = `Playwright Premium Access ${uniqueSeed}`;
    const accessEditor = accessCard.locator(".economySubscriptionEditorPanel").first();

    await accessEditor.getByLabel(/policy content type/i).fill("exam");
    await accessEditor.getByLabel(/policy content key/i).fill(contentKey);
    await accessEditor.getByLabel(/policy content label/i).fill(contentLabel);
    await accessEditor.getByLabel(/policy type editor/i).selectOption("stars_only");
    await accessEditor.getByLabel(/policy star cost/i).fill("25");
    await accessEditor.getByLabel(/policy entitlement code/i).fill("PW_PREMIUM");
    await accessEditor.getByLabel(/policy priority/i).fill("45");
    await accessEditor.getByLabel(/policy active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/content-access-policies") &&
        response.request().method() === "POST",
    );
    await accessCard.getByRole("button", { name: /create access policy/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createAccessBody = (await createResponse.json()) as {
      data?: {
        content_key?: string;
        content_label?: string;
        policy_type?: string;
        star_cost?: number;
        entitlement_code?: string;
        priority?: number;
      };
    };
    expect(createAccessBody.data?.content_key).toBe(contentKey);
    expect(createAccessBody.data?.content_label).toBe(contentLabel);
    expect(createAccessBody.data?.policy_type).toBe("stars_only");
    expect(createAccessBody.data?.star_cost).toBe(25);
    expect(createAccessBody.data?.entitlement_code).toBe("PW_PREMIUM");
    expect(createAccessBody.data?.priority).toBe(45);

    await expect(accessCard.getByText(/content access policy created successfully\./i)).toBeVisible();
  });

  test("@workflow @mutable admin can create an unlock rule from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "access-control", "unlocks");

    const unlockCard = economyCard(page, /create and edit unlock rules by content target/i);
    await expect(unlockCard).toBeVisible();

    const uniqueSeed = Date.now();
    const contentKey = `pw-unlock-${uniqueSeed}`;
    const contentLabel = `Playwright Unlock ${uniqueSeed}`;
    const unlockEditor = unlockCard.locator(".economySubscriptionEditorPanel").first();

    await unlockEditor.getByLabel(/unlock content type/i).fill("lesson");
    await unlockEditor.getByLabel(/unlock content key/i).fill(contentKey);
    await unlockEditor.getByLabel(/unlock content label/i).fill(contentLabel);
    await unlockEditor.getByLabel(/unlock rule type editor/i).selectOption("stars_balance");
    await unlockEditor.getByLabel(/unlock required star balance/i).fill("40");
    await unlockEditor.getByLabel(/unlock admin override allowed/i).selectOption("yes");
    await unlockEditor.getByLabel(/unlock priority/i).fill("55");
    await unlockEditor.getByLabel(/unlock active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/unlock-rules") &&
        response.request().method() === "POST",
    );
    await unlockCard.getByRole("button", { name: /create unlock rule/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createUnlockBody = (await createResponse.json()) as {
      data?: {
        content_key?: string;
        content_label?: string;
        rule_type?: string;
        required_star_balance?: number;
        priority?: number;
        admin_override_allowed?: boolean;
      };
    };
    expect(createUnlockBody.data?.content_key).toBe(contentKey);
    expect(createUnlockBody.data?.content_label).toBe(contentLabel);
    expect(createUnlockBody.data?.rule_type).toBe("stars_balance");
    expect(createUnlockBody.data?.required_star_balance).toBe(40);
    expect(createUnlockBody.data?.priority).toBe(55);
    expect(createUnlockBody.data?.admin_override_allowed).toBe(true);

    await expect(unlockCard.getByText(/unlock rule created successfully\./i)).toBeVisible();
  });

  test("@workflow @mutable admin refresh unlocks can flip a student exam unlock state after wallet change", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    const studentAccessToken = await getAccessToken(page);
    expect(studentAccessToken).not.toBe("");

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();

    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();
    const instituteCard = page.locator(".detailCard").filter({
      has: page.getByText(/^institute$/i),
    }).first();
    await expect(instituteCard).toBeVisible();

    const availableExamsResponse = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
      headers: {
        Authorization: `Bearer ${studentAccessToken}`,
      },
    });
    expect(availableExamsResponse.ok(), await availableExamsResponse.text()).toBe(true);
    const availableExams = (await availableExamsResponse.json()) as StudentAvailableExam[];
    const visibleMockExams = availableExams.filter((exam) => exam.exam_type !== "practice");
    const targetExam =
      visibleMockExams.find((exam) => exam.can_resume) ??
      visibleMockExams.find((exam) => exam.can_start) ??
      visibleMockExams.find((exam) => exam.availability_state === "upcoming") ??
      visibleMockExams[0] ??
      null;
    const targetExamId = targetExam?.id ?? "";
    if (!targetExamId) {
      test.skip(true, "Student account does not currently have an available exam to use for unlock refresh coverage.");
    }

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as WalletSummary;
    const studentInstituteId = walletBefore.institute ?? "";
    expect(studentInstituteId).toBeTruthy();

    const grantAmount = 15;
    const requiredStarBalance = walletBefore.available_stars + grantAmount;
    const uniqueSeed = Date.now();
    const contentLabel = `Playwright Unlock Refresh ${uniqueSeed}`;

    await gotoAdminEconomyLane(page, "access-control", "policies");
    const accessCard = economyCard(page, /create and edit premium access policies by content target/i);
    await expect(accessCard).toBeVisible();

    const supportCard = supportActionsCard(page);
    await gotoAdminEconomyLane(page, "support-ops", "student-support");
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.getByLabel(/^student$/i);
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);
    await expect(supportCard.getByRole("button", { name: /refresh unlocks/i })).toBeEnabled();
    const accessPoliciesResponse = await page.request.get("/api/admin/economy/content-access-policies");
    expect(accessPoliciesResponse.ok()).toBe(true);
    const accessPolicies = (await accessPoliciesResponse.json()) as MutableAccessPolicy[];
    const existingAccessPolicy =
      accessPolicies.find(
        (policy) =>
          policy.institute === studentInstituteId &&
          policy.content_type === "exam" &&
          policy.content_key === targetExamId,
      ) ?? null;

    const unlockRulesResponse = await page.request.get("/api/admin/economy/unlock-rules");
    expect(unlockRulesResponse.ok()).toBe(true);
    const unlockRules = (await unlockRulesResponse.json()) as MutableUnlockRule[];
    const existingUnlockRule =
      unlockRules.find(
        (rule) =>
          rule.institute === studentInstituteId &&
          rule.content_type === "exam" &&
          rule.content_key === targetExamId,
      ) ?? null;

    let createdAccessPolicyId = "";
    let createdUnlockRuleId = "";

    if (existingAccessPolicy) {
      const updateAccessPolicyResponse = await page.request.patch(
        `/api/admin/economy/content-access-policies/${existingAccessPolicy.id}`,
        {
          data: {
            institute: existingAccessPolicy.institute,
            subject: existingAccessPolicy.subject,
            content_type: existingAccessPolicy.content_type,
            content_key: existingAccessPolicy.content_key,
            content_label: contentLabel,
            policy_type: "stars_only",
            star_cost: 1,
            entitlement_code: "",
            priority: 1,
            metadata: {},
            is_active: true,
          },
        },
      );
      expect(updateAccessPolicyResponse.ok(), await updateAccessPolicyResponse.text()).toBe(true);
    } else {
      const createContentAccessResponse = await page.request.post("/api/admin/economy/content-access-policies", {
        data: {
          institute: studentInstituteId,
          subject: null,
          content_type: "exam",
          content_key: targetExamId,
          content_label: contentLabel,
          policy_type: "stars_only",
          star_cost: 1,
          entitlement_code: "",
          priority: 1,
          metadata: {},
          is_active: true,
        },
      });
      expect(createContentAccessResponse.ok(), await createContentAccessResponse.text()).toBe(true);
      const createdAccessPolicyBody = (await createContentAccessResponse.json()) as {
        data?: MutableAccessPolicy;
      };
      createdAccessPolicyId = createdAccessPolicyBody.data?.id ?? "";
    }

    if (existingUnlockRule) {
      const updateUnlockRuleResponse = await page.request.patch(
        `/api/admin/economy/unlock-rules/${existingUnlockRule.id}`,
        {
          data: {
            institute: existingUnlockRule.institute,
            subject: existingUnlockRule.subject,
            content_type: existingUnlockRule.content_type,
            content_key: existingUnlockRule.content_key,
            content_label: contentLabel,
            rule_type: "stars_balance",
            required_star_balance: requiredStarBalance,
            required_entitlement_code: "",
            required_completion_count: 0,
            required_score_percentage: "0.00",
            admin_override_allowed: true,
            priority: 1,
            metadata: {},
            is_active: true,
          },
        },
      );
      expect(updateUnlockRuleResponse.ok(), await updateUnlockRuleResponse.text()).toBe(true);
    } else {
      const createUnlockRuleResponse = await page.request.post("/api/admin/economy/unlock-rules", {
        data: {
          institute: studentInstituteId,
          subject: null,
          content_type: "exam",
          content_key: targetExamId,
          content_label: contentLabel,
          rule_type: "stars_balance",
          required_star_balance: requiredStarBalance,
          required_entitlement_code: "",
          required_completion_count: 0,
          required_score_percentage: "0.00",
          admin_override_allowed: true,
          priority: 1,
          metadata: {},
          is_active: true,
        },
      });
      expect(createUnlockRuleResponse.ok(), await createUnlockRuleResponse.text()).toBe(true);
      const createdUnlockRuleBody = (await createUnlockRuleResponse.json()) as {
        data?: MutableUnlockRule;
      };
      createdUnlockRuleId = createdUnlockRuleBody.data?.id ?? "";
    }

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await page.goto("/app/exams");
    await expect(page.getByRole("heading", { name: /tests|exams/i }).first()).toBeVisible();
    await page.goto(`/app/exams/${targetExamId}`);
    await expect(page.getByRole("heading").first()).toBeVisible();

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    expect(await getAccessToken(page)).toBeTruthy();

    await gotoAdminEconomyLane(page, "support-ops", "student-support");
    await expect(supportCard).toBeVisible();
    await studentSelect.selectOption(studentId);
    await expect(supportCard.getByRole("button", { name: /refresh unlocks/i })).toBeEnabled();

    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/student/") &&
        response.url().includes("/refresh-unlocks") &&
        response.request().method() === "POST",
    );
    await supportCard.getByRole("button", { name: /refresh unlocks/i }).click();
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.ok()).toBe(true);
    const refreshBody = (await refreshResponse.json()) as {
      data?: StudentUnlockState[];
    };
    const refreshedStates = Array.isArray(refreshBody.data) ? refreshBody.data : [];
    const initialUnlockState = refreshedStates.find((state) => state.content_key === targetExamId);
    if (!initialUnlockState) {
      test.skip(
        true,
        "Refresh unlock response did not return a materialized unlock-state row for the selected exam.",
      );
    }

    const refreshCard = unlockRefreshCard(page);
    await expect(refreshCard).toBeVisible();
    const lockedRow = refreshCard
      .locator(".weakTopicRow")
      .filter({ hasText: initialUnlockState.content_label })
      .first();
    await expect(lockedRow).toBeVisible();
    await expect(lockedRow.getByText(/locked/i)).toBeVisible();

    await supportCard.getByLabel(/stars to grant/i).fill(String(grantAmount));
    await supportCard.getByLabel(/^reason$/i).fill(
      `Unlock refresh grant ${uniqueSeed}`,
    );
    await supportCard.getByLabel(/^reference$/i).fill(
      `PW-UNLOCK-REFRESH-${uniqueSeed}`,
    );
    await expect(supportCard.getByRole("button", { name: /^grant stars$/i })).toBeEnabled();

    const grantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/grant-stars") &&
        response.request().method() === "POST",
    );
    await supportCard.getByRole("button", { name: /^grant stars$/i }).click();
    const grantResponse = await grantResponsePromise;
    expect(grantResponse.ok()).toBe(true);
    await expect(page.getByText(/stars granted successfully\./i)).toBeVisible();

    const refreshAfterGrantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/student/") &&
        response.url().includes("/refresh-unlocks") &&
        response.request().method() === "POST",
    );
    await expect(supportCard.getByRole("button", { name: /refresh unlocks/i })).toBeEnabled();
    await supportCard.getByRole("button", { name: /refresh unlocks/i }).click();
    const refreshAfterGrantResponse = await refreshAfterGrantResponsePromise;
    expect(refreshAfterGrantResponse.ok()).toBe(true);
    const refreshAfterGrantBody = (await refreshAfterGrantResponse.json()) as {
      data?: StudentUnlockState[];
    };
    const refreshedStatesAfterGrant = Array.isArray(refreshAfterGrantBody.data)
      ? refreshAfterGrantBody.data
      : [];
    const unlockedState = refreshedStatesAfterGrant.find((state) => state.content_key === targetExamId);
    if (!unlockedState) {
      test.skip(
        true,
        "Refresh unlock response after wallet grant did not return a materialized unlock-state row for the selected exam.",
      );
    }

    const unlockedRow = refreshCard
      .locator(".weakTopicRow")
      .filter({ hasText: unlockedState.content_label })
      .first();
    await expect(unlockedRow).toBeVisible();
    await expect(unlockedRow.getByText(/unlocked/i)).toBeVisible();

    if (createdAccessPolicyId) {
      await page.request.patch(`/api/admin/economy/content-access-policies/${createdAccessPolicyId}`, {
        data: { is_active: false },
      });
    }
    if (createdUnlockRuleId) {
      await page.request.patch(`/api/admin/economy/unlock-rules/${createdUnlockRuleId}`, {
        data: { is_active: false },
      });
    }
  });

  test("@workflow @mutable admin can create a subscription plan from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAdminEconomyLane(page, "question-bank", "plans");

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();

    const uniqueSeed = Date.now();
    const planName = `Playwright Subscription ${uniqueSeed}`;
    const planCode = `PW-SUB-${uniqueSeed}`;
    const subscriptionEditor = subscriptionCard.locator(".economySubscriptionEditorPanel").first();

    await subscriptionEditor.getByLabel(/plan name/i).fill(planName);
    await subscriptionEditor.getByLabel(/plan code/i).fill(planCode);
    await subscriptionEditor.getByLabel(/^description$/i).fill("Playwright nested subscription governance check.");

    await subscriptionEditor.getByLabel(/billing interval/i).first().selectOption("monthly");
    await subscriptionEditor.getByLabel(/interval count/i).first().fill("1");
    await subscriptionEditor.getByLabel(/price amount/i).first().fill("399.00");
    await subscriptionEditor.getByLabel(/^currency$/i).first().fill("INR");
    await subscriptionEditor.getByLabel(/cycle status/i).first().selectOption("yes");

    await subscriptionEditor.getByLabel(/stars credited/i).first().fill("650");
    await subscriptionEditor.getByLabel(/credit on activation/i).first().selectOption("yes");
    await subscriptionEditor.getByLabel(/credit on renewal/i).first().selectOption("no");
    await subscriptionEditor.getByLabel(/rule status/i).first().selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/subscription-plans") &&
        response.request().method() === "POST",
    );
    await subscriptionCard.getByRole("button", { name: /create subscription plan/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createdPlan = await createResponse.json();
    expect(createdPlan).toMatchObject({
      success: true,
      message: "Subscription plan created successfully.",
      data: {
        name: planName,
        code: planCode,
        description: "Playwright nested subscription governance check.",
        is_active: true,
      },
    });

    await expect(subscriptionCard.getByText(/subscription plan created successfully\./i)).toBeVisible();
  });

  test("@workflow @mutable admin can confirm a pending student economy order from the operator queue", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    const studentAccessToken = await getAccessToken(page);
    expect(studentAccessToken).not.toBe("");
    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();

    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as WalletSummary;
    const studentInstituteId = walletBefore.institute ?? "";
    expect(studentInstituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const starPackCreateResponse = await page.request.post("/api/admin/economy/star-packs/", {
      data: {
        institute: studentInstituteId,
        name: `Playwright Confirm Pack ${uniqueSeed}`,
        code: `PW-CNF-PACK-${uniqueSeed}`,
        stars_credited: 125,
        price_amount: "149.00",
        currency: "INR",
        sort_order: 10,
        metadata: {
          source: "playwright-admin-economy-mutable",
        },
        is_active: true,
      },
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
      },
    });
    expect(starPackCreateResponse.ok(), await starPackCreateResponse.text()).toBe(true);
    const createdStarPack = (await starPackCreateResponse.json()) as CreatedStarPackResponse;
    const createdStarPackId = createdStarPack.data?.id ?? "";
    expect(createdStarPackId).toBeTruthy();

    const createOrderResponse = await page.request.post(`${backendBaseUrl}/api/v1/economy/orders/star-pack/`, {
      data: {
        star_pack: createdStarPackId,
        provider_name: "playwright",
        provider_order_reference: `PW-ORDER-${uniqueSeed}`,
        metadata: {
          source: "playwright-admin-economy-mutable",
        },
      },
      headers: {
        Authorization: `Bearer ${studentAccessToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(createOrderResponse.ok(), await createOrderResponse.text()).toBe(true);

    await gotoAdminEconomyLane(page, "support-ops", "student-support");

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.getByLabel(/^student$/i);
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);
    await supportCard.getByLabel(/institute economy workspace view/i).selectOption("orders");

    const operatorQueuePanel = page.locator(".dashboardPanel").filter({
      has: page.getByRole("heading", { name: /pending order requests for the selected student/i }),
    }).first();
    await expect(operatorQueuePanel).toBeVisible();

    const pendingOrderRow = operatorQueuePanel.locator(".weakTopicRow").filter({
      has: page.getByText(/star pack/i),
      hasNot: page.getByText(/completed/i),
    }).first();
    await expect(pendingOrderRow).toBeVisible();

    const confirmResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/orders/") &&
        response.url().includes("/confirm") &&
        response.request().method() === "POST",
    );

    await pendingOrderRow.getByRole("button", { name: /confirm order/i }).click();
    const confirmResponse = await confirmResponsePromise;
    expect(confirmResponse.ok()).toBe(true);

    const confirmBody = (await confirmResponse.json()) as ConfirmOrderResponse;
    expect(confirmBody.data?.payment_order?.status).toBe("completed");
    await expect(page.getByText(/payment order completed successfully|payment order was already completed/i)).toBeVisible();

    const walletAfterResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletAfterResponse.ok()).toBe(true);
    const walletAfter = (await walletAfterResponse.json()) as WalletSummary;

    if (confirmBody.data?.ledger_entry && confirmBody.data.ledger_entry.stars_delta > 0) {
      expect(walletAfter.available_stars).toBe(walletBefore.available_stars + confirmBody.data.ledger_entry.stars_delta);
    } else {
      expect(confirmBody.data?.student_subscription?.status).toBe("active");
    }
  });
});
