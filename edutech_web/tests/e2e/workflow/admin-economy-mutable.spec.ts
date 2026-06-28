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
};

type StudentExamDetail = {
  id: string;
  title: string;
  economy_access: {
    policy_type: string | null;
    is_locked: boolean;
    lock_reason_code: string;
    lock_reason_message: string;
  };
};

type SessionProfile = {
  institute?: string | null;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
    ).toBeVisible();

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.locator("select").first();
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
      await page.goto("/admin/economy");
      await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

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
    const entitlementList = (await entitlementListResponse.json()) as Array<{
      id: string;
      status: string;
    }>;
    expect(entitlementList.length).toBeGreaterThan(0);

    const entitlement = entitlementList.find((row) => row.status !== "revoked") ?? entitlementList[0];
    const lifecycleStart = "2026-07-10T09:30";
    const lifecycleEnd = "2026-08-10T18:00";
    const lifecycleNote = `Playwright lifecycle window ${Date.now()}`;

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const row = page.getByTestId(`entitlement-row-${entitlement.id}`);
    await expect(row).toBeVisible();

    await row.getByLabel("Starts at").fill(lifecycleStart);
    await row.getByLabel("Ends at").fill(lifecycleEnd);
    await row.getByLabel("Operator notes").fill(lifecycleNote);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/economy/question-bank-entitlements/${entitlement.id}`) &&
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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const referralCard = economyCard(page, /create and edit referral campaigns and reward posture/i);
    await expect(referralCard).toBeVisible();

    const editableRow = referralCard.locator(".weakTopicRow").first();
    if ((await editableRow.count()) === 0) {
      test.skip(true, "No referral program row is currently available for edit coverage.");
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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();

    const instituteSelect = subscriptionCard.getByLabel(/institute/i).first();
    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );

    let selectedInstituteLabel = "";
    for (const option of instituteOptions) {
      await instituteSelect.selectOption(option.value);
      const packageRows = subscriptionCard.locator(".weakTopicRow").filter({
        has: subscriptionCard.getByText(/included|optional addon|trial/i),
      });
      const packageCount = await subscriptionCard.locator('input[type="checkbox"]').count();
      if (packageCount > 0 && (await subscriptionCard.getByText(/question-bank package access/i).count()) > 0) {
        selectedInstituteLabel = option.label;
        break;
      }
      await packageRows.count(); // keep locator warm
    }

    const packageSection = subscriptionCard.locator(".featurePlaceholder").filter({
      has: subscriptionCard.getByText(/question-bank package access/i),
    }).first();
    const packageCheckboxes = packageSection.locator('input[type="checkbox"]');
    const packageCheckboxCount = await packageCheckboxes.count();
    if (packageCheckboxCount === 0 || !selectedInstituteLabel) {
      test.skip(true, "No attachable question-bank packages are currently available for subscription plan mapping.");
    }

    const uniqueSeed = Date.now();
    const planName = `Playwright Linked Plan ${uniqueSeed}`;
    const planCode = `PW-LINK-${uniqueSeed}`;
    const updatedPlanName = `${planName} Updated`;

    const firstPackageRow = packageSection.locator(".weakTopicRow").first();
    const firstPackageCodeText =
      ((await firstPackageRow.locator("span").nth(0).textContent()) ?? "").trim();
    const firstPackageCode = firstPackageCodeText.split("·")[0]?.trim() ?? "";
    expect(firstPackageCode).not.toBe("");

    await subscriptionCard.getByLabel(/plan name/i).fill(planName);
    await subscriptionCard.getByLabel(/plan code/i).fill(planCode);
    await subscriptionCard.getByLabel(/^description$/i).fill("Playwright plan with package mapping");
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
      .filter({ hasText: /1 question-bank package link/i })
      .filter({ hasText: new RegExp(firstPackageCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
      .first();
    await expect(createdRow).toBeVisible();

    await createdRow.getByRole("button", { name: /edit/i }).click();
    await expect(subscriptionCard.getByRole("button", { name: /update subscription plan/i })).toBeVisible();

    await subscriptionCard.getByLabel(/plan name/i).fill(updatedPlanName);
    await firstPackageRow.locator('input[type="checkbox"]').uncheck();

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/admin\/economy\/subscription-plans\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "PATCH",
    );
    await subscriptionCard.getByRole("button", { name: /update subscription plan/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await expect(subscriptionCard.getByText(/subscription plan updated successfully\./i)).toBeVisible();
    const updatedRow = subscriptionCard
      .locator(".weakTopicRow")
      .filter({ hasText: updatedPlanName })
      .filter({ hasText: /0 question-bank package links/i })
      .filter({ hasText: /no question-bank packages attached yet\./i })
      .first();
    await expect(updatedRow).toBeVisible();
  });

  test("@workflow @mutable admin can create and update a question-bank package from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const packageCard = economyCard(page, /create and edit question-bank packages and scope coverage/i);
    await expect(packageCard).toBeVisible();

    const uniqueSeed = Date.now();
    const packageName = `Playwright Package ${uniqueSeed}`;
    const packageCode = `pw_pkg_${uniqueSeed}`;
    const updatedPackageName = `${packageName} Updated`;

    const instituteSelect = packageCard.getByLabel(/institute/i).first();
    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );

    let selectedInstituteValue = "";
    for (const option of instituteOptions) {
      if (!option.value) continue;
      await instituteSelect.selectOption(option.value);
      const scopedSubjectSelect = packageCard.getByLabel(/subject 1/i);
      const scopedSubjectOptions = await scopedSubjectSelect.locator("option").evaluateAll((options) =>
        options.map((subjectOption) => ({
          value: (subjectOption as HTMLOptionElement).value,
          label: (subjectOption as HTMLOptionElement).label,
        })),
      );
      if (scopedSubjectOptions.some((subjectOption) => subjectOption.value)) {
        selectedInstituteValue = option.value;
        break;
      }
    }
    expect(selectedInstituteValue).toBeTruthy();
    await instituteSelect.selectOption(selectedInstituteValue);

    await packageCard.getByLabel(/package name/i).fill(packageName);
    await packageCard.getByLabel(/package code/i).fill(packageCode);
    await packageCard.getByLabel(/^description$/i).fill("Playwright package coverage");
    await packageCard.getByLabel(/ownership/i).selectOption("institute");

    const subjectSelect = packageCard.getByLabel(/subject 1/i);
    const subjectOptions = await subjectSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );
    const selectableSubject = subjectOptions.find((option) => option.value);
    expect(selectableSubject?.value).toBeTruthy();
    await subjectSelect.selectOption(selectableSubject!.value);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-packages") &&
        response.request().method() === "POST",
    );
    await packageCard.getByRole("button", { name: /create question-bank package/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), await createResponse.text()).toBe(true);

    await expect(packageCard.getByText(/question bank package created successfully\./i)).toBeVisible();
    const createdRow = packageCard
      .locator(".weakTopicRow")
      .filter({ hasText: packageName })
      .filter({ hasText: new RegExp(packageCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
      .first();
    await expect(createdRow).toBeVisible();

    await createdRow.getByRole("button", { name: /edit/i }).click();
    await packageCard.getByLabel(/package name/i).fill(updatedPackageName);
    await packageCard.getByLabel(/access mode/i).selectOption("quota_limited");

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/admin\/economy\/question-bank-packages\/[^/]+$/.test(new URL(response.url()).pathname) &&
        response.request().method() === "PATCH",
    );
    await packageCard.getByRole("button", { name: /update question-bank package/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok()).toBe(true);

    await expect(packageCard.getByText(/question bank package updated successfully\./i)).toBeVisible();
    const updatedRow = packageCard
      .locator(".weakTopicRow")
      .filter({ hasText: updatedPackageName })
      .filter({ hasText: /quota limited/i })
      .first();
    await expect(updatedRow).toBeVisible();
  });

  test("@workflow @mutable admin can apply a linked subscription plan to an institute", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();
    const subscriptionPlanRows = subscriptionCard.locator(".weakTopicStack").last().locator(".weakTopicRow");
    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();

    const existingApplicableRow = subscriptionPlanRows
      .filter({ hasText: /question-bank package link/i })
      .filter({ hasNotText: /0 question-bank package links/i })
      .first();
    if (await existingApplicableRow.count()) {
      const rowText = ((await existingApplicableRow.textContent()) ?? "").replace(/\s+/g, " ").trim();
      const packageCodeMatch = rowText.match(/([A-Z0-9-]+)\s*\((included|optional addon|trial)\)/i);
      const instituteCodeMatch = rowText.match(/·\s*([A-Z0-9-]+)\s*$/i);
      const linkedPackageCode = packageCodeMatch?.[1]?.trim() ?? "";
      const targetInstituteCode = instituteCodeMatch?.[1]?.trim() ?? "";

      const applyResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/economy/subscription-plans/") &&
          response.url().includes("/apply-to-institute") &&
          response.request().method() === "POST",
      );
      await existingApplicableRow.getByRole("button", { name: /apply access/i }).click();
      const applyResponse = await applyResponsePromise;
      expect(applyResponse.ok()).toBe(true);
      const applyBody = (await applyResponse.json()) as {
        data?: {
          entitlement_count?: number;
          target_institute_code?: string;
          question_bank_package_codes?: string[];
        };
      };
      expect(applyBody.data?.entitlement_count ?? 0).toBeGreaterThan(0);
      await expect(subscriptionCard.getByText(/subscription plan question-bank links applied successfully\./i)).toBeVisible();
      await expect(subscriptionCard.getByText(/last apply result/i)).toBeVisible();
      await expect(subscriptionCard.getByText(/materialized entitlements/i)).toBeVisible();
      const expectedInstituteCode = applyBody.data?.target_institute_code ?? targetInstituteCode;
      const expectedPackageCode =
        applyBody.data?.question_bank_package_codes?.[0] ?? linkedPackageCode;
      if (expectedInstituteCode && expectedPackageCode) {
        await expect(
          visibilityCard
            .locator(".weakTopicRow")
            .filter({ hasText: expectedInstituteCode })
            .filter({ hasText: expectedPackageCode })
            .first(),
        ).toBeVisible();
      }
      return;
    }

    const instituteSelect = subscriptionCard.getByLabel(/institute/i).first();
    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );

    let selectedInstituteLabel = "";
    let attachablePackageCount = 0;
    for (const option of instituteOptions) {
      await instituteSelect.selectOption(option.value);
      const packageSection = subscriptionCard.locator(".featurePlaceholder").filter({
        has: subscriptionCard.getByText(/question-bank package access/i),
      }).first();
      const packageCount = await packageSection.locator('input[type="checkbox"]').count();
      if (packageCount > 0) {
        selectedInstituteLabel = option.label;
        attachablePackageCount = packageCount;
        break;
      }
    }

    if (!selectedInstituteLabel || attachablePackageCount === 0) {
      test.skip(true, "No attachable question-bank packages or prelinked subscription plans are available in this environment.");
    }

    const packageSection = subscriptionCard.locator(".featurePlaceholder").filter({
      has: subscriptionCard.getByText(/question-bank package access/i),
    }).first();
    const firstPackageRow = packageSection.locator(".weakTopicRow").first();
    await expect(firstPackageRow).toBeVisible();

    const uniqueSeed = Date.now();
    const planName = `Playwright Apply Plan ${uniqueSeed}`;
    const planCode = `PW-APPLY-${uniqueSeed}`;

    await subscriptionCard.getByLabel(/plan name/i).fill(planName);
    await subscriptionCard.getByLabel(/plan code/i).fill(planCode);
    await subscriptionCard.getByLabel(/^description$/i).fill("Playwright apply-to-institute coverage.");
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
    const expectedPackageCode = applyBody.data?.question_bank_package_codes?.[0] ?? "";
    if (expectedInstituteCode && expectedPackageCode) {
      await expect(
        visibilityCard
          .locator(".weakTopicRow")
          .filter({ hasText: expectedInstituteCode })
          .filter({ hasText: expectedPackageCode })
          .first(),
      ).toBeVisible();
    }
  });

  test("@workflow @mutable admin can pause and reactivate a subscription-backed question-bank entitlement", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();

    const entitlementRows = visibilityCard.locator(".weakTopicRow");
    const activeSubscriptionRow = entitlementRows
      .filter({ hasText: /via subscription/i })
      .filter({ hasText: /active/i })
      .first();
    await expect(activeSubscriptionRow).toBeVisible();

    const pauseResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-entitlements/") &&
        response.request().method() === "PATCH",
    );
    await activeSubscriptionRow.getByRole("button", { name: /pause entitlement/i }).click();
    const pauseResponse = await pauseResponsePromise;
    expect(pauseResponse.ok()).toBe(true);
    await expect(visibilityCard.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    await expect(activeSubscriptionRow).toContainText(/paused via subscription/i);
    await expect(activeSubscriptionRow.getByRole("button", { name: /reactivate entitlement/i })).toBeVisible();

    const reactivateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/question-bank-entitlements/") &&
        response.request().method() === "PATCH",
    );
    await activeSubscriptionRow.getByRole("button", { name: /reactivate entitlement/i }).click();
    const reactivateResponse = await reactivateResponsePromise;
    expect(reactivateResponse.ok()).toBe(true);
    await expect(visibilityCard.getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    await expect(activeSubscriptionRow).toContainText(/active via subscription/i);
    await expect(activeSubscriptionRow.getByRole("button", { name: /pause entitlement/i })).toBeVisible();
  });

  test("@workflow @mutable admin can update lifecycle dates and notes for a question-bank entitlement", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();

    const entitlementRow = visibilityCard
      .locator('[data-testid^="entitlement-row-"]')
      .filter({ hasText: /via subscription/i })
      .first();
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
      await expect(entitlementRow).toContainText(new RegExp(nextNotes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    await expect(visibilityCard).toBeVisible();

    const featureRow = visibilityCard
      .locator(".weakTopicRow")
      .filter({ hasText: /feature:/i })
      .filter({ hasText: /active/i })
      .first();

    if ((await featureRow.count()) === 0) {
      test.skip(true, "No active feature entitlement is currently available for admin lifecycle coverage.");
    }

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
      await expect(stableFeatureRow).toContainText(/paused/i);
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
      await expect(stableFeatureRow).toContainText(/active/i);
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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

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

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const accessCard = economyCard(page, /create and edit premium access policies by content target/i);
    await expect(accessCard).toBeVisible();

    const uniqueSeed = Date.now();
    const contentKey = `pw-access-${uniqueSeed}`;
    const contentLabel = `Playwright Premium Access ${uniqueSeed}`;

    await accessCard.getByLabel(/^content type$/i).fill("exam");
    await accessCard.getByLabel(/^content key$/i).fill(contentKey);
    await accessCard.getByLabel(/^content label$/i).fill(contentLabel);
    await accessCard.getByLabel(/policy type/i).selectOption("stars_only");
    await accessCard.getByLabel(/star cost/i).fill("25");
    await accessCard.getByLabel(/entitlement code/i).fill("PW_PREMIUM");
    await accessCard.getByLabel(/priority/i).fill("45");
    await accessCard.getByLabel(/active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/content-access-policies") &&
        response.request().method() === "POST",
    );
    await accessCard.getByRole("button", { name: /create access policy/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(accessCard.getByText(/content access policy created successfully\./i)).toBeVisible();
    await expect(
      accessCard
        .locator(".weakTopicRow")
        .filter({ hasText: contentLabel })
        .filter({ hasText: /stars only/i })
        .filter({ hasText: /25 stars · PW_PREMIUM · priority 45/i })
        .first(),
    ).toBeVisible();
  });

  test("@workflow @mutable admin can create an unlock rule from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const unlockCard = economyCard(page, /create and edit unlock rules by content target/i);
    await expect(unlockCard).toBeVisible();

    const uniqueSeed = Date.now();
    const contentKey = `pw-unlock-${uniqueSeed}`;
    const contentLabel = `Playwright Unlock ${uniqueSeed}`;

    await unlockCard.getByLabel(/^content type$/i).fill("lesson");
    await unlockCard.getByLabel(/^content key$/i).fill(contentKey);
    await unlockCard.getByLabel(/^content label$/i).fill(contentLabel);
    await unlockCard.getByLabel(/rule type/i).selectOption("stars_balance");
    await unlockCard.getByLabel(/required star balance/i).fill("40");
    await unlockCard.getByLabel(/admin override allowed/i).selectOption("yes");
    await unlockCard.getByLabel(/priority/i).fill("55");
    await unlockCard.getByLabel(/active status/i).selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/unlock-rules") &&
        response.request().method() === "POST",
    );
    await unlockCard.getByRole("button", { name: /create unlock rule/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(unlockCard.getByText(/unlock rule created successfully\./i)).toBeVisible();
    await expect(
      unlockCard
        .locator(".weakTopicRow")
        .filter({ hasText: contentLabel })
        .filter({ hasText: /stars balance/i })
        .filter({ hasText: /40 stars · priority 55/i })
        .first(),
    ).toBeVisible();
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

    const studentAvailableExamsResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/student/exams/available/`,
      {
        headers: {
          Authorization: `Bearer ${studentAccessToken}`,
        },
      },
    );
    expect(studentAvailableExamsResponse.ok()).toBe(true);
    const studentAvailableExams = (await studentAvailableExamsResponse.json()) as StudentAvailableExam[];
    const targetExam = studentAvailableExams.find((exam) => exam.id && exam.title.trim().length > 0) ?? null;

    if (!targetExam) {
      test.skip(true, "Student account does not currently have an available exam to use for unlock refresh coverage.");
    }

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as WalletSummary;

    const grantAmount = 15;
    const requiredStarBalance = walletBefore.available_stars + grantAmount;
    const uniqueSeed = Date.now();
    const contentLabel = `Playwright Unlock Refresh ${uniqueSeed}`;
    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${studentAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const supportCard = supportActionsCard(page);
    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.locator("select").first();
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);

    const createContentAccessResponse = await page.request.post("/api/admin/economy/content-access-policies", {
      data: {
        institute: profile.institute,
        subject: null,
        content_type: "exam",
        content_key: targetExam!.id,
        content_label: contentLabel,
        policy_type: "stars_only",
        star_cost: 1,
        entitlement_code: "",
        priority: 95,
        metadata: {},
        is_active: true,
      },
    });
    expect(createContentAccessResponse.ok()).toBe(true);

    const createUnlockRuleResponse = await page.request.post("/api/admin/economy/unlock-rules", {
      data: {
        institute: profile.institute,
        subject: null,
        content_type: "exam",
        content_key: targetExam!.id,
        content_label: contentLabel,
        rule_type: "stars_balance",
        required_star_balance: requiredStarBalance,
        required_entitlement_code: "",
        required_completion_count: 0,
        required_score_percentage: "0.00",
        admin_override_allowed: true,
        priority: 96,
        metadata: {},
        is_active: true,
      },
    });
    expect(createUnlockRuleResponse.ok()).toBe(true);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    const refreshedStudentAccessToken = await getAccessToken(page);
    expect(refreshedStudentAccessToken).not.toBe("");

    const examDetailResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/student/exams/${targetExam!.id}/detail/`,
      {
        headers: {
          Authorization: `Bearer ${refreshedStudentAccessToken}`,
        },
      },
    );
    expect(examDetailResponse.ok()).toBe(true);
    const examDetail = (await examDetailResponse.json()) as StudentExamDetail;
    expect(examDetail.economy_access.policy_type).toBe("stars_only");
    expect(examDetail.economy_access.is_locked).toBe(true);
    expect(examDetail.economy_access.lock_reason_code).toBe("insufficient_stars");

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    expect(await getAccessToken(page)).toBeTruthy();

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(supportCard).toBeVisible();
    await studentSelect.selectOption(studentId);

    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/student/") &&
        response.url().includes("/refresh-unlocks") &&
        response.request().method() === "POST",
    );
    await supportCard.getByRole("button", { name: /refresh unlocks/i }).click();
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.ok()).toBe(true);

    const refreshCard = unlockRefreshCard(page);
    await expect(refreshCard).toBeVisible();
    const lockedRow = refreshCard.locator(".weakTopicRow").filter({ hasText: contentLabel }).first();
    await expect(lockedRow).toBeVisible();
    await expect(lockedRow.getByText(/locked/i)).toBeVisible();

    await supportCard.getByLabel(/stars to grant/i).fill(String(grantAmount));
    await supportCard.locator('input[placeholder*="Manual adjustment"]').first().fill(
      `Unlock refresh grant ${uniqueSeed}`,
    );
    await supportCard.locator('input[placeholder*="Optional ticket"]').first().fill(
      `PW-UNLOCK-REFRESH-${uniqueSeed}`,
    );

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
    await supportCard.getByRole("button", { name: /refresh unlocks/i }).click();
    const refreshAfterGrantResponse = await refreshAfterGrantResponsePromise;
    expect(refreshAfterGrantResponse.ok()).toBe(true);

    const unlockedRow = refreshCard.locator(".weakTopicRow").filter({ hasText: contentLabel }).first();
    await expect(unlockedRow).toBeVisible();
    await expect(unlockedRow.getByText(/unlocked/i)).toBeVisible();
  });

  test("@workflow @mutable admin can create a subscription plan from economy governance", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    await expect(subscriptionCard).toBeVisible();

    const uniqueSeed = Date.now();
    const planName = `Playwright Subscription ${uniqueSeed}`;
    const planCode = `PW-SUB-${uniqueSeed}`;

    await subscriptionCard.getByLabel(/plan name/i).fill(planName);
    await subscriptionCard.getByLabel(/plan code/i).fill(planCode);
    await subscriptionCard.getByLabel(/^description$/i).fill("Playwright nested subscription governance check.");

    await subscriptionCard.getByLabel(/billing interval/i).first().selectOption("monthly");
    await subscriptionCard.getByLabel(/interval count/i).first().fill("1");
    await subscriptionCard.getByLabel(/price amount/i).first().fill("399.00");
    await subscriptionCard.getByLabel(/^currency$/i).first().fill("INR");
    await subscriptionCard.getByLabel(/cycle status/i).first().selectOption("yes");

    await subscriptionCard.getByLabel(/stars credited/i).first().fill("650");
    await subscriptionCard.getByLabel(/credit on activation/i).first().selectOption("yes");
    await subscriptionCard.getByLabel(/credit on renewal/i).first().selectOption("no");
    await subscriptionCard.getByLabel(/rule status/i).first().selectOption("yes");

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/subscription-plans") &&
        response.request().method() === "POST",
    );
    await subscriptionCard.getByRole("button", { name: /create subscription plan/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);

    await expect(subscriptionCard.getByText(/subscription plan created successfully\./i)).toBeVisible();
    await expect(
      subscriptionCard
        .locator(".weakTopicRow")
        .filter({ hasText: planName })
        .filter({ hasText: planCode })
        .filter({ hasText: /1 cycle · Playwright nested subscription governance check\./i })
        .first(),
    ).toBeVisible();
  });

  test("@workflow @mutable admin can confirm a pending student economy order from the operator queue", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();

    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();

    let createdOrderType: "star_pack" | "subscription" | null = null;

    await page.goto("/app/wallet");
    const requestPackButton = page.getByRole("button", { name: /request pack/i }).first();
    if (await requestPackButton.isVisible().catch(() => false)) {
      createdOrderType = "star_pack";
      await requestPackButton.click();
      await expect(page).toHaveURL(/\/app\/wallet\?message=/);
    } else {
      await page.goto("/app/subscriptions");
      const requestPlanButton = page.getByRole("button", { name: /request plan/i }).first();
      if (await requestPlanButton.isVisible().catch(() => false)) {
        createdOrderType = "subscription";
        await requestPlanButton.click();
        await expect(page).toHaveURL(/\/app\/subscriptions\?message=/);
      }
    }

    if (!createdOrderType) {
      test.skip(true, "Student account does not currently expose a mutable star pack or subscription request.");
    }

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.locator("select").first();
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as WalletSummary;

    const operatorQueuePanel = page.locator(".dashboardPanel").filter({
      has: page.getByRole("heading", { name: /pending order requests for the selected student/i }),
    }).first();
    await expect(operatorQueuePanel).toBeVisible();

    const pendingOrderRow = operatorQueuePanel.locator(".weakTopicRow").filter({
      has: page.getByText(createdOrderType === "subscription" ? /subscription/i : /star pack/i),
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
