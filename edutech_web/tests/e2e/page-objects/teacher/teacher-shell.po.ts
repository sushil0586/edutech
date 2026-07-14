import { expect, Page } from "@playwright/test";

export class TeacherShellPage {
  constructor(private readonly page: Page) {}

  async expectWorkspace() {
    await expect(this.page).toHaveURL(/\/teacher\//);
    await expect(this.page.getByText(/teacher portal/i).first()).toBeVisible();
  }

  async expectSidebar() {
    await expect(this.page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
    await expect(this.page.getByRole("link", { name: /question bank/i }).first()).toBeVisible();
  }

  async openSidebarRoute(linkName: RegExp, expectedUrl: RegExp) {
    await this.page.getByRole("link", { name: linkName }).first().click();
    await expect(this.page).toHaveURL(expectedUrl);
  }
}
