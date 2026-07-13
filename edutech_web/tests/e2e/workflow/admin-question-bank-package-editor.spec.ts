import { expect, test } from "@playwright/test";
import { AdminEconomyQuestionBankPage } from "../page-objects/admin/admin-economy-question-bank.po";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin question-bank package editor safety", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin gets blocking guidance before saving an unsafe package scope", async ({ page }) => {
    const economyPage = new AdminEconomyQuestionBankPage(page);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await economyPage.goto();
    await economyPage.openEditorView();

    const packageCard = economyPage.packageCard();
    await expect(packageCard).toBeVisible();

    await expect(packageCard.getByTestId("package-save-blocked-helper")).toContainText(
      /resolve the blocking issue on coverage row 1 before saving|add at least one active coverage row before saving/i,
    );

    const firstScopeRow = economyPage.scopeRows().first();
    await expect(firstScopeRow.getByTestId("package-scope-blocking-1")).toContainText(
      /active subject library rows must name a concrete subject/i,
    );
    await expect(economyPage.savePackageButton()).toBeDisabled();

    await economyPage.selectScopeProgram(firstScopeRow, /class 7/i);
    await economyPage.selectScopeSubject(firstScopeRow, /math/i);
    await economyPage.fillScopeLimit(firstScopeRow, "max questions total", "20");
    await economyPage.fillScopeLimit(firstScopeRow, "max per topic", "30");

    await expect(firstScopeRow.getByTestId("package-scope-blocking-1")).toContainText(
      /max per topic cannot be greater than max questions total/i,
    );
    await expect(economyPage.savePackageButton()).toBeDisabled();

    await economyPage.fillScopeLimit(firstScopeRow, "max per topic", "10");
    await expect(firstScopeRow.getByTestId("package-scope-blocking-1")).toHaveCount(0);
    await expect(economyPage.savePackageButton()).toBeEnabled();

    await economyPage.addScopeRow();
    const secondScopeRow = economyPage.scopeRows().nth(1);
    await economyPage.selectScopeProgram(secondScopeRow, /class 7/i);
    await economyPage.selectScopeSubject(secondScopeRow, /math/i);
    await economyPage.fillScopeLimit(secondScopeRow, "max questions total", "20");
    await economyPage.fillScopeLimit(secondScopeRow, "max per topic", "10");

    await expect(secondScopeRow.getByTestId("package-scope-blocking-2")).toContainText(
      /duplicates another active row/i,
    );
    await expect(packageCard.getByText(/fix these coverage rows before saving/i)).toBeVisible();
    await expect(economyPage.savePackageButton()).toBeDisabled();
  });

  test("@workflow admin sees live dependency impact before editing an existing package", async ({ page }) => {
    const economyPage = new AdminEconomyQuestionBankPage(page);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await economyPage.goto();
    await economyPage.openCatalogView();

    const packageCard = economyPage.packageCard();
    const firstCatalogRow = packageCard.locator(".economyPackageCatalogRow").first();
    await expect(firstCatalogRow).toBeVisible();
    await firstCatalogRow.getByRole("button", { name: /^edit$/i }).click();

    await expect(packageCard.getByTestId("package-live-impact")).toBeVisible();
    await expect(packageCard.getByTestId("package-live-impact")).toContainText(/live dependency impact/i);
    await expect(packageCard.getByTestId("package-live-impact")).toContainText(/active institute access row/i);
    await expect(packageCard.getByTestId("package-live-impact")).toContainText(/linked plan/i);
    await expect(packageCard.getByTestId("package-scope-change-summary")).toBeVisible();
  });
});
