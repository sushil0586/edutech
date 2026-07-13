import { expect, Page } from "@playwright/test";

export class InstituteQuestionBankPage {
  constructor(private readonly page: Page) {}

  private async findOptionValueByLabelPattern(locator: ReturnType<Page["locator"]>, pattern: RegExp) {
    return locator.locator("option").evaluateAll(
      (options, source) => {
        const expression = new RegExp(source.pattern, source.flags);
        const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
        return match ? (match as HTMLOptionElement).value : "";
      },
      { pattern: pattern.source, flags: pattern.flags },
    );
  }

  private async selectOptionByLabelPattern(locator: ReturnType<Page["locator"]>, pattern: RegExp) {
    const optionValue = await this.findOptionValueByLabelPattern(locator, pattern);
    expect(optionValue).toBeTruthy();
    await locator.selectOption(optionValue);
  }

  async goto() {
    await this.page.goto("/institute/question-bank");
  }

  async gotoLinked() {
    await this.page.goto("/institute/question-bank/linked");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(this.page.getByText(/find questions faster/i).first()).toBeVisible();
  }

  async expectLinkedLoaded() {
    await expect(this.page.getByRole("heading", { name: /linked questions/i }).first()).toBeVisible();
    await expect(this.page.getByText(/how linked questions work/i).first()).toBeVisible();
    await expect(this.page.getByText(/use this page for review and exam reuse/i).first()).toBeVisible();
    await expect(this.page.getByTestId("question-bank-access-diagnosis")).toBeVisible();
    await expect(this.page.getByText(/rows on this page/i).first()).toBeVisible();
    await expect(this.page.getByText(/total linked rows in this filtered scope/i).first()).toBeVisible();
    await expect(this.page.getByText(/duplicate before editing/i).first()).toBeVisible();
  }

  async expectLinkedScopeSummary() {
    await expect(this.page.getByTestId("question-bank-access-steps")).toBeVisible();
    await expect(this.page.getByText(/current selection:/i).first()).toBeVisible();
    await expect(this.page.getByText(/rows on this page/i).first()).toBeVisible();
    await expect(this.page.getByText(/the total linked count can be larger/i).first()).toBeVisible();
    await expect(this.page.getByText(/active package coverage/i).first()).toBeVisible();
  }

  async search(query: string) {
    await this.page.getByRole("textbox", { name: /search question text/i }).fill(query);
    await this.page.getByRole("button", { name: /apply filters/i }).click();
  }

  async selectAcademicFilters(programLabel: RegExp, subjectLabel: RegExp) {
    const programSelect = this.page.getByRole("combobox", { name: /^program$/i });
    const subjectSelect = this.page.getByRole("combobox", { name: /^subject$/i });
    const applyFiltersButton = this.page.getByRole("button", { name: /apply filters/i });

    const programOptionValue = await this.findOptionValueByLabelPattern(programSelect, programLabel);
    expect(programOptionValue).toBeTruthy();
    await programSelect.selectOption(programOptionValue);

    // Program changes are resolved on the server for this route, so reload once
    // before expecting the dependent subject list to contain the new scope.
    let subjectOptionValue = await this.findOptionValueByLabelPattern(subjectSelect, subjectLabel);
    if (!subjectOptionValue) {
      await Promise.all([
        this.page.waitForURL((url) => url.searchParams.get("program") === programOptionValue),
        applyFiltersButton.click(),
      ]);
      await expect(programSelect).toBeVisible();
      await expect(subjectSelect).toBeEnabled();
      subjectOptionValue = await this.findOptionValueByLabelPattern(subjectSelect, subjectLabel);
    }

    expect(subjectOptionValue).toBeTruthy();
    await subjectSelect.selectOption(subjectOptionValue);
  }

  async openLinkedLane() {
    await this.page.getByRole("link", { name: /linked questions/i }).first().click();
  }

  async openSharedLibraryLinker() {
    const scopedLinkerLink = this.page.getByRole("link", { name: /^open shared library linker for this scope$/i }).first();
    if (await scopedLinkerLink.isVisible().catch(() => false)) {
      await scopedLinkerLink.click();
      return;
    }

    const hrefScopedLink = this.page.locator('a[href*="/institute/question-bank/library-linker"]').first();
    if (await hrefScopedLink.isVisible().catch(() => false)) {
      await hrefScopedLink.click();
      return;
    }

    await this.page.getByRole("link", { name: /shared library linker/i }).first().click();
  }
}
