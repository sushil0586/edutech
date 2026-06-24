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

    const studentSelect = page.locator("select").first();
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

    const starsInput = page.locator('input[type="number"]').first();
    const reasonInput = page.locator('input[placeholder*="Manual adjustment"]').first();
    const referenceInput = page.locator('input[placeholder*="Optional ticket"]').first();

    await starsInput.fill(String(grantAmount));
    await reasonInput.fill(grantReason);
    await referenceInput.fill(grantReference);

    const grantResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/grant-stars") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /grant stars/i }).click();
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
});
