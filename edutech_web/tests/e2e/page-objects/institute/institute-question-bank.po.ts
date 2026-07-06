import { expect, Page } from "@playwright/test";

export class InstituteQuestionBankPage {
  constructor(private readonly page: Page) {}

  private async selectOptionByLabelPattern(locator: ReturnType<Page["locator"]>, pattern: RegExp) {
    const optionValue = await locator.locator("option").evaluateAll(
      (options, source) => {
        const expression = new RegExp(source.pattern, source.flags);
        const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
        return match ? (match as HTMLOptionElement).value : "";
      },
      { pattern: pattern.source, flags: pattern.flags },
    );
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

    await this.selectOptionByLabelPattern(programSelect, programLabel);
    await expect(subjectSelect).toBeEnabled();
    await this.selectOptionByLabelPattern(subjectSelect, subjectLabel);
  }

  async openLinkedLane() {
    await this.page.getByRole("link", { name: /linked questions/i }).first().click();
  }

  async openSharedLibraryLinker() {
    await this.page.getByRole("link", { name: /open shared library linker|link shared library|open shared library/i }).first().click();
  }
}
