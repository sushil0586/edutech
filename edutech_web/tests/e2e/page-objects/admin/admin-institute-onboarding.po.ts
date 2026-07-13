import { expect, type Page } from "@playwright/test";

export class AdminInstituteOnboardingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoMasterDefaults(instituteId: string) {
    await this.page.goto(`/admin/academic-setup?institute=${instituteId}&section=master-defaults`);
  }

  async assertLoaded(instituteId: string) {
    await expect(this.page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
    await expect(this.page).toHaveURL(new RegExp(`institute=${instituteId}(&|$)`));
    await expect(this.page.getByRole("combobox", { name: /select institute/i })).toHaveValue(instituteId);
    await expect(this.page.getByText(/master defaults/i).first()).toBeVisible();
    await expect(this.page.getByText(/onboarding profile defaults/i).first()).toBeVisible();
    await expect(this.page.getByRole("button", { name: /apply preset/i })).toBeVisible();
  }

  async setAcademicYear(name: string, start = "2033-04-01", end = "2034-03-31") {
    await this.page.getByLabel(/academic year name/i).fill(name);
    await this.page.getByLabel(/academic year start/i).fill(start);
    await this.page.getByLabel(/academic year end/i).fill(end);
  }

  async selectAcademicPreset(code: string) {
    await this.page.getByLabel(/academic preset/i).selectOption(code);
  }

  async selectApplyMode(mode: string) {
    await this.page.getByLabel(/apply mode/i).selectOption(mode);
  }

  async selectOnboardingProfile(code: string) {
    await this.page.getByLabel(/onboarding profile/i).selectOption(code);
  }

  async setQuestionBankAccess(mode: "enabled" | "disabled", packageCode?: string) {
    await this.page.getByLabel(/question-bank package access/i).selectOption(mode);
    if (mode === "enabled" && packageCode) {
      await this.page.getByLabel(/default question-bank package/i).selectOption(packageCode);
    }
  }

  async setQuestionLinkingMode(mode: string) {
    await this.page.getByLabel(/question linking mode/i).selectOption(mode);
  }

  async setAdvancedBuilderAccess(mode: "enabled" | "disabled") {
    await this.page.getByLabel(/advanced builder access/i).selectOption(mode);
  }

  async previewChanges() {
    await this.page.getByRole("button", { name: /preview changes/i }).click();
  }

  async applyPreset() {
    await this.page.getByRole("button", { name: /apply preset/i }).click();
  }

  async previewThenApply() {
    await this.previewChanges();
    await this.expectPreviewSummary();
    await this.applyPreset();
  }

  async expectPreviewSummary() {
    await expect(this.page.getByText(/preview summary/i).first()).toBeVisible();
  }

  async expectLastApplyResult() {
    const applyButton = this.page.getByRole("button", { name: /apply preset|applying\.\.\./i }).first();
    await expect(applyButton).toHaveText(/apply preset/i, { timeout: 60000 });
    await expect(this.page.getByText(/last apply result/i).first()).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByText(/onboarding applied to/i).first()).toBeVisible({ timeout: 60000 });
  }

  async expectOnboardingOutcomeSummary(instituteName: string) {
    const resultSection = this.page.locator("section.contentCard").filter({
      has: this.page.getByText(/last apply result/i).first(),
    }).first();
    const completionSummary = resultSection.getByTestId("onboarding-completion-summary");
    const recoveryActions = resultSection.getByTestId("onboarding-recovery-actions");
    await expect(completionSummary).toBeVisible();
    await expect(
      completionSummary.getByText(/ready for guided use|needs operator follow-up/i).first(),
    ).toBeVisible();
    await expect(completionSummary.getByText(/what is ready now/i).first()).toBeVisible();
    await expect(completionSummary.getByText(/still needs attention/i).first()).toBeVisible();
    await expect(recoveryActions).toBeVisible();
    await expect(recoveryActions.getByText(/best next operator actions/i).first()).toBeVisible();
    await expect(
      recoveryActions.getByRole("link", { name: /open question access|open exams|open people/i }).first(),
    ).toBeVisible();
    await expect(resultSection.getByText(/question usability after onboarding/i).first()).toBeVisible();
    await expect(resultSection.getByText(/operational health/i).first()).toBeVisible();
    await expect(resultSection.getByText(new RegExp(instituteName, "i")).first()).toBeVisible();
    await expect(resultSection.getByRole("link", { name: /open people/i }).first()).toBeVisible();
    await expect(resultSection.getByRole("link", { name: /open academic setup/i }).first()).toBeVisible();
    await expect(resultSection.getByRole("link", { name: /open question access/i }).first()).toBeVisible();
    await expect(resultSection.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
  }

  async expectReadySummary(instituteName: string) {
    await this.expectOnboardingOutcomeSummary(instituteName);
    await expect(this.page.getByTestId("onboarding-completion-summary").getByText(/ready for guided use/i)).toBeVisible();
  }

  async expectFollowUpSummary(instituteName: string) {
    await this.expectOnboardingOutcomeSummary(instituteName);
    await expect(this.page.getByTestId("onboarding-completion-summary").getByText(/needs operator follow-up/i)).toBeVisible();
  }

  async expectWarning(text: RegExp | string) {
    const warningStack = this.page.locator('[role="status"][aria-live="polite"]').first();
    await expect(warningStack).toBeVisible();
    await expect(warningStack.getByText(text).first()).toBeVisible();
  }
}
