import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableStudentEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ECONOMY_ACTIONS",
);

function supportActionsCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
  }).first();
}

test.describe("Student mutable economy actions", () => {
  test.skip(
    testRequiresRole("student"),
    "Student Playwright credentials are not configured.",
  );

  test.skip(
    !mutableStudentEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ECONOMY_ACTIONS",
      "student economy request coverage",
    ),
  );

  test("@workflow @mutable student can create truthful wallet and subscription requests without optimistic credit", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    let exercisedPackRequest = false;
    let exercisedPlanRequest = false;

    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/instant settlement/i).first()).toBeVisible();
    const walletBefore = await readMetricCardNumber(page, /available stars/i);

    const requestPackButton = page.getByRole("button", { name: /request pack/i }).first();
    if (await requestPackButton.isVisible().catch(() => false)) {
      exercisedPackRequest = true;
      await requestPackButton.click();
      await expect(page).toHaveURL(/\/app\/wallet\?message=/);
      await expect(
        page.getByText(/order created\. it will stay pending until confirmed/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/order lifecycle detail/i).first()).toBeVisible();
      await expect(
        page.getByText(/understand whether a request is only created, already processed, or fully credited/i).first(),
      ).toBeVisible();
      await expectAnyVisible(page, [
        /request created/i,
        /pending/i,
        /processed/i,
        /credited/i,
      ]);
      await expect(
        page.locator(".contentCard").filter({
          has: page.getByText(/order lifecycle detail/i),
        }).getByText(/wallet credit/i).first(),
      ).toBeVisible();
      await expect(
        page.locator(".contentCard").filter({
          has: page.getByText(/order lifecycle detail/i),
        }).getByText(/pending|recorded/i).first(),
      ).toBeVisible();
      expect(await readMetricCardNumber(page, /available stars/i)).toBe(walletBefore);
      await expect(
        page.getByText(/does not promise instant settlement/i).first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/star packs will appear here once your institute configures them/i).first(),
      ).toBeVisible();
    }

    await page.goto("/app/subscriptions");
    await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
    await expect(page.getByText(/what this page can and cannot do/i).first()).toBeVisible();
    await expect(page.getByText(/immediate activation/i).first()).toBeVisible();

    const requestPlanButton = page.getByRole("button", { name: /request plan/i }).first();
    if (await requestPlanButton.isVisible().catch(() => false)) {
      exercisedPlanRequest = true;
      const walletBeforePlanRequest = await readMetricCardNumber(page, /available stars/i);
      await requestPlanButton.click();
      await expect(page).toHaveURL(/\/app\/subscriptions\?message=/);
      await expect(
        page.getByText(/order created\. it will remain pending until confirmed through the operator settlement flow/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/subscription orders/i).first()).toBeVisible();
      await expect(
        page.getByText(/whether your chosen plan is still only requested, already processed, or fully linked to wallet credit activity/i).first(),
      ).toBeVisible();
      await expectAnyVisible(page, [
        /pending credit/i,
        /linked to credit/i,
        /request stage/i,
        /awaiting processing/i,
      ]);
      await expect(
        page.getByText(/does not promise instant subscription activation or instant wallet credit/i).first(),
      ).toBeVisible();
      expect(await readMetricCardNumber(page, /available stars/i)).toBe(walletBeforePlanRequest);
    } else {
      await expect(
        page.getByText(/subscription plans will appear here once your institute configures them/i).first(),
      ).toBeVisible();
    }

    if (!exercisedPackRequest && !exercisedPlanRequest) {
      test.skip(true, "Student account does not currently expose mutable star pack or subscription request options.");
    }
  });

  test("@workflow @mutable student sees settled wallet or subscription state after admin confirms the request", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();

    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();

    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    const walletBefore = await readMetricCardNumber(page, /available stars/i);

    let createdOrderType: "star_pack" | "subscription" | null = null;

    const requestPackButton = page.getByRole("button", { name: /request pack/i }).first();
    if (await requestPackButton.isVisible().catch(() => false)) {
      createdOrderType = "star_pack";
      await requestPackButton.click();
      await expect(page).toHaveURL(/\/app\/wallet\?message=/);
      await expect(page.getByText(/order created\. it will stay pending until confirmed/i).first()).toBeVisible();
    } else {
      await page.goto("/app/subscriptions");
      await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
      const requestPlanButton = page.getByRole("button", { name: /request plan/i }).first();
      if (await requestPlanButton.isVisible().catch(() => false)) {
        createdOrderType = "subscription";
        await requestPlanButton.click();
        await expect(page).toHaveURL(/\/app\/subscriptions\?message=/);
        await expect(
          page.getByText(/order created\. it will remain pending until confirmed through the operator settlement flow/i).first(),
        ).toBeVisible();
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
    await expect(page.getByText(/payment order completed successfully|payment order was already completed/i)).toBeVisible();

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    if (createdOrderType === "star_pack") {
      await page.goto("/app/wallet");
      await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
      await expect
        .poll(async () => {
          return readMetricCardNumber(page, /available stars/i);
        }, { timeout: 20000 })
        .toBeGreaterThan(walletBefore);
      await expect(page.getByText(/purchased/i).first()).toBeVisible();
      await expect(page.getByText(/star pack credit/i).first()).toBeVisible();
    } else {
      await page.goto("/app/subscriptions");
      await expect(page.getByRole("heading", { name: /subscriptions/i }).first()).toBeVisible();
      await expect
        .poll(async () => {
          await page.reload();
          return readMetricCardNumber(page, /available stars/i);
        }, { timeout: 20000 })
        .toBeGreaterThan(walletBefore);
      await expect(page.getByText(/active student subscriptions/i).first()).toBeVisible();
      await expectAnyVisible(page, [/credited/i, /linked to credit/i, /active/i]);
    }
  });

  test("@workflow @mutable student wallet ledger reflects an admin grant after operator action", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();

    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    const walletBefore = await readMetricCardNumber(page, /available stars/i);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();
    const studentSelect = supportCard.locator("select").first();
    await studentSelect.selectOption(studentId);

    const grantAmount = 6;
    const uniqueSeed = Date.now();
    const grantReason = `Playwright support grant ${uniqueSeed}`;
    await supportCard.getByLabel(/stars to grant/i).fill(String(grantAmount));
    await supportCard.locator('input[placeholder*="Manual adjustment"]').first().fill(grantReason);
    await supportCard.locator('input[placeholder*="Optional ticket"]').first().fill(`PW-GRANT-${uniqueSeed}`);

    const grantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/grant-stars") &&
        response.request().method() === "POST",
    );
    await supportCard.getByRole("button", { name: /grant stars/i }).click();
    const grantResponse = await grantResponsePromise;
    expect(grantResponse.ok()).toBe(true);
    await expect(page.getByText(/stars granted successfully\./i)).toBeVisible();

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();

    await expect
      .poll(async () => readMetricCardNumber(page, /available stars/i), { timeout: 20000 })
      .toBeGreaterThanOrEqual(walletBefore + grantAmount);
    await expect(page.getByText(grantReason).first()).toBeVisible();
    await expect(page.getByText(/support grant/i).first()).toBeVisible();
    await expect(page.getByText(/\+6\b/i).first()).toBeVisible();
  });
});

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

async function readMetricCardNumber(page: Page, label: RegExp) {
  const card = page.locator("article").filter({
    has: page.getByText(label),
  }).first();
  await expect(card).toBeVisible();
  const rawValue = (await card.locator("strong").first().textContent()) ?? "0";
  const digits = rawValue.replace(/[^\d-]/g, "");
  return Number(digits || "0");
}
