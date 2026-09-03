import { expect, type Locator, type Page } from "@playwright/test";

export class InstituteSharedLibraryLinkerPage {
  constructor(private readonly page: Page) {}

  private resolveSummaryLabelPattern(pattern: RegExp) {
    if (/platform source in this subject/i.test(pattern.source)) {
      return /available in platform bank/i;
    }
    if (/already linked/i.test(pattern.source)) {
      return /already linked locally/i;
    }
    if (/not yet added|still linkable/i.test(pattern.source)) {
      return /not yet added/i;
    }
    return pattern;
  }

  private async selectOptionByLabelPattern(locator: Locator, pattern: RegExp) {
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

  async gotoForScope(programId: string, subjectId: string) {
    await this.page.goto(
      `/institute/question-bank/library-linker?program=${encodeURIComponent(programId)}&subject=${encodeURIComponent(subjectId)}`,
    );
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(this.page.getByText(/current lane: shared library linker/i).first()).toBeVisible();
    await expect(
      this.page.getByText(/this page is not for editing wording|use this page only for intake/i).first(),
    ).toBeVisible();
  }

  async selectProgram(programLabel: RegExp) {
    await this.selectOptionByLabelPattern(this.page.getByRole("combobox", { name: /^program$/i }), programLabel);
  }

  async selectSubject(subjectLabel: RegExp) {
    const subjectSelect = this.page.getByRole("combobox", { name: /^subject$/i });
    let optionValue = await subjectSelect.locator("option").evaluateAll(
      (options, source) => {
        const expression = new RegExp(source.pattern, source.flags);
        const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
        return match ? (match as HTMLOptionElement).value : "";
      },
      { pattern: subjectLabel.source, flags: subjectLabel.flags },
    );

    if (!optionValue) {
      const loadTopicsButton = this.page.getByRole("button", { name: /load topics|show questions/i });
      if (await loadTopicsButton.count()) {
        await loadTopicsButton.first().click();
      }

      await expect
        .poll(
          async () =>
            subjectSelect.locator("option").evaluateAll(
              (options, source) => {
                const expression = new RegExp(source.pattern, source.flags);
                const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
                return match ? (match as HTMLOptionElement).value : "";
              },
              { pattern: subjectLabel.source, flags: subjectLabel.flags },
            ),
          {
            message: `Expected subject option matching ${subjectLabel} to become available`,
          },
        )
        .not.toBe("");

      optionValue = await subjectSelect.locator("option").evaluateAll(
        (options, source) => {
          const expression = new RegExp(source.pattern, source.flags);
          const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
          return match ? (match as HTMLOptionElement).value : "";
        },
        { pattern: subjectLabel.source, flags: subjectLabel.flags },
      );
    }

    expect(optionValue).toBeTruthy();
    await subjectSelect.selectOption(optionValue);
  }

  async loadTopics() {
    await this.page.getByRole("button", { name: /load topics|show questions/i }).click();
  }

  async expectSubjectSummary(subjectLabel: RegExp) {
    await expect(
      this.page.locator(".questionBankMetaChip").filter({
        hasText: new RegExp(`subject:\\s*${subjectLabel.source}`, subjectLabel.flags.includes("i") ? subjectLabel.flags : `${subjectLabel.flags}i`),
      }).first(),
    ).toBeVisible();
    await expect(this.page.getByText(/available in platform bank/i).first()).toBeVisible();
    await expect(this.page.getByText(/already linked locally/i).first()).toBeVisible();
    await expect(this.page.getByText(/not yet added/i).first()).toBeVisible();
  }

  async expectSubjectTotal(cardLabel: RegExp, expectedCount: number) {
    const resolvedPattern = this.resolveSummaryLabelPattern(cardLabel);
    const value = await this.page
      .locator(".questionBankCardMetaNoteCompact span")
      .filter({ hasText: resolvedPattern })
      .first()
      .innerText();
    expect(Number(value.replace(/[^\d]/g, ""))).toBeGreaterThanOrEqual(expectedCount);
  }
}
