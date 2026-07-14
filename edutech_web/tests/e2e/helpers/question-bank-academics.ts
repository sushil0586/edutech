import { expect, type Locator, type Page } from "@playwright/test";

export async function getNonEmptyOptionValues(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
}

export async function findOptionValueByLabelPattern(locator: Locator, pattern: RegExp) {
  return locator.locator("option").evaluateAll(
    (options, source) => {
      const expression = new RegExp(source.pattern, source.flags);
      const match = options.find((option) => expression.test((option as HTMLOptionElement).label));
      return match ? (match as HTMLOptionElement).value : "";
    },
    { pattern: pattern.source, flags: pattern.flags },
  );
}

export async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => locator.locator("option").count()).toBeGreaterThan(0);
}

async function waitForAcademicsResponse(
  page: Page,
  pathFragment: "subjects" | "topics",
  expectedQuery: Record<string, string>,
) {
  return page.waitForResponse((response) => {
    if (!response.ok()) {
      return false;
    }

    const url = new URL(response.url());
    if (!url.pathname.includes(`/academics/${pathFragment}`)) {
      return false;
    }

    for (const [key, value] of Object.entries(expectedQuery)) {
      if (url.searchParams.get(key) !== value) {
        return false;
      }
    }

    return true;
  });
}

export async function expectQuestionBankAcademicDependencyChain(page: Page) {
  const filterForm = page.getByTestId("question-bank-filter-form").first();
  const programSelect = filterForm.getByTestId("question-bank-program-filter");
  const subjectSelect = filterForm.getByTestId("question-bank-subject-filter");
  const topicSelect = filterForm.getByTestId("question-bank-topic-filter");

  await expectSelectHasOptions(programSelect);

  const programs = await getNonEmptyOptionValues(programSelect);
  expect(programs.length).toBeGreaterThan(0);

  const preferredProgram =
    (await findOptionValueByLabelPattern(programSelect, /class 7/i)) || programs[0]!;
  const candidatePrograms = [preferredProgram, ...programs.filter((program) => program !== preferredProgram)];

  for (const selectedProgram of candidatePrograms) {
    const subjectsResponse = waitForAcademicsResponse(page, "subjects", {
      is_active: "true",
      program: selectedProgram,
      page_size: "500",
    });
    await programSelect.selectOption(selectedProgram);
    await expect.poll(async () => programSelect.inputValue()).toBe(selectedProgram);
    await subjectsResponse;
    await expect
      .poll(async () => subjectSelect.evaluate((element) => !(element as HTMLSelectElement).disabled))
      .toBe(true);
    await expect.poll(async () => getNonEmptyOptionValues(subjectSelect).then((values) => values.length)).toBeGreaterThan(
      0,
    );

    const subjects = await getNonEmptyOptionValues(subjectSelect);
    if (!subjects.length) {
      continue;
    }

    const preferredSubject =
      (await findOptionValueByLabelPattern(subjectSelect, /math/i)) || subjects[0]!;
    const candidateSubjects = [preferredSubject, ...subjects.filter((subject) => subject !== preferredSubject)];

    for (const selectedSubject of candidateSubjects) {
      const topicsResponse = waitForAcademicsResponse(page, "topics", {
        is_active: "true",
        subject: selectedSubject,
        page_size: "500",
      });
      await subjectSelect.selectOption(selectedSubject);
      await expect.poll(async () => subjectSelect.inputValue()).toBe(selectedSubject);
      await topicsResponse;
      await expect
        .poll(async () => topicSelect.evaluate((element) => !(element as HTMLSelectElement).disabled))
        .toBe(true);
      await expect
        .poll(async () => getNonEmptyOptionValues(topicSelect).then((values) => values.length))
        .toBeGreaterThan(0);

      const topics = await getNonEmptyOptionValues(topicSelect);
      if (!topics.length) {
        continue;
      }

      const selectedTopic = topics[0]!;
      await topicSelect.selectOption(selectedTopic);
      await expect.poll(async () => topicSelect.inputValue()).toBe(selectedTopic);

      return {
        programSelect,
        subjectSelect,
        topicSelect,
        programs,
        subjects,
        selectedProgram,
        selectedSubject,
        selectedTopic,
        topics,
      };
    }
  }

  throw new Error("No program exposed subject and topic options for the question bank filters.");
}
