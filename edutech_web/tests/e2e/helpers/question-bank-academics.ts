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

export async function selectOptionStartingWithLabel(locator: Locator, label: string) {
  const normalizedLabel = label.trim().toLowerCase();
  const optionValue = await locator.locator("option").evaluateAll((options, expectedLabel) => {
    const match = options.find((option) => {
      const optionLabel = ((option as HTMLOptionElement).label || option.textContent || "").trim().toLowerCase();
      return optionLabel === expectedLabel || optionLabel.startsWith(`${expectedLabel} `);
    });
    return match ? (match as HTMLOptionElement).value : "";
  }, normalizedLabel);
  expect(optionValue).not.toBe("");
  await locator.selectOption(optionValue);
  await expect.poll(async () => locator.inputValue()).toBe(optionValue);
  return optionValue;
}

async function getNonEmptyOptionEntries(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        label: option.textContent?.trim() ?? (option as HTMLOptionElement).label,
        value: (option as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
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
  return page
    .waitForResponse(
      (response) => {
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
      },
      { timeout: 5000 },
    )
    .catch(() => null);
}

export async function expectQuestionBankAcademicDependencyChain(page: Page) {
  const filterForm = page.getByTestId("question-bank-filter-form").first();
  const programSelect = filterForm.getByTestId("question-bank-program-filter");
  const subjectSelect = filterForm.getByTestId("question-bank-subject-filter");
  const topicSelect = filterForm.getByTestId("question-bank-topic-filter");

  await expectSelectHasOptions(programSelect);

  const programs = await getNonEmptyOptionValues(programSelect);
  expect(programs.length).toBeGreaterThan(0);

  const programEntries = await getNonEmptyOptionEntries(programSelect);
  const preferredPrograms = programEntries
    .filter((program) => /^class 7$/i.test(program.label) || /class 7(?!\s*cbse)/i.test(program.label))
    .map((program) => program.value);
  const candidatePrograms = [
    ...preferredPrograms,
    ...programs.filter((program) => !preferredPrograms.includes(program)),
  ];

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

export async function selectAcademicDependencyChain(
  page: Page,
  {
    programSelect,
    subjectSelect,
    topicSelect,
    preferredProgramValue,
    preferredProgramLabel,
  }: {
    programSelect: Locator;
    subjectSelect: Locator;
    topicSelect: Locator;
    preferredProgramValue?: string | null;
    preferredProgramLabel?: string | null;
  },
) {
  await expectSelectHasOptions(programSelect);

  const programs = await getNonEmptyOptionValues(programSelect);
  expect(programs.length).toBeGreaterThan(0);

  const programEntries = await getNonEmptyOptionEntries(programSelect);
  const labelPreference = preferredProgramLabel?.trim().toLowerCase() ?? "";
  const preferredProgramsFromLabel = labelPreference
    ? programEntries
        .filter((program) => {
          const label = program.label.trim().toLowerCase();
          return label === labelPreference || label.startsWith(`${labelPreference} `);
        })
        .map((program) => program.value)
    : [];
  const preferredPrograms = programEntries
    .filter((program) => /^class 7$/i.test(program.label) || /class 7(?!\s*cbse)/i.test(program.label))
    .map((program) => program.value);
  const preferredValue = preferredProgramValue?.trim() || "";
  const candidatePrograms = [
    ...(preferredValue ? [preferredValue] : []),
    ...preferredProgramsFromLabel,
    ...preferredPrograms,
    ...programs,
  ].filter((program, index, values) =>
    program.trim().length > 0 && values.indexOf(program) === index,
  );

  for (const selectedProgram of candidatePrograms) {
    if (!programs.includes(selectedProgram)) {
      continue;
    }
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

      const topics = await getNonEmptyOptionValues(topicSelect);
      if (!topics.length) {
        continue;
      }

      const selectedTopic = topics[0]!;
      await topicSelect.selectOption(selectedTopic);
      await expect.poll(async () => topicSelect.inputValue()).toBe(selectedTopic);

      return {
        selectedProgram,
        selectedSubject,
        selectedTopic,
      };
    }
  }

  throw new Error("No program exposed subject and topic options for the selected academic controls.");
}

export async function fetchStudentAcademicContext(page: Page, backendBaseUrl: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(accessToken).not.toBe("");

  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    student_context?: {
      program_name?: string | null;
      academic_year_name?: string | null;
    } | null;
  };

  return {
    programName: payload.student_context?.program_name?.trim() || null,
    academicYearName: payload.student_context?.academic_year_name?.trim() || null,
  };
}
