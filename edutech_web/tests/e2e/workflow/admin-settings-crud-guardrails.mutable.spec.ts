import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminSettingsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_SETTINGS_ACTIONS",
);

type EconomyPolicyConfig = {
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
};

function toYesNo(value: boolean) {
  return value ? "yes" : "no";
}

async function gotoSettings(page: Page) {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
}

async function fetchPolicyConfig(page: Page) {
  const response = await page.request.get("/api/admin/economy/policy-config");
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as EconomyPolicyConfig;
}

async function restorePolicyConfig(page: Page, config: EconomyPolicyConfig | null) {
  if (!config) {
    return;
  }
  const response = await page.request.patch("/api/admin/economy/policy-config", {
    data: {
      institute_admin_can_grant_stars: config.institute_admin_can_grant_stars,
      institute_admin_max_grant_stars: config.institute_admin_max_grant_stars,
      institute_admin_can_confirm_orders: config.institute_admin_can_confirm_orders,
      institute_admin_max_confirm_order_amount: config.institute_admin_max_confirm_order_amount,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Admin settings CRUD guardrails", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminSettingsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_SETTINGS_ACTIONS",
      "admin settings CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can update economy policy settings through the browser and see them persist on reload", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const originalConfig = await fetchPolicyConfig(page);
    const nextConfig: EconomyPolicyConfig = {
      institute_admin_can_grant_stars: !originalConfig.institute_admin_can_grant_stars,
      institute_admin_max_grant_stars:
        originalConfig.institute_admin_max_grant_stars === 250
          ? 175
          : originalConfig.institute_admin_max_grant_stars + 7,
      institute_admin_can_confirm_orders: !originalConfig.institute_admin_can_confirm_orders,
      institute_admin_max_confirm_order_amount:
        originalConfig.institute_admin_max_confirm_order_amount === "5000.00"
          ? "4321.00"
          : "5000.00",
    };

    try {
      await gotoSettings(page);

      await page
        .locator("label")
        .filter({ hasText: /institute admin can grant stars/i })
        .locator("select")
        .selectOption(toYesNo(nextConfig.institute_admin_can_grant_stars));
      await page
        .locator("label")
        .filter({ hasText: /max stars per grant/i })
        .locator("input")
        .fill(String(nextConfig.institute_admin_max_grant_stars));
      await page
        .locator("label")
        .filter({ hasText: /institute admin can confirm orders/i })
        .locator("select")
        .selectOption(toYesNo(nextConfig.institute_admin_can_confirm_orders));
      await page
        .locator("label")
        .filter({ hasText: /max order amount/i })
        .locator("input")
        .fill(nextConfig.institute_admin_max_confirm_order_amount);

      const saveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/economy/policy-config") &&
          response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: /save economy policy/i }).click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok(), await saveResponse.text()).toBe(true);

      await expect(page.getByText(/economy operator policy updated successfully/i).first()).toBeVisible();

      await page.reload();
      await expect(
        page.locator("label").filter({ hasText: /institute admin can grant stars/i }).locator("select"),
      ).toHaveValue(toYesNo(nextConfig.institute_admin_can_grant_stars));
      await expect(
        page.locator("label").filter({ hasText: /max stars per grant/i }).locator("input"),
      ).toHaveValue(String(nextConfig.institute_admin_max_grant_stars));
      await expect(
        page.locator("label").filter({ hasText: /institute admin can confirm orders/i }).locator("select"),
      ).toHaveValue(toYesNo(nextConfig.institute_admin_can_confirm_orders));
      await expect(
        page.locator("label").filter({ hasText: /max order amount/i }).locator("input"),
      ).toHaveValue(nextConfig.institute_admin_max_confirm_order_amount);
    } finally {
      await restorePolicyConfig(page, originalConfig);
    }
  });
});
