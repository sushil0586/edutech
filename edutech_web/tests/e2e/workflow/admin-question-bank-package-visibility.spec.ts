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
      .filter({ has: page.getByRole("heading", { name: /check package coverage and institute access before changing live access/i }) })
      .first();

    await expect(
      page.getByRole("heading", { name: /check package coverage and institute access before changing live access/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /create and edit question-bank packages and scope coverage/i }),
    ).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /show dataset/i })).toHaveValue("entitlements");
    await expect(visibilityCard.getByRole("combobox", { name: /rows to show/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /^package$/i })).toBeVisible();
    const operatorGlossary = visibilityCard.getByTestId("economy-operator-glossary");
    await expect(operatorGlossary).toBeVisible();
    await expect(operatorGlossary).toContainText(/package/i);
    await expect(operatorGlossary).toContainText(/institute access row/i);
    await expect(operatorGlossary).toContainText(/shared-library switch/i);
    await expect(operatorGlossary).toContainText(/linked or visible questions/i);
    await expect(page.getByText(/institute question access/i).first()).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /entitlement status|institute access status/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /granted via/i })).toBeVisible();
    const firstEntitlementRow = visibilityCard.locator('[data-testid^="entitlement-row-"]').first();
    await expect(firstEntitlementRow).toBeVisible();
    await expect(firstEntitlementRow).toContainText(/status:/i);
    await expect(firstEntitlementRow).toContainText(/lifecycle window:/i);
    const firstAccessChain = firstEntitlementRow.locator('[data-testid^="entitlement-access-chain-"]').first();
    await expect(firstAccessChain).toBeVisible();
    await expect(firstAccessChain).toContainText(/1\. package coverage/i);
    await expect(firstAccessChain).toContainText(/2\. institute entitlement/i);
    await expect(firstAccessChain).toContainText(/3\. shared-library runtime/i);
    await expect(firstAccessChain).toContainText(/4\. operator verdict/i);

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
      packageScopeDisclosure.locator(".economyCatalogDetailStack span").first(),
    ).toBeVisible();
    await expect(visibilityCard.getByText(/default\/linked plans/i).first()).toBeVisible();
    await expect(visibilityCard.getByText(/usage units/i).first()).toBeVisible();
  });
});
