import { expect, Page } from "@playwright/test";

export class InstituteLibraryLinkerPage {
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
    await this.page.goto("/institute/question-bank/library-linker");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(this.page.getByText(/step 1\. choose class and subject/i).first()).toBeVisible();
    await expect(this.page.getByText(/current lane: shared library linker/i).first()).toBeVisible();
    await expect(this.page.getByText(/this page is not for changing question wording/i).first()).toBeVisible();
  }

  async applyScope(programLabel?: RegExp, subjectLabel?: RegExp, topicLabel?: RegExp) {
    if (programLabel) {
      const programSelect = this.page.getByRole("combobox", { name: /^program$/i });
      await this.selectOptionByLabelPattern(programSelect, programLabel);
    }

    if (subjectLabel) {
      const subjectSelect = this.page.getByRole("combobox", { name: /^subject$/i });
      await this.selectOptionByLabelPattern(subjectSelect, subjectLabel);
    }

    if (topicLabel) {
      const topicSelect = this.page.getByRole("combobox", { name: /^topic$/i });
      await this.selectOptionByLabelPattern(topicSelect, topicLabel);
    }

    await this.page.getByRole("button", { name: /load topics|show questions/i }).click();
  }

  async expectTopicCoverageVisible() {
    await expect(this.page.getByText(/step 2\. pick one topic/i).first()).toBeVisible();
  }

  async expectTopicReviewVisible() {
    await expect(this.page.getByText(/step 3\. review and link platform source questions/i).first()).toBeVisible();
  }

  async openFirstAvailableTopic() {
    const openTopicButton = this.page.getByRole("link", { name: /review this topic|currently open/i }).first();
    await expect(openTopicButton).toBeVisible();
    await openTopicButton.click();
  }

  async setRowsPerPage(value: "25" | "50" | "100") {
    await this.page.getByRole("combobox", { name: /rows per page/i }).selectOption(value);
  }

  async searchCurrentTopic(query: string) {
    await this.page.getByRole("textbox", { name: /search current topic/i }).fill(query);
    await this.page.getByRole("button", { name: /show questions/i }).click();
  }

  async expectQuestionCardsVisible() {
    await expect(this.page.locator(".questionBankCard").first()).toBeVisible();
  }

  nextPageButton() {
    return this.page.getByRole("link", { name: /next page/i });
  }

  previousPageButton() {
    return this.page.getByRole("link", { name: /previous page/i });
  }
}
