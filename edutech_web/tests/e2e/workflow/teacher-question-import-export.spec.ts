import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function todayStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function expectDownloadFile(
  download: Download,
  expectedFileName: string,
  expectedFragments: string[],
) {
  expect(download.suggestedFilename()).toBe(expectedFileName);
  const filePath = await download.path();
  expect(filePath).not.toBeNull();

  const content = await readFile(filePath!, "utf8");
  expect(content.length).toBeGreaterThan(20);
  for (const fragment of expectedFragments) {
    expect(content).toContain(fragment);
  }
}

async function captureDownload(page: Page, trigger: () => Promise<void>) {
  const downloadPromise = page.waitForEvent("download");
  await trigger();
  return downloadPromise;
}

async function expectTeacherImportBlockedState(page: Page) {
  const blockedTitle = page.getByRole("heading", {
    name: /question-bank bulk import is not enabled for your institute yet/i,
  });

  if ((await blockedTitle.count()) === 0) {
    return false;
  }

  await expect(page.getByText(/feature entitlement required/i)).toBeVisible();
  await expect(page.getByText(/subscription controlled/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /back to question bank/i })).toBeVisible();
  return true;
}

test.describe("Teacher question import downloads", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test("@workflow teacher can download question import templates and samples", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const stamp = todayStamp();

    await page.goto("/teacher/question-bank/import");
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    if (await expectTeacherImportBlockedState(page)) {
      await page.goto("/teacher/question-bank/comprehension/import");
      await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
      await expectTeacherImportBlockedState(page);
      return;
    }

    const questionTemplate = await captureDownload(page, async () => {
      await page.getByRole("button", { name: /^download template$/i }).click();
    });
    await expectDownloadFile(questionTemplate, `nexora-question-bank-template-${stamp}.csv`, [
      "subject,topic",
      "question_type",
      "question_text",
    ]);

    const questionSample = await captureDownload(page, async () => {
      await page.getByRole("button", { name: /^download sample$/i }).first().click();
    });
    await expectDownloadFile(questionSample, "nexora-sample-mcq-single.csv", [
      "Which AWS service stores files as objects?",
      "mcq_single",
      "Amazon S3",
    ]);

    await page.goto("/teacher/question-bank/comprehension/import");
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();

    const comprehensionTemplate = await captureDownload(page, async () => {
      await page.getByRole("button", { name: /^download template$/i }).click();
    });
    await expectDownloadFile(comprehensionTemplate, `nexora-comprehension-template-${stamp}.csv`, [
      "subject,topic,title,content_format,passage_text,description",
    ]);

    const comprehensionSample = await captureDownload(page, async () => {
      await page.getByRole("button", { name: /^download sample$/i }).first().click();
    });
    await expectDownloadFile(comprehensionSample, "nexora-sample-comprehension-markdown.csv", [
      "Cloud Security Reading Set",
      "markdown_latex",
      "shared responsibility model",
    ]);
  });
});
