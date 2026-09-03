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
      question_text: `Stage institute finalize timing question ${batchToken}-${rowCount}-${index}`,
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
    firstQuestionText: `Stage institute finalize timing question ${batchToken}-${rowCount}-1`,
  };
}

async function cleanupImportedQuestions(page: Page, createdIds: string[]) {
  if (createdIds.length === 0) {
    return;
  }

  const bulkPaths = [
    "/api/question-bank/questions/bulk-action",
    "/api/question-bank/questions/bulk-action/",
  ];

  for (const path of bulkPaths) {
    try {
      const response = await page.request.post(path, {
        data: {
          action: "delete",
          question_ids: createdIds,
        },
      });
      if (response.ok()) {
        return;
      }
    } catch {
      // Fall through to per-question cleanup when the bulk endpoint flakes.
    }
  }

  for (const questionId of createdIds) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        if (response.ok() || response.status() === 404) {
          lastError = null;
          break;
        }
        lastError = new Error(await response.text());
      } catch (error) {
        lastError = error;
      }

      await page.waitForTimeout(250 * attempt);
    }

    expect(lastError, `Failed to clean up imported question ${questionId}`).toBeNull();
  }
}

test.describe("Institute question import finalize timing", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow @mutable institute import finalize timing stays measurable at 500 rows", async ({ page }, testInfo: TestInfo) => {
    test.setTimeout(240000);

    const rowCount = 500;
    const metrics: TimingMetric[] = [];
    let createdIds: string[] = [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank/import");
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    if (await expectInstituteImportBlockedState(page)) {
      console.log("institute-question-import-finalize-skip", JSON.stringify({ reason: "blocked-state" }));
      test.skip(true, "Institute question-bank bulk import is currently disabled on stage.");
    }

    const scope = await resolveImportScopeFromQuestionAuthoring(page);
    const { csv, firstQuestionText } = buildImportCsv(scope, rowCount);
    const filePath = testInfo.outputPath(`institute-question-import-finalize-${rowCount}.csv`);
    await writeFile(filePath, csv, "utf8");

    try {
      await page.goto("/institute/question-bank/import");
      await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();

      const throttledBanner = page.getByText(/request was throttled/i).first();
      if (await throttledBanner.isVisible().catch(() => false)) {
        console.log("institute-question-import-finalize-skip", JSON.stringify({ reason: "throttled-before-preview" }));
        test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
      }

      await expect(page.getByTestId("question-import-file-input")).toBeVisible();
      await page.getByTestId("question-import-file-input").setInputFiles(filePath);

      const previewStart = Date.now();
      await page.getByRole("button", { name: /preview import/i }).click();

      const previewOutcome = await Promise.race([
        page
          .getByText(/preview generated\./i)
          .first()
          .waitFor({ state: "visible", timeout: 30000 })
          .then(() => "preview"),
        throttledBanner.waitFor({ state: "visible", timeout: 30000 }).then(() => "throttled"),
      ]).catch(() => "timeout");

      if (previewOutcome === "throttled" || (await throttledBanner.isVisible().catch(() => false))) {
        console.log("institute-question-import-finalize-skip", JSON.stringify({ reason: "throttled-after-preview-click" }));
        test.skip(true, "Question import preview is currently throttled by the backend cooldown window.");
      }

      await expect(page.getByText(new RegExp(firstQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
      metrics.push({
        label: `institute-question-import-preview-${rowCount}`,
        elapsedMs: Date.now() - previewStart,
      });

      const finalizeButton = page.getByRole("button", {
        name: new RegExp(`(?:import valid rows|finalize import) \\(${rowCount}\\)`, "i"),
      });
      await expect(finalizeButton).toBeVisible();
      await expect(finalizeButton).toBeEnabled();

      const finalizeStart = Date.now();
      const finalizeResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/question-bank\/finalize-import$/.test(response.url()) &&
          response.request().method() === "POST",
      );
      await finalizeButton.click();
      const finalizeResponse = await finalizeResponsePromise;
      expect(finalizeResponse.ok(), await finalizeResponse.text()).toBe(true);
      const finalizePayload = await finalizeResponse.json();
      createdIds = Array.isArray(finalizePayload.created_ids) ? finalizePayload.created_ids : [];

      metrics.push({
        label: `institute-question-import-finalize-${rowCount}`,
        elapsedMs: Date.now() - finalizeStart,
      });

      expect(finalizePayload.created_count).toBe(rowCount);
      expect(finalizePayload.failed_count).toBe(0);
      expect(createdIds).toHaveLength(rowCount);
      await expect(page.getByText(new RegExp(`${rowCount} questions were imported`, "i")).first()).toBeVisible();
      const payload = { route: "institute-question-import-finalize", metrics, rowCount };
      await testInfo.attach("institute-question-import-finalize-timing", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("institute-question-import-finalize-timing", JSON.stringify(payload));
    } finally {
      await cleanupImportedQuestions(page, createdIds);
    }
  });
});
