import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableInstituteEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_ECONOMY_ACTIONS",
);

function supportActionsCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
  }).first();
}

test.describe("Institute mutable economy actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_ECONOMY_ACTIONS",
      "institute economy support-action coverage",
    ),
  );

  test("@workflow @mutable institute admin can grant stars to an in-scope student", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.locator("select").first();
    await expect(studentSelect).toBeVisible();
    const studentId = await studentSelect.inputValue();
    expect(studentId).toBeTruthy();

    const walletBeforeResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletBeforeResponse.ok()).toBe(true);
    const walletBefore = (await walletBeforeResponse.json()) as {
      available_stars: number;
    };

    const grantAmount = 4;
    const uniqueSeed = Date.now();

    await supportCard.getByLabel(/stars to grant/i).fill(String(grantAmount));
    await supportCard.getByLabel(/reason/i).fill(`Institute mutable grant ${uniqueSeed}`);
    await supportCard.getByLabel(/reference/i).fill(`INST-ECO-${uniqueSeed}`);

    const grantButton = supportCard.getByRole("button", { name: /grant stars|grant stars disabled by policy/i });
    await expect(grantButton).toBeVisible();
    const buttonLabel = ((await grantButton.textContent()) ?? "").trim();
    if (/disabled by policy/i.test(buttonLabel)) {
      test.skip(true, "Institute admin star grants are disabled by current economy policy.");
    }

    const grantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/grant-stars") &&
        response.request().method() === "POST",
    );
    await grantButton.click();
    const grantResponse = await grantResponsePromise;
    expect(grantResponse.ok()).toBe(true);

    await expect(page.getByText(/stars granted successfully\./i)).toBeVisible();
    await expect
      .poll(
        async () => {
          const walletAfterResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
          expect(walletAfterResponse.ok()).toBe(true);
          const walletAfter = (await walletAfterResponse.json()) as {
            available_stars: number;
          };
          return walletAfter.available_stars;
        },
        { timeout: 20000 },
      )
      .toBe(walletBefore.available_stars + grantAmount);
  });

  test("@workflow @mutable institute admin can confirm a pending student order when policy allows", async ({
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

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.locator("select").first();
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);

    const operatorQueuePanel = page.locator(".dashboardPanel").filter({
      has: page.getByRole("heading", { name: /pending order requests for the selected student/i }),
    }).first();
    await expect(operatorQueuePanel).toBeVisible();

    const policyDisabledButton = operatorQueuePanel.getByRole("button", { name: /confirmation disabled by policy/i }).first();
    if (await policyDisabledButton.isVisible().catch(() => false)) {
      test.skip(true, "Institute admin order confirmation is disabled by current economy policy.");
    }

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
  });
});
