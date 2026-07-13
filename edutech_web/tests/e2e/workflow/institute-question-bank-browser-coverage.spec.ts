import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function getNonEmptyOptionValues(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

async function selectProgramWithSubjectOptions(page: Page) {
  const programs = await getNonEmptyOptionValues(programSelect(page));
  if (programs.length === 0) {
    return null;
  }

  for (const program of programs) {
    await programSelect(page).selectOption(program);
    await expect(subjectSelect(page)).toBeEnabled();

    const subjects = await getNonEmptyOptionValues(subjectSelect(page));
    if (subjects.length > 0) {
      return { program, subjects };
    }
  }

  return null;
}

function searchField(page: Page) {
  return page.getByRole("textbox", { name: /search question text/i });
}

function qualitySelect(page: Page) {
  return page.getByRole("combobox", { name: /quality signal/i });
}

function revisionSelect(page: Page) {
  return page.getByRole("combobox", { name: /revision priority/i });
}

function programSelect(page: Page) {
  return page.getByRole("combobox", { name: /^program$/i });
}

function subjectSelect(page: Page) {
  return page.getByRole("combobox", { name: /^subject$/i });
}

function topicSelect(page: Page) {
  return page.getByRole("combobox", { name: /^topic$/i });
}

test.describe("Institute question bank browser functionality coverage", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute question-bank filter controls hydrated", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank");

    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();

    await expect(searchField(page)).toBeVisible();
    await expectSelectHasOptions(programSelect(page));
    await expectSelectHasOptions(subjectSelect(page));
    await expectSelectHasOptions(topicSelect(page));
    await expectSelectHasOptions(qualitySelect(page));
    await expectSelectHasOptions(revisionSelect(page));

    await expect(programSelect(page)).toHaveValue("");
    await expect(subjectSelect(page)).toHaveValue("");
    await expect(topicSelect(page)).toHaveValue("");
    await expect(qualitySelect(page)).toHaveValue("");
    await expect(revisionSelect(page)).toHaveValue("");
  });

  test("@workflow browser coverage proves academic filter dependency and reset truth", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank");

    const resolvedAcademicPath = await selectProgramWithSubjectOptions(page);

    let selectedProgram: string | null = null;
    let selectedSubject: string | null = null;

    if (resolvedAcademicPath) {
      const { program, subjects } = resolvedAcademicPath;
      selectedProgram = program;
      selectedSubject = subjects[0];
      await subjectSelect(page).selectOption(subjects[0]);
      await expect(topicSelect(page)).toBeEnabled();
    } else {
      await expect(subjectSelect(page)).toBeDisabled();
      await expect(topicSelect(page)).toBeDisabled();
    }

    const topics = await getNonEmptyOptionValues(topicSelect(page));
    if (topics.length > 0) {
      await topicSelect(page).selectOption(topics[0]);
      await expect(topicSelect(page)).toHaveValue(topics[0]);
    }

    await qualitySelect(page).selectOption("ambiguous");
    await revisionSelect(page).selectOption("high");
    await searchField(page).fill("pythagoras");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/institute\/question-bank\?/);
    await expect(searchField(page)).toHaveValue("pythagoras");
    if (selectedProgram) {
      await expect(programSelect(page)).toHaveValue(selectedProgram);
    }
    if (selectedSubject) {
      await expect(subjectSelect(page)).toHaveValue(selectedSubject);
    }
    await expect(qualitySelect(page)).toHaveValue("ambiguous");
    await expect(revisionSelect(page)).toHaveValue("high");

    await page.getByRole("button", { name: /^reset$/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?page=1)?$/);
    await expect(searchField(page)).toHaveValue("");
    await expect(programSelect(page)).toHaveValue(/.*/);
    await expect(subjectSelect(page)).toHaveValue("");
    await expect(topicSelect(page)).toHaveValue("");
    await expect(qualitySelect(page)).toHaveValue("");
    await expect(revisionSelect(page)).toHaveValue("");
  });

  test("@workflow browser coverage proves empty-state diagnosis stays distinct from normal loaded state", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank");

    await searchField(page).fill("playwright-no-match-zzqv-1781");
    await qualitySelect(page).selectOption("skip_risk");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByText(/active controls are shaping this empty state/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /reset filters and show all questions/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters and show all questions/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?page=1)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(searchField(page)).toHaveValue("");
    await expect(qualitySelect(page)).toHaveValue("");
  });

  test("@workflow browser coverage keeps shared-library intake guidance alive under filtered question-bank views", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank?search=algebra&quality_signal=ambiguous");

    await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();
    await expect(
      page.getByText(/institute admins complete the final intake step from shared library linker/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();
    await expect(searchField(page)).toHaveValue("algebra");
    await expect(qualitySelect(page)).toHaveValue("ambiguous");
  });
});
