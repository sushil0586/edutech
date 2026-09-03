import { expect, type Locator, type Page } from "@playwright/test";
import { gotoWithRuntimeRecovery } from "../../helpers/runtime";

export class AdminEconomyQuestionBankPage {
  constructor(private readonly page: Page) {}

  private async selectOptionByLabelPattern(locator: Locator, pattern: RegExp) {
    await expect
      .poll(
        async () =>
          locator.locator("option").evaluateAll(
            (options, source) => {
              const expression = new RegExp(source.pattern, source.flags);
              const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
              return match ? (match as HTMLOptionElement).value : "";
            },
            { pattern: pattern.source, flags: pattern.flags },
          ),
        {
          message: `Expected option matching ${pattern} to become available`,
        },
      )
      .not.toBe("");
    const optionValue = await locator.locator("option").evaluateAll(
      (options, source) => {
        const expression = new RegExp(source.pattern, source.flags);
        const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
        return match ? (match as HTMLOptionElement).value : "";
      },
      { pattern: pattern.source, flags: pattern.flags },
    );
    await locator.selectOption(optionValue);
  }

  private async hasOptionWithExactLabel(locator: Locator, label: string) {
    return locator.locator("option").evaluateAll(
      (options, expectedLabel) =>
        options.some((option) => (option as HTMLOptionElement).label === expectedLabel),
      label,
    );
  }

  private async selectOptionByPartialLabel(locator: Locator, labelFragment: string) {
    const normalizedFragment = labelFragment.trim().toLowerCase();
    await expect
      .poll(
        async () =>
          locator.locator("option").evaluateAll(
            (options, expectedFragment) => {
              const match = options.find((option) =>
                (option as HTMLOptionElement).label.toLowerCase().includes(expectedFragment),
              );
              return match ? (match as HTMLOptionElement).value : "";
            },
            normalizedFragment,
          ),
        {
          message: `Expected option containing ${labelFragment} to become available`,
        },
      )
      .not.toBe("");

    const optionValue = await locator.locator("option").evaluateAll(
      (options, expectedFragment) => {
        const match = options.find((option) =>
          (option as HTMLOptionElement).label.toLowerCase().includes(expectedFragment),
        );
        return match ? (match as HTMLOptionElement).value : "";
      },
      normalizedFragment,
    );
    await locator.selectOption(optionValue);
  }

  async goto(instituteId?: string) {
    const params = new URLSearchParams({ tab: "question-bank" });
    if (instituteId) {
      params.set("institute", instituteId);
    }
    await gotoWithRuntimeRecovery(this.page, `/admin/economy?${params.toString()}`);
    await expect(this.page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    if (instituteId) {
      const instituteScope = this.page.getByRole("combobox", { name: /institute scope/i });
      await instituteScope.selectOption(instituteId);
      const applyFiltersButton = this.page.getByRole("button", { name: /apply filters|update view/i });
      if (await applyFiltersButton.count()) {
        await applyFiltersButton.first().click();
      }
      await expect(instituteScope).toHaveValue(instituteId);
    }
  }

  async openEditorView() {
    const packageCard = this.packageCard();
    await expect(packageCard).toBeVisible();
    await packageCard.getByLabel(/question bank package workspace view/i).selectOption("editor");
    await expect(packageCard.getByText(/package identity/i).first()).toBeVisible();
  }

  packageCard() {
    return this.page.locator("article.dashboardPanel").filter({
      has: this.page.getByRole("heading", {
        name: /create and edit question-bank packages and scope coverage/i,
      }),
    }).first();
  }

  visibilityCard() {
    return this.page.locator("article.dashboardPanel").filter({
      has: this.page.getByRole("heading", {
        name: /check package coverage and institute access before changing live access|inspect package scope and institute access before changing subscription controls|how to diagnose missing institute access/i,
      }),
    }).first();
  }

  async openCatalogView() {
    const packageCard = this.packageCard();
    await expect(packageCard).toBeVisible();
    await packageCard.getByLabel(/question bank package workspace view/i).selectOption("all");
    await expect(packageCard.getByText(/current package catalog/i)).toBeVisible();
  }

  async selectCatalogInstituteFilter(value: string) {
    await this.packageCard().getByLabel(/question bank package institute filter/i).selectOption(value);
  }

  async selectCatalogRowsToShow(value: "4" | "8" | "12") {
    await this.packageCard().getByLabel(/question bank package rows to show/i).selectOption(value);
  }

  async fillCatalogPackageLookup(value: string) {
    await this.packageCard().getByLabel(/question bank package lookup/i).fill(value);
  }

  packageCatalogRow(packageName: string) {
    return this.packageCard().locator(".economyPackageCatalogRow").filter({
      hasText: new RegExp(packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    }).first();
  }

  async editPackage(packageName: string) {
    await this.fillCatalogPackageLookup(packageName);
    const row = this.packageCatalogRow(packageName);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /^edit$/i }).click();
    await expect(this.page.getByRole("button", { name: /update question-bank package/i })).toBeVisible();
  }

  async selectPackageInstitute(label: RegExp) {
    await this.selectOptionByLabelPattern(
      this.packageCard().getByLabel(/^institute$/i),
      label,
    );
  }

  async selectPackageInstituteById(instituteId: string) {
    await this.openEditorView();
    await this.packageCard().locator(".economyPackageFormGridPrimary select").first().selectOption(instituteId);
  }

  async selectPackageType(label: RegExp) {
    await this.selectOptionByLabelPattern(
      this.packageCard().locator(".economyPackageFormGridPrimary select").nth(1),
      label,
    );
  }

  async fillPackageIdentity(name: string, code: string, description: string) {
    const card = this.packageCard();
    await card.getByLabel(/package name/i).fill(name);
    await card.getByLabel(/package code/i).fill(code);
    await card.getByLabel(/description/i).fill(description);
  }

  async selectAccessMode(label: RegExp) {
    await this.selectOptionByLabelPattern(
      this.packageCard().locator(".economyPackageFormGridSecondary select").nth(1),
      label,
    );
  }

  async fillSortOrder(value: string) {
    await this.packageCard().getByRole("spinbutton", { name: /sort order/i }).fill(value);
  }

  async addScopeRow() {
    await this.packageCard().getByRole("button", { name: /add (scope|coverage) row/i }).click();
  }

  async quickAddSubjectRow(label: RegExp) {
    await this.packageCard().getByRole("button", { name: label }).click();
  }

  scopeRows() {
    return this.packageCard().locator(".economyPackageScopeCard");
  }

  async selectScopeProgram(scopeRow: Locator, label: RegExp) {
    await this.selectOptionByLabelPattern(scopeRow.getByLabel(/program \d+/i), label);
  }

  async selectScopeSubject(scopeRow: Locator, label: RegExp) {
    await this.selectOptionByLabelPattern(scopeRow.getByLabel(/subject \d+/i), label);
  }

  async selectScopeTopic(scopeRow: Locator, label: RegExp) {
    await this.selectOptionByLabelPattern(scopeRow.getByLabel(/topic \d+/i), label);
  }

  async setScopeActive(scopeRow: Locator) {
    await scopeRow.getByLabel(/row status/i).selectOption("yes");
  }

  async fillScopeLimit(scopeRow: Locator, field: "max questions total" | "max per topic", value: string) {
    await scopeRow.getByLabel(new RegExp(field, "i")).fill(value);
  }

  savePackageButton() {
    return this.packageCard().getByRole("button", {
      name: /create question-bank package|update question-bank package/i,
    });
  }

  async createPackage() {
    await this.openEditorView();
    const responsePromise = this.page.waitForResponse((response) =>
      response.url().includes("/api/admin/economy/question-bank-packages") &&
      response.request().method() === "POST",
    );
    await this.savePackageButton().click();
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBe(true);
    await expect(this.packageCard().getByText(/question bank package created successfully\./i)).toBeVisible();
  }

  async savePackageUpdate() {
    const responsePromise = this.page.waitForResponse((response) =>
      response.url().includes("/api/admin/economy/question-bank-packages/") &&
      response.request().method() === "PATCH",
    );
    await this.page.getByRole("button", { name: /update question-bank package/i }).click();
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBe(true);
    await expect(this.packageCard().getByText(/question bank package updated successfully\./i)).toBeVisible();
  }

  async showEntitlementsForPackage(packageLabel: string, instituteScopeLabel?: string) {
    if (instituteScopeLabel) {
      const instituteScope = this.page.getByRole("combobox", { name: /institute scope/i });
      if (await this.hasOptionWithExactLabel(instituteScope, instituteScopeLabel)) {
        await instituteScope.selectOption({ label: instituteScopeLabel });
      } else {
        await this.selectOptionByPartialLabel(instituteScope, instituteScopeLabel);
      }
      const instituteId = await instituteScope.inputValue();
      const params = new URLSearchParams({ tab: "question-bank", focus: "visibility" });
      if (instituteId) {
        params.set("institute", instituteId);
      }
      await gotoWithRuntimeRecovery(this.page, `/admin/economy?${params.toString()}`);
    } else {
      await gotoWithRuntimeRecovery(this.page, "/admin/economy?tab=question-bank&focus=visibility");
    }
    const visibilityCard = this.visibilityCard();
    await expect(visibilityCard).toBeVisible();
    await visibilityCard.getByRole("combobox", { name: /show dataset/i }).selectOption("entitlements");
    await visibilityCard.getByRole("combobox", { name: /rows to show/i }).selectOption("50");
    const packageFilter = visibilityCard.getByRole("combobox", { name: /^package$/i });
    if (await this.hasOptionWithExactLabel(packageFilter, packageLabel)) {
      await packageFilter.selectOption({ label: packageLabel });
    }
    await visibilityCard.getByRole("combobox", { name: /institute access status|entitlement status/i }).selectOption("all");
  }

  entitlementRow(entitlementId: string) {
    return this.visibilityCard().getByTestId(`entitlement-row-${entitlementId}`);
  }

  entitlementRowForInstitutePackage(instituteCode: string, packageCode: string) {
    return this.visibilityCard().locator("[data-testid^='entitlement-row-']").filter({
      hasText: new RegExp(`${instituteCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*${packageCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
    }).first();
  }
}
