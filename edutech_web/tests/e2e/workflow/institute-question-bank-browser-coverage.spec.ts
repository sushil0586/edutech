import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import {
  expectQuestionBankAcademicDependencyChain,
  findOptionValueByLabelPattern,
  expectSelectHasOptions,
  getNonEmptyOptionValues,
} from "../helpers/question-bank-academics";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function selectProgramWithSubjectOptions(page: Page) {
  const programs = await getNonEmptyOptionValues(programSelect(page));
  if (programs.length === 0) {
    return null;
  }

  const preferredProgram = await findOptionValueByLabelPattern(programSelect(page), /^class 7$/i);
  const candidatePrograms = [
    ...(preferredProgram ? [preferredProgram] : []),
    ...programs.filter((program) => program !== preferredProgram),
  ];

  for (const program of candidatePrograms) {
    const subjectsResponse = page.waitForResponse((response) => {
      if (!response.ok()) {
        return false;
      }

      const url = new URL(response.url());
      return (
        url.pathname.includes("/academics/subjects") &&
        url.searchParams.get("is_active") === "true" &&
        url.searchParams.get("program") === program &&
        url.searchParams.get("page_size") === "500"
      );
    }).catch(() => null);
    await programSelect(page).selectOption(program);
    await subjectsResponse;
    await expect(subjectSelect(page)).toBeEnabled();

    const subjects = await getNonEmptyOptionValues(subjectSelect(page));
    if (!subjects.length) {
      continue;
    }

    for (const subject of subjects) {
      const preferredSubject =
        (await findOptionValueByLabelPattern(subjectSelect(page), /math/i)) || subject;
      const topicsResponse = page.waitForResponse((response) => {
        if (!response.ok()) {
          return false;
        }

        const url = new URL(response.url());
        return (
          url.pathname.includes("/academics/topics") &&
          url.searchParams.get("is_active") === "true" &&
          url.searchParams.get("subject") === preferredSubject &&
          url.searchParams.get("page_size") === "500"
        );
      }).catch(() => null);
      await subjectSelect(page).selectOption(preferredSubject);
      await topicsResponse;
      await expect(topicSelect(page)).toBeEnabled();

      const topics = await getNonEmptyOptionValues(topicSelect(page));
      if (topics.length > 0) {
        const selectedTopic = topics[0]!;
        await topicSelect(page).selectOption(selectedTopic);
        await expect(topicSelect(page)).toHaveValue(selectedTopic);
        return { program, subject: preferredSubject, topic: selectedTopic, subjects, topics };
      }
    }
  }

  return null;
}

function searchField(page: Page) {
  return page.getByTestId("question-bank-search-input");
}

function qualitySelect(page: Page) {
  return page.getByTestId("question-bank-quality-filter");
}

function revisionSelect(page: Page) {
  return page.getByTestId("question-bank-revision-filter");
}

function programSelect(page: Page) {
  return page.getByTestId("question-bank-program-filter");
}

function subjectSelect(page: Page) {
  return page.getByTestId("question-bank-subject-filter");
}

function topicSelect(page: Page) {
  return page.getByTestId("question-bank-topic-filter");
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

    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
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

  test("@workflow browser coverage hydrates subjects and topics immediately when academic filters change", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank", 8);
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const academicChain = await expectQuestionBankAcademicDependencyChain(page);

    await page.getByRole("button", { name: /update view/i }).click();
    await expect(page).toHaveURL(/\/institute\/question-bank\?/);
    await expect(programSelect(page)).toHaveValue(academicChain.selectedProgram);
    await expect(subjectSelect(page)).toHaveValue(academicChain.selectedSubject);
    await expect(topicSelect(page)).toHaveValue(academicChain.selectedTopic);
  });

  test("@workflow browser coverage proves academic filter dependency and reset truth", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank", 8);
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();

    const resolvedAcademicPath = await selectProgramWithSubjectOptions(page);

    let selectedProgram: string | null = null;
    let selectedSubject: string | null = null;

    if (resolvedAcademicPath) {
      const { program, subject, topic } = resolvedAcademicPath;
      selectedProgram = program;
      selectedSubject = subject;
      await subjectSelect(page).selectOption(subject);
      await expect(topicSelect(page)).toBeEnabled();
      await expect.poll(async () => getNonEmptyOptionValues(topicSelect(page)).then((values) => values.length)).toBeGreaterThan(
        0,
      );
      await expect(topicSelect(page)).toHaveValue("");
      await topicSelect(page).selectOption(topic);
      await expect(topicSelect(page)).toHaveValue(topic);
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
    await page.getByRole("button", { name: /update view/i }).click();

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
    await gotoWithRuntimeRecovery(page, "/institute/question-bank", 8);
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();

    await searchField(page).fill("playwright-no-match-zzqv-1781");
    await qualitySelect(page).selectOption("skip_risk");
    const missingExplanation = page.getByLabel(/missing explanation/i);
    if (await missingExplanation.isChecked()) {
      await missingExplanation.uncheck();
    }
    await expect(missingExplanation).not.toBeChecked();
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/playwright-no-match-zzqv-1781/);
    await expect(page.getByText(/no questions match these filters/i).first()).toBeVisible();
    await expect(page.getByText(/active controls are shaping this empty state/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^reset filters$/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /^reset filters$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?page=1)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(searchField(page)).toHaveValue("");
    await expect(qualitySelect(page)).toHaveValue("");
  });

  test("@workflow browser coverage keeps shared-library intake guidance alive under filtered question-bank views", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank?search=algebra&quality_signal=ambiguous", 8);
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();
    await expect(
      page.getByText(/institute admins complete the final intake step from shared library linker/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();
    await expect(searchField(page)).toHaveValue("algebra");
    await expect(qualitySelect(page)).toHaveValue("ambiguous");
  });
});
