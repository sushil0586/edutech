import { expect, Page } from "@playwright/test";

export class InstituteExamsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/institute/exams");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(this.page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(this.page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    const emptyStateHeading = this.page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expect(this.page.getByRole("link", { name: /start with quick create/i }).first()).toBeVisible();
      return;
    }

    const filteredEmptyHeading = this.page.getByText(/no exams match the current controls/i).first();
    if (await filteredEmptyHeading.isVisible().catch(() => false)) {
      await this.expectFilteredEmptyState();
      return;
    }

    const paginationOverflowHeading = this.page
      .getByText(/you are on a page that no longer has visible exams/i)
      .first();
    if (await paginationOverflowHeading.isVisible().catch(() => false)) {
      await this.expectPaginationOverflowState();
      return;
    }

    const loadIssueHeading = this.page.getByRole("heading", {
      name: /institute exams could not be loaded/i,
    });
    if (await loadIssueHeading.isVisible().catch(() => false)) {
      await expect(loadIssueHeading).toBeVisible();
      await expect(this.page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const configurationHeading = this.page.getByRole("heading", {
      name: /waiting for institute exams/i,
    });
    if (await configurationHeading.isVisible().catch(() => false)) {
      await expect(configurationHeading).toBeVisible();
      await expect(this.page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const guidanceCard = this.page
      .locator(".contentCard")
      .filter({ hasText: /how to use this workspace/i })
      .first();
    await expect(guidanceCard).toBeVisible();
    await expect(this.page.getByText(/visible on this page/i).first()).toBeVisible();
    await expect(this.page.getByText(/workspace total/i).first()).toBeVisible();
    await expect(this.page.getByText(/^page size: /i).first()).toBeVisible();
  }

  async applyStatusSortAndGroup(status: string, sort: string, group: string) {
    const statusSelect = this.page.locator('select[name="exam_status"]').first();
    const sortSelect = this.page.locator('select[name="exam_sort"]').first();
    const groupSelect = this.page.locator('select[name="exam_group"]').first();

    const filtersVisible = await statusSelect.isVisible().catch(() => false);
    if (!filtersVisible) {
      return false;
    }

    await statusSelect.selectOption(status);
    await sortSelect.selectOption(sort);
    await groupSelect.selectOption(group);
    await this.page.getByRole("button", { name: /apply filters/i }).click();
    return true;
  }

  async applyTeacher(teacherLabel: RegExp) {
    const teacherSelect = this.page.locator('select[name="teacher"]').first();
    const filtersVisible = await teacherSelect.isVisible().catch(() => false);
    if (!filtersVisible) {
      return false;
    }

    const optionLabels = await teacherSelect.locator("option").allTextContents();
    const match = optionLabels.find((label) => teacherLabel.test(label));
    if (!match) {
      return false;
    }

    await teacherSelect.selectOption({ label: match });
    await this.page.getByRole("button", { name: /apply filters/i }).click();
    return true;
  }

  async goNextPageIfAvailable() {
    const nextButton = this.page.getByRole("link", { name: /^next$/i }).first();
    const visible = await nextButton.isVisible().catch(() => false);
    if (!visible) {
      return false;
    }

    await nextButton.click();
    return true;
  }

  async expectFilteredEmptyState() {
    await expect(
      this.page.getByText(/no exams match the current controls/i).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: /clear all controls and show all exams/i }).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: /keep these controls and return to page 1/i }).first(),
    ).toBeVisible();
  }

  async expectPaginationOverflowState() {
    await expect(
      this.page.getByText(/you are on a page that no longer has visible exams/i).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: /return to page 1 with the same controls/i }).first(),
    ).toBeVisible();
  }

  async resetFilters() {
    await this.page.getByRole("link", { name: /reset filters/i }).click();
  }
}
