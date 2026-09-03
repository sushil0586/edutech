import { expect, Page } from "@playwright/test";

export class InstituteLibraryLinkerPage {
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
    await this.page.goto("/institute/question-bank/library-linker");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(this.page.getByRole("combobox", { name: /^program$/i })).toBeVisible();
    await expect(this.page.getByRole("combobox", { name: /^subject$/i })).toBeVisible();
    await expect(this.page.getByRole("button", { name: /load topics|show questions/i })).toBeVisible();
    await expect(
      this.page.getByText(/current lane: shared library linker|use this page only for intake/i).first(),
    ).toBeVisible();
  }

  async applyScope(programLabel?: RegExp, subjectLabel?: RegExp, topicLabel?: RegExp) {
    const loadTopicsButton = this.page.getByRole("button", { name: /load topics|show questions/i });

    if (programLabel) {
      const programSelect = this.page.getByRole("combobox", { name: /^program$/i });
      const programOptionValue = await this.findOptionValueByLabelPattern(programSelect, programLabel);
      expect(programOptionValue).toBeTruthy();
      await programSelect.selectOption(programOptionValue);

      if (subjectLabel) {
        const subjectSelect = this.page.getByRole("combobox", { name: /^subject$/i });
        let subjectOptionValue = await this.findOptionValueByLabelPattern(subjectSelect, subjectLabel);
        if (!subjectOptionValue) {
          await Promise.all([
            this.page.waitForURL((url) => url.searchParams.get("program") === programOptionValue),
            loadTopicsButton.click(),
          ]);
          await expect(subjectSelect).toBeEnabled();
          subjectOptionValue = await this.findOptionValueByLabelPattern(subjectSelect, subjectLabel);
        }
        expect(subjectOptionValue).toBeTruthy();
        await subjectSelect.selectOption(subjectOptionValue);
      }
    } else if (subjectLabel) {
      const subjectSelect = this.page.getByRole("combobox", { name: /^subject$/i });
      await this.selectOptionByLabelPattern(subjectSelect, subjectLabel);
    }

    if (topicLabel) {
      const topicSelect = this.page.getByRole("combobox", { name: /^topic$/i });
      await this.selectOptionByLabelPattern(topicSelect, topicLabel);
    }

    await loadTopicsButton.click();
  }

  async expectTopicCoverageVisible() {
    await expect(this.page.getByRole("button", { name: /show only topics still linkable/i })).toBeVisible();
    await expect(this.page.getByText(/available in platform bank/i).first()).toBeVisible();
  }

  async expectTopicReviewVisible() {
    await expect(this.page).toHaveURL(/topic=/);
    await expect(
      this.page.locator(".sectionHeading").filter({ hasText: /review and link platform source questions/i }).first(),
    ).toBeVisible();
  }

  async openFirstAvailableTopic() {
    const openTopicButton = this.page.getByRole("link", { name: /review this topic|currently open/i }).first();
    await expect(openTopicButton).toBeVisible();
    const href = await openTopicButton.getAttribute("href");
    expect(href).toBeTruthy();
    await this.page.goto(href!);
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
