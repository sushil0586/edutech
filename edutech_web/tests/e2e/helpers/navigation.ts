import { expect, Page } from "@playwright/test";

export async function expectAdminWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}

export async function expectTeacherWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/teacher\//);
}

export async function expectInstituteWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/institute\//);
}

export async function expectStudentWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\//);
}

export async function openPathAndConfirm(page: Page, path: string, headingPattern: RegExp) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: headingPattern }).first()).toBeVisible();
}
