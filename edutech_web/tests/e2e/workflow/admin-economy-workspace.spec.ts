import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin economy workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  const workspaceNav = (page: Page) =>
    page.getByRole("navigation", { name: /economy workspace sections/i });
  const firstDisclosure = (root: Locator, label: RegExp) =>
    root.locator("details", { hasText: label }).first();

  test("@workflow admin can inspect economy governance and safe support controls", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy");

    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=overview"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText(/current workspace lane/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what this lane is meant to manage/i })).toBeVisible();
    await expect(page.locator('a[href="/admin/institutes"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();

    await page.goto("/admin/economy?tab=catalog");
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=catalog"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("heading", { name: /activate or pause live wallet, referral, and subscription catalog lanes/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit live wallet pack offers/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit referral campaigns and reward posture/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit reward rules for signup, completion, and score ladders/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create star pack|update star pack/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create referral program|update referral program/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create reward rule|update reward rule/i })).toBeVisible();

    await page.goto("/admin/economy?tab=access-control");
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=access-control"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /create and edit premium access policies by content target/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit unlock rules by content target/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /institute-admin support limits/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create access policy|update access policy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create unlock rule|update unlock rule/i })).toBeVisible();

    await page.goto("/admin/economy?tab=question-bank");
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=question-bank"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText(/question-bank package link/i).first()).toBeVisible();
    const commercialDisclosure = firstDisclosure(page.locator("body"), /view commercial details/i);
    await commercialDisclosure.locator("summary").click();
    await expect(commercialDisclosure.getByText(/linked packages:/i)).toBeVisible();
    await expect(page.getByText(/renewal posture:/i).first()).toBeVisible();
    await expect(page.getByText(/entitlement reconciliation:/i).first()).toBeVisible();
    const reconciliationDisclosure = firstDisclosure(page.locator("body"), /view access reconciliation/i);
    await reconciliationDisclosure.locator("summary").click();
    await expect(reconciliationDisclosure.getByText(/remediation:/i)).toBeVisible();
    const lastApplyResult = page.getByText(/last apply result/i).first();
    if (await lastApplyResult.count()) {
      await expect(lastApplyResult).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: /create and edit recurring plans, cycles, and credit rules/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create subscription plan|update subscription plan/i })).toBeVisible();

    await page.goto("/admin/economy?tab=support-ops");
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=support-ops"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /institute subscription request queue/i })).toBeVisible();
    await expect(page.getByText(/student support actions/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i })).toBeVisible();

    const studentSelect = page.locator("select").filter({ has: page.locator("option") }).nth(0);
    await expect(studentSelect).toBeVisible();

    const starsInput = page.getByLabel(/stars to grant/i);
    const reasonInput = page.getByLabel(/reason/i).last();
    const referenceInput = page.getByLabel(/reference/i).last();

    await expect(starsInput).toHaveValue("25");
    await starsInput.fill("30");
    await expect(starsInput).toHaveValue("30");

    await reasonInput.fill("");
    await referenceInput.fill("PW-E2E-REF");
    await page.getByRole("button", { name: /grant stars/i }).click();
    await expect(page.getByText(/enter a clear reason for the grant/i)).toBeVisible();

    await page.getByRole("button", { name: /refresh unlocks/i }).click();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await page.goto("/admin/economy?tab=bootstrap");
    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=bootstrap"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText(/seed groups/i).first()).toBeVisible();
    await expect(page.getByText(/scenario coverage/i).first()).toBeVisible();
    await expect(page.getByText(/live runtime lanes/i).first()).toBeVisible();
    await expect(page.getByText(/mandatory phase 1 seeds/i).first()).toBeVisible();

    await page.locator('a[href="/admin/institutes"]').first().click();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/settings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
  });
});
