import { expect, Page } from "@playwright/test";

export class InstituteDashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/institute/dashboard");
  }

  async expectLoaded() {
    await expect(this.page.getByText(/institute control/i).first()).toBeVisible();
    await expect(this.page.getByText(/dashboard focus/i).first()).toBeVisible();
  }

  async applyFocus(focus: string, sort: string) {
    await this.page.locator('select[name="focus"]').first().selectOption(focus);
    await this.page.locator('select[name="sort"]').first().selectOption(sort);
    await this.page.getByRole("button", { name: /apply filters/i }).click();
  }
}
