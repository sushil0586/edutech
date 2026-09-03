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
  const sourceLockedToAll =
    (await sourceSelect.isDisabled().catch(() => false)) &&
    ((await sourceSelect.inputValue().catch(() => "")) || "").toLowerCase() === "all";
  if (!sourceLockedToAll) {
    await expect(sourceSelect).toHaveValue(new RegExp(`^${options.source}$`, "i"));
  }

  const subjectSelect = page.locator('label[aria-label="Dashboard subject context"] select').first();
  await expect(subjectSelect).toBeVisible();
  await subjectSelect.selectOption({ label: options.subject });
  const subjectLockedToOverall =
    (await subjectSelect.isDisabled().catch(() => false)) &&
    ((await subjectSelect.inputValue().catch(() => "")) || "").toLowerCase() === "overall";
  if (!subjectLockedToOverall) {
    await expect(subjectSelect).toHaveValue(new RegExp(`^${options.subject}$`, "i"));
  }
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

  const sourceValue = ((await sourceSelect.inputValue().catch(() => "")) || "").toLowerCase();
  const sourceLockedToAll =
    (await sourceSelect.isDisabled().catch(() => false)) && sourceValue === "all";
  if (!sourceLockedToAll) {
    await expect(sourceSelect).toHaveValue(new RegExp(`^${options.source}$`, "i"));
  }
  const subjectValue = ((await subjectSelect.inputValue().catch(() => "")) || "").toLowerCase();
  const subjectLockedToOverall =
    (await subjectSelect.isDisabled().catch(() => false)) && subjectValue === "overall";
  if (!subjectLockedToOverall) {
    await expect(subjectSelect).toHaveValue(new RegExp(`^${options.subject}$`, "i"));
  }
  if (!sourceLockedToAll) {
    await expect(
      page.getByText(new RegExp(`source view\\s*[·-]\\s*${options.source}`, "i")).first(),
    ).toBeVisible();
  }
  if (!subjectLockedToOverall) {
    await expect(
      page.getByText(new RegExp(`subject view\\s*[·-]\\s*${options.subject}`, "i")).first(),
    ).toBeVisible();
  }
}
