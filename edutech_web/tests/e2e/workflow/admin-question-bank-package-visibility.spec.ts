import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin question-bank operator visibility", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect package scope and institute entitlement visibility", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy?tab=question-bank");
    const visibilityCard = page
      .locator("article.dashboardPanel")
      .filter({ has: page.getByRole("heading", { name: /inspect package scope and institute access before changing subscription controls/i }) })
      .first();

    await expect(
      page.getByRole("heading", { name: /inspect package scope and institute access before changing subscription controls/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /create and edit question-bank packages and scope coverage/i }),
    ).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /show dataset/i })).toHaveValue("entitlements");
    await expect(visibilityCard.getByRole("combobox", { name: /rows to show/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /^package$/i })).toBeVisible();
    await expect(page.getByText(/institute question entitlements/i).first()).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /entitlement status/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /granted via/i })).toBeVisible();
    await expect(
      page.locator(".weakTopicRow").filter({ hasText: /DLI001|PUBDLI1/i }).first(),
    ).toBeVisible();
    await expect(page.getByText(/status:/i).first()).toBeVisible();
    await expect(page.getByText(/lifecycle window:/i).first()).toBeVisible();

    await visibilityCard.getByRole("combobox", { name: /show dataset/i }).selectOption("packages");
    await expect(page.getByText(/question-bank packages/i).first()).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /package family/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /^ownership$/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /access mode/i })).toBeVisible();
    await expect(visibilityCard.locator(".weakTopicRow").first()).toBeVisible();
    const packageScopeDisclosure = visibilityCard.locator("details", { hasText: /view package scope details/i }).first();
    await packageScopeDisclosure.locator("summary").click();
    await expect(packageScopeDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    await expect(
      packageScopeDisclosure.getByText(/no scope rows configured|scope row|program:|subject:|topic:/i).first(),
    ).toBeVisible();
    await expect(visibilityCard.getByText(/default\/linked plans/i).first()).toBeVisible();
    await expect(visibilityCard.getByText(/usage units/i).first()).toBeVisible();
  });
});
