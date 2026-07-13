import { expect, type Locator, type Page } from "@playwright/test";
import { loginAsRole } from "./auth";
import { getRoleCredentials } from "../fixtures/env";
import { expectStudentWorkspace } from "./navigation";

export type StudentProfileScope = {
  displayName: string;
  programName: string | null;
  cohortName: string | null;
  academicYearName: string | null;
};

async function readDetailCardValue(page: Page, label: RegExp) {
  const card = page.locator(".detailCard").filter({
    has: page.getByText(label),
  }).first();
  if (!(await card.count())) {
    return null;
  }
  const value = (await card.locator("strong").first().textContent())?.trim() ?? "";
  return value.length > 0 && value.toLowerCase() !== "not available" ? value : null;
}

export async function resolveStudentProfileScope(page: Page): Promise<StudentProfileScope> {
  const studentCredentials = getRoleCredentials("student");
  expect(studentCredentials).not.toBeNull();

  let displayName = studentCredentials!.username;
  await loginAsRole(page, "student");
  await expectStudentWorkspace(page);

  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();

  const renderedName = await readDetailCardValue(page, /^name$/i);
  if (renderedName) {
    displayName = renderedName;
  }

  return {
    displayName,
    programName: await readDetailCardValue(page, /^program$/i),
    cohortName: await readDetailCardValue(page, /^cohort$/i),
    academicYearName: await readDetailCardValue(page, /^academic year$/i),
  };
}

export async function selectOptionByLabelFragment(locator: Locator, expectedLabel: string) {
  const option = await locator.locator("option").evaluateAll(
    (options, target) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label,
        }))
        .find(
          (option) =>
            option.value.trim().length > 0 &&
            option.label.toLowerCase().includes(String(target).trim().toLowerCase()),
        ) ?? null,
    expectedLabel,
  );
  expect(option).not.toBeNull();
  await locator.selectOption(option!.value);
}
