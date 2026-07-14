import { expect, type Locator, type Page } from "@playwright/test";

import { loginWithCredentials, type DirectLoginCredentials } from "./auth";
import {
  fetchAuthProfile,
  fetchPrograms,
  fetchSubjects,
  fetchTopics,
} from "./assessment-family";
import { gotoWithRuntimeRecovery } from "./runtime";

type WorkspaceExpectation = (page: Page) => Promise<void>;

export async function selectFirstRealOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        disabled: (node as HTMLOptionElement).disabled,
      }))
      .filter((option) => option.value && !option.disabled),
  );
  expect(options.length).toBeGreaterThan(0);
  await locator.selectOption(options[0]!.value);
}

export async function openAdvancedBuilder(
  page: Page,
  options: {
    credentials: DirectLoginCredentials;
    role: "teacher" | "institute";
    path: string;
    expectWorkspace: WorkspaceExpectation;
  },
) {
  await loginWithCredentials(page, options.credentials, options.role);
  await options.expectWorkspace(page);
  await gotoWithRuntimeRecovery(page, options.path, 8);
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
}

export async function resolveScopeWithTopics(page: Page) {
  const authProfile = await fetchAuthProfile(page);
  const programs = await fetchPrograms(page, authProfile.institute);

  for (const program of programs) {
    const subjects = await fetchSubjects(page, program.id, authProfile.institute);
    for (const subject of subjects) {
      const topics = await fetchTopics(page, subject.id, authProfile.institute);
      if (topics.length > 0) {
        return {
          academicYearName: "2026-2027",
          programId: program.id,
          programName: program.name,
          subjectId: subject.id,
          subjectName: subject.name,
        };
      }
    }
  }

  throw new Error("No advanced-builder scope with active topics was found.");
}

export async function resolveClass7MathScope(page: Page) {
  const authProfile = await fetchAuthProfile(page);
  const programs = await fetchPrograms(page, authProfile.institute);
  const program = programs.find((entry) => entry.name === "Class 7") ?? programs[0] ?? null;
  if (!program) {
    throw new Error("No program was available for advanced-builder visual testing.");
  }

  const subjects = await fetchSubjects(page, program.id, authProfile.institute);
  const subject = subjects.find((entry) => entry.name === "Math") ?? subjects[0] ?? null;
  if (!subject) {
    throw new Error("No subject was available for advanced-builder visual testing.");
  }

  return {
    academicYearName: "2026-2027",
    programId: program.id,
    subjectId: subject.id,
  };
}

export async function applyResolvedScope(
  page: Page,
  scope: {
    academicYearName: string;
    programId: string;
    subjectId: string;
  },
) {
  const academicYearSelect = page.getByRole("combobox", { name: /academic year/i }).first();
  const programSelect = page.getByRole("combobox", { name: /^program/i }).first();
  const primarySubjectSelect = page.getByRole("combobox", { name: /^primary subject/i }).first();

  const hasCanonicalAcademicYear = await academicYearSelect.evaluate((element, expectedLabel) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).some((option) => option.label.trim() === expectedLabel);
  }, scope.academicYearName);
  if (hasCanonicalAcademicYear) {
    await academicYearSelect.selectOption({ label: scope.academicYearName });
  } else {
    await selectFirstRealOption(academicYearSelect);
  }

  await programSelect.selectOption(scope.programId);
  await expect
    .poll(async () => primarySubjectSelect.locator("option").count(), {
      timeout: 30000,
      message: "Expected the primary subject selector to hydrate after program selection.",
    })
    .toBeGreaterThan(1);
  await primarySubjectSelect.selectOption(scope.subjectId);
  await expect(primarySubjectSelect).toHaveValue(scope.subjectId);
}

export async function applyBuilderTemplate(
  page: Page,
  templateName: RegExp,
  successMessage: RegExp,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.getByRole("button", { name: templateName }).click();
    const successVisible = await page.getByText(successMessage).first().isVisible({ timeout: 750 }).catch(() => false);
    if (successVisible) {
      return;
    }
    await page.waitForTimeout(500);
  }

  await expect(page.getByText(successMessage).first()).toBeVisible();
}

export async function trimCompositionToSingleTopic(page: Page) {
  const selectionMode = page.getByLabel(/selection mode/i);
  await selectionMode.selectOption("subject_fallback");

  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/question count/i).fill("1");

  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }

  const firstTopicRow = firstSectionCard.locator(".advancedBuilderTopicRow").first();
  await firstTopicRow.locator('input[type="number"]').fill("1");

  const topicSelect = firstTopicRow.locator("select");
  await expect
    .poll(async () => topicSelect.locator("option").count(), {
      timeout: 30000,
      message: "Expected the section topic selector to hydrate with active topics.",
    })
    .toBeGreaterThan(1);
  await topicSelect.selectOption({ index: 1 });
}
