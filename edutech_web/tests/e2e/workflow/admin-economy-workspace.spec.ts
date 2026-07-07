import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

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

    await gotoWithRuntimeRecovery(page, "/admin/economy");

    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
    await expect(workspaceNav(page).getByRole("link", { name: /overview/i }).first()).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText(/current workspace lane/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /what this lane is meant to manage/i })).toBeVisible();
    await expect(page.locator('a[href="/admin/institutes"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=catalog");
    await expect(workspaceNav(page).getByRole("link", { name: /catalog/i })).toHaveAttribute(
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

    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=access-control");
    await expect(workspaceNav(page).getByRole("link", { name: /access control/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /create and edit premium access policies by content target/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit unlock rules by content target/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /institute-admin support limits/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create access policy|update access policy/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create unlock rule|update unlock rule/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=question-bank");
    await expect(workspaceNav(page).getByRole("link", { name: /question bank commerce/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /question bank commerce/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit question-bank packages and scope coverage/i })).toBeVisible();
    const laneGuidanceDisclosure = firstDisclosure(page.locator("body"), /view lane guidance/i);
    await expect(laneGuidanceDisclosure).not.toHaveAttribute("open", "");
    await laneGuidanceDisclosure.locator("summary").click();
    await expect(laneGuidanceDisclosure).toHaveAttribute("open", "");
    const coverageDisclosure = firstDisclosure(page.locator("body"), /view coverage details/i);
    if (await coverageDisclosure.count()) {
      await expect(coverageDisclosure).not.toHaveAttribute("open", "");
      await coverageDisclosure.locator("summary").click();
      await expect(coverageDisclosure).toHaveAttribute("open", "");
    }
    const editButtons = page.getByRole("button", { name: /^edit$/i });
    if (await editButtons.count()) {
      await expect(editButtons.first()).toBeVisible();
    } else {
      await expect(page.getByText(/new package/i).first()).toBeVisible();
      await expect(page.getByText(/editing institute/i).first()).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=support-ops");
    await expect(workspaceNav(page).getByRole("link", { name: /support ops/i })).toHaveAttribute(
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

    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=bootstrap");
    await expect(workspaceNav(page).getByRole("link", { name: /bootstrap/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /economy scenarios grouped by rollout lane/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /how to stage the seed rollout/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /reward scenarios and seed timing/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /recommended seed command flow/i })).toBeVisible();

    await page.locator('a[href="/admin/institutes"]').first().click();
    await expect(page).toHaveURL(/\/admin\/institutes(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/settings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
  });
});
