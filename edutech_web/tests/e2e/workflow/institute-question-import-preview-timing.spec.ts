import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

type TimingMetric = {
  label: string;
  elapsedMs: number;
};

function firstNonEmptyOption(options: Array<{ value: string; label: string }>) {
  return options.find((option) => option.value.trim().length > 0) ?? null;
}

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

async function waitForFirstNonEmptyOption(
  page: Page,
  selector: string,
  options?: {
    timeoutMs?: number;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 10000;

  await expect
    .poll(
      async () => {
        const values = await page.locator(`${selector} option`).evaluateAll((nodes) =>
          nodes
            .map((node) => ({
              value: (node as HTMLOptionElement).value,
              label: (node as HTMLOptionElement).label.trim(),
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        return values[0] ?? null;
      },
      { timeout: timeoutMs },
    )
    .not.toBeNull();

  const optionsSnapshot = await page.locator(`${selector} option`).evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );

  return firstNonEmptyOption(optionsSnapshot);
}

async function expectInstituteImportBlockedState(page: Page) {
  const pageText = await page.locator("body").innerText();
  if (!/question-bank bulk import is not enabled for (your|this) institute yet/i.test(pageText)) {
    return false;
  }

  await expect(page.getByText(/feature entitlement required/i)).toBeVisible();
  await expect(page.getByText(/subscription controlled/i)).toBeVisible();
  return true;
}

async function resolveImportScopeFromQuestionAuthoring(page: Page) {
  await page.goto("/institute/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programOptions = await page.locator('select[name="program"] option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const programOption = firstNonEmptyOption(programOptions);
  expect(programOption).not.toBeNull();
  await page.locator('select[name="program"]').selectOption(programOption!.value);

  await waitForFirstNonEmptyOption(page, 'select[name="subject"]');
  const subjectOptions = await page.locator('select[name="subject"] option').evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const candidateSubjects = subjectOptions.filter((option) => option.value.trim().length > 0);

  let selectedSubject: { value: string; label: string } | null = null;
  let selectedTopic: { value: string; label: string } | null = null;

  for (const subjectOption of candidateSubjects) {
    await page.locator('select[name="subject"]').selectOption(subjectOption.value);
    const topicOption = await waitForFirstNonEmptyOption(page, 'select[name="topic"]', {
      timeoutMs: 1500,
    }).catch(() => null);
    if (topicOption) {
      selectedSubject = subjectOption;
      selectedTopic = topicOption;
      break;
    }
  }

  if (!selectedSubject && candidateSubjects.length > 0) {
    selectedSubject = candidateSubjects[0]!;
    await page.locator('select[name="subject"]').selectOption(selectedSubject.value);
  }

  expect(selectedSubject).not.toBeNull();

  return {
    subjectName: normalizeAcademicLabel(selectedSubject!.label),
    topicName: selectedTopic ? normalizeAcademicLabel(selectedTopic.label) : "",
  };
}

function buildImportCsv(scope: { subjectName: string; topicName: string }, rowCount: number) {
  const columns = [
    "subject",
    "topic",
    "passage_title",
    "passage_order",
    "question_type",
    "difficulty_level",
    "question_text",
    "assertion_text",
    "reason_text",
    "matrix_left_items",
    "matrix_right_items",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_answer",
    "accepted_answers",
    "numeric_tolerance",
    "review_guidance",
    "default_marks",
    "negative_marks",
    "explanation",
    "tags",
  ];

  const rows = [columns.join(",")];
  const batchToken = `${Date.now()}`;

  for (let index = 1; index <= rowCount; index += 1) {
    const row = {
      subject: scope.subjectName,
      topic: scope.topicName,
      passage_title: "",
      passage_order: "",
      question_type: "mcq_single",
      difficulty_level: "foundation",
      question_text: `Stage institute import timing question ${batchToken}-${rowCount}-${index}`,
      assertion_text: "",
      reason_text: "",
      matrix_left_items: "",
      matrix_right_items: "",
      option_1: "Amazon S3",
      option_2: "Amazon EC2",
      option_3: "Amazon RDS",
      option_4: "Amazon Route 53",
      correct_answer: "1",
      accepted_answers: "",
      numeric_tolerance: "",
      review_guidance: "",
      default_marks: "1.00",
      negative_marks: "0.00",
      explanation: "Amazon S3 is AWS object storage.",
      tags: `playwright-import-${rowCount}|aws`,
    };

    rows.push(columns.map((column) => escapeCsvValue(row[column as keyof typeof row] ?? "")).join(","));
  }

  return {
    csv: rows.join("\n"),
    firstQuestionText: `Stage institute import timing question ${batchToken}-${rowCount}-1`,
  };
}

async function measurePreviewTiming(args: {
  page: Page;
  rowCount: number;
  filePath: string;
  firstQuestionText: string;
  metrics: TimingMetric[];
}) {
  await args.page.goto("/institute/question-bank/import");
  await expect(args.page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();

  const throttledBanner = args.page.getByText(/request was throttled/i).first();
  if (await throttledBanner.isVisible().catch(() => false)) {
    test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
  }

  await expect(args.page.getByTestId("question-import-file-input")).toBeVisible();
  await args.page.getByTestId("question-import-file-input").setInputFiles(args.filePath);

  const start = Date.now();
  await args.page.getByRole("button", { name: /preview import/i }).click();

  const previewOutcome = await Promise.race([
    args.page
      .getByText(/preview generated\./i)
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .then(() => "preview"),
    throttledBanner.waitFor({ state: "visible", timeout: 20000 }).then(() => "throttled"),
  ]).catch(() => "timeout");

  if (previewOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
    test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
  }

  await expect(args.page.getByText(new RegExp(args.firstQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();

  args.metrics.push({
    label: `institute-question-import-preview-${args.rowCount}`,
    elapsedMs: Date.now() - start,
  });
}

test.describe("Institute question import preview timing", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute import preview timing stays measurable at larger row counts", async ({ page }, testInfo: TestInfo) => {
    const metrics: TimingMetric[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank/import");
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    if (await expectInstituteImportBlockedState(page)) {
      console.log("institute-question-import-preview-skip", JSON.stringify({ reason: "blocked-state" }));
      test.skip(true, "Institute question-bank bulk import is currently disabled on stage.");
    }

    const scope = await resolveImportScopeFromQuestionAuthoring(page);

    for (const rowCount of [25, 100, 250, 500]) {
      const { csv, firstQuestionText } = buildImportCsv(scope, rowCount);
      const filePath = testInfo.outputPath(`institute-question-import-${rowCount}.csv`);
      await writeFile(filePath, csv, "utf8");

      await measurePreviewTiming({
        page,
        rowCount,
        filePath,
        firstQuestionText,
        metrics,
      });
    }

    await testInfo.attach("institute-question-import-preview-timing", {
      body: Buffer.from(JSON.stringify({ route: "institute-question-import-preview", metrics }, null, 2)),
      contentType: "application/json",
    });
    console.log("institute-question-import-preview-timing", JSON.stringify({ route: "institute-question-import-preview", metrics }));
  });
});
