import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);

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

function economyCard(page: Parameters<typeof test>[0]["page"], heading: RegExp) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: heading }),
  }).first();
}

function supportActionsCard(page: Parameters<typeof test>[0]["page"]) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
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
    const createdRow = starPackCard.locator(".weakTopicRow").filter({
      has: page.getByText(createdName),
      has: page.getByText(createdCode),
    }).first();
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
    const updatedRow = starPackCard.locator(".weakTopicRow").filter({
      has: page.getByText(updatedName),
      has: page.getByText(/160 stars/i),
      has: page.getByText(/paused/i),
    }).first();
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
      referralCard.locator(".weakTopicRow").filter({
        has: page.getByText(programName),
        has: page.getByText(/referrer only/i),
        has: page.getByText(/referrer 80 · referee 0/i),
      }).first(),
    ).toBeVisible();
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
      rewardCard.locator(".weakTopicRow").filter({
        has: page.getByText(ruleName),
        has: page.getByText(/score threshold/i),
        has: page.getByText(/120 stars/i),
        has: page.getByText(/priority 35/i),
      }).first(),
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
      accessCard.locator(".weakTopicRow").filter({
        has: page.getByText(contentLabel),
        has: page.getByText(/stars only/i),
        has: page.getByText(/25 stars · PW_PREMIUM · priority 45/i),
      }).first(),
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
      unlockCard.locator(".weakTopicRow").filter({
        has: page.getByText(contentLabel),
        has: page.getByText(/stars balance/i),
        has: page.getByText(/40 stars · priority 55/i),
      }).first(),
    ).toBeVisible();
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
      subscriptionCard.locator(".weakTopicRow").filter({
        has: page.getByText(planName),
        has: page.getByText(planCode),
        has: page.getByText(/1 cycle · Playwright nested subscription governance check\./i),
      }).first(),
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
