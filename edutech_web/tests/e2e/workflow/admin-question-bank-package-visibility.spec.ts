import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin question-bank operator visibility", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect package scope and institute entitlement visibility", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy?tab=question-bank");
    await page.getByRole("combobox", { name: /economy subsection|subsection/i }).selectOption("Visibility");
    await page.getByRole("button", { name: /update view/i }).click();
    const visibilityCard = page
      .locator("article.dashboardPanel")
      .filter({
        has: page.getByText(
          /check package coverage and institute access before changing live access|how to diagnose missing institute access/i,
        ),
      })
      .first();

    await expect(
      visibilityCard.getByRole("heading", {
        name: /check package coverage and institute access before changing live access/i,
      }),
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
  });
});
