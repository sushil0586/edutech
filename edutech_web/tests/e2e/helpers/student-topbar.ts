import { expect, type Page } from "@playwright/test";

export async function selectStudentWorkspaceContext(
  page: Page,
  options: {
    source: "all" | "platform" | "institute" | "teacher";
    subject: string;
  },
) {
  const sourceSelect = page.locator('label[aria-label="Dashboard source context"] select').first();
  await expect(sourceSelect).toBeVisible();
  await sourceSelect.selectOption(options.source);

  const subjectSelect = page.locator('label[aria-label="Dashboard subject context"] select').first();
  await expect(subjectSelect).toBeVisible();
  await subjectSelect.selectOption({ label: options.subject });
}

export async function expectStudentWorkspaceContext(
  page: Page,
  options: {
    source: string;
    subject: string;
  },
) {
  const sourceSelect = page.locator('label[aria-label="Dashboard source context"] select').first();
  const subjectSelect = page.locator('label[aria-label="Dashboard subject context"] select').first();

  await expect(sourceSelect).toHaveValue(new RegExp(`^${options.source}$`, "i"));
  await expect(subjectSelect).toHaveValue(new RegExp(`^${options.subject}$`, "i"));
  await expect(
    page.getByText(new RegExp(`source view\\s*[·-]\\s*${options.source}`, "i")).first(),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(`subject view\\s*[·-]\\s*${options.subject}`, "i")).first(),
  ).toBeVisible();
}
