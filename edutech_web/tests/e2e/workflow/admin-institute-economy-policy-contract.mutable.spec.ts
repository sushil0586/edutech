import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";

const mutableAdminInstituteEconomyPolicyEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ECONOMY_POLICY_CONTRACT",
);

type EconomyPolicyConfig = {
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_confirm_order_currency: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
};

type EconomyPolicyConfigResponse = {
  data?: EconomyPolicyConfig;
  message?: string;
};

type EconomyPolicyRuntime = {
  role: string;
  can_grant_stars: boolean;
  can_confirm_orders: boolean;
  max_grant_stars: number | null;
  max_confirm_order_amount: string | null;
  max_confirm_order_currency: string | null;
};

function supportActionsCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
  }).first();
}

function operatorQueueCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /pending order requests for the selected student/i,
    }),
  }).first();
}

test.describe("Admin to institute economy policy contract", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Admin and institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminInstituteEconomyPolicyEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ECONOMY_POLICY_CONTRACT",
      "admin to institute economy policy contract coverage",
    ),
  );

  test("@workflow @mutable platform policy changes disable institute-admin grant and confirm actions", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const currentPolicyResponse = await page.request.get("/api/admin/economy/policy-config");
    expect(currentPolicyResponse.ok()).toBe(true);
    const currentPolicy = (await currentPolicyResponse.json()) as EconomyPolicyConfig;

    try {
      const disableResponse = await page.request.patch("/api/admin/economy/policy-config", {
        data: {
          institute_admin_can_grant_stars: false,
          institute_admin_max_grant_stars: currentPolicy.institute_admin_max_grant_stars,
          institute_admin_can_confirm_orders: false,
          institute_admin_max_confirm_order_amount:
            currentPolicy.institute_admin_max_confirm_order_amount,
        },
      });
      expect(disableResponse.ok()).toBe(true);
      const disableBody = (await disableResponse.json()) as EconomyPolicyConfigResponse;
      expect(disableBody.data?.institute_admin_can_grant_stars).toBe(false);
      expect(disableBody.data?.institute_admin_can_confirm_orders).toBe(false);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const runtimePolicyResponse = await page.request.get("/api/admin/economy/policy");
      expect(runtimePolicyResponse.ok()).toBe(true);
      const runtimePolicy = (await runtimePolicyResponse.json()) as EconomyPolicyRuntime;
      expect(runtimePolicy.role).toBe("institute_admin");
      expect(runtimePolicy.can_grant_stars).toBe(false);
      expect(runtimePolicy.can_confirm_orders).toBe(false);

      await page.goto("/institute/economy");
      await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

      const supportCard = supportActionsCard(page);
      await expect(supportCard).toBeVisible();
      await expect(supportCard.getByText(/active policy:/i).first()).toBeVisible();
      await expect(supportCard.getByText(/grant limit:/i).first()).toBeVisible();
      await expect(supportCard.getByText(/order confirmation limit:/i).first()).toBeVisible();

      const grantButton = supportCard.getByRole("button", { name: /grant stars disabled by policy/i });
      await expect(grantButton).toBeVisible();
      await expect(grantButton).toBeDisabled();

      const refreshButton = supportCard.getByRole("button", { name: /refresh unlocks/i });
      await expect(refreshButton).toBeVisible();
      await expect(refreshButton).toBeEnabled();

      const operatorQueuePanel = operatorQueueCard(page);
      await expect(operatorQueuePanel).toBeVisible();
      const confirmationDisabledButtons = operatorQueuePanel.getByRole("button", {
        name: /confirmation disabled by policy/i,
      });
      const disabledCount = await confirmationDisabledButtons.count();
      if (disabledCount > 0) {
        await expect(confirmationDisabledButtons.first()).toBeDisabled();
      } else {
        await expect(
          operatorQueuePanel.getByText(/no pending order requests are visible for the selected student right now/i),
        ).toBeVisible();
      }
    } finally {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

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
});
