import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  awsStudentCredentials,
  backendBaseUrl,
  escapeRegExp,
  jeeStudentCredentials,
  reopenExamWindow,
} from "../helpers/family-runtime";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

type StudentAvailableExam = {
  id: string;
  code: string;
  title: string;
};

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchStudentAvailableExams(page: Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as StudentAvailableExam[];
}

async function fetchTeacherExamByCode(page: Page, examCode: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(
    `${backendBaseUrl}/api/v1/teacher/exams/?search=${encodeURIComponent(examCode)}&page_size=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    results?: Array<{
      id: string;
      code: string;
      title: string;
    }>;
  };
  const exam = payload.results?.find((item) => item.code === examCode) ?? null;
  expect(exam).not.toBeNull();
  return exam!;
}

async function openAttemptFromExamDetail(page: Page, examId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();

  const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
  const startButton = page.getByRole("button", { name: /^start$/i }).first();
  if (await resumeLink.isVisible().catch(() => false)) {
    await resumeLink.click();
  } else {
    await startButton.click();
  }

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return attemptId!;
}

async function saveAndSubmitAttempt(page: Page, examTitle: string, answerSeed: number, prefix: string) {
  await answerCurrentAttemptQuestion(page, answerSeed, prefix);
  const saveButton = page.getByRole("button", { name: /^save answer$/i }).first();
  if (await saveButton.isVisible().catch(() => false)) {
    await saveButton.click();
    await expect(page.getByText(/response updated successfully|responses saved/i).first()).toBeVisible();
  }

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}\\s+Summary`, "i") }).first(),
  ).toBeVisible();
}

function attemptHistoryCard(page: Page, title: string) {
  return page.locator("article").filter({
    has: page.getByText(new RegExp(escapeRegExp(title), "i")),
  }).first();
}

test.describe("Student post-submit visual journey", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow @visual student sees a clear pending summary and review-locked state after a competitive exam", async ({
    page,
  }, testInfo) => {
    const jeeExamCode = "DMO-JEE-FULL-01";
    const jeeExamTitle = "Demo JEE Full Mock 01";

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    const teacherExam = await fetchTeacherExamByCode(page, jeeExamCode);
    await reopenExamWindow(page, teacherExam.id, { maxAttempts: 5 });

    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const jeeExam = exams.find((exam) => exam.code === jeeExamCode) ?? null;
    expect(jeeExam).not.toBeNull();

    await page.goto(`/app/exams/${jeeExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(jeeExamTitle), "i") }).first()).toBeVisible();

    const openSummaryLink = page.getByRole("link", { name: /open summary/i }).first();
    let attemptId: string | null = null;
    if (await openSummaryLink.isVisible().catch(() => false)) {
      await openSummaryLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)\/summary/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();
    } else {
      attemptId = await openAttemptFromExamDetail(page, jeeExam!.id, jeeExamTitle);
      await saveAndSubmitAttempt(page, jeeExamTitle, Date.now(), "visual pending");
    }

    const summaryCards = page.locator(".studentInsightsTwoColumn").first();
    await expect(summaryCards).toHaveScreenshot("student-summary-pending-actions.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 450,
    });
    const summaryShot = testInfo.outputPath("student-summary-pending-actions.png");
    await summaryCards.screenshot({ path: summaryShot });
    await testInfo.attach("student-summary-pending-actions", {
      path: summaryShot,
      contentType: "image/png",
    });

    await page.goto(`/app/attempts/${attemptId!}/review`);
    await expect(
      page.getByRole("heading", { name: /attempt review is not available right now/i }).first(),
    ).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("student-review-unavailable.png", {
      animations: "disabled",
      caret: "hide",
      mask: [page.locator(".studentPageHeader").first()],
    });

    await page.goto("/app/attempts");
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    const historyCard = attemptHistoryCard(page, jeeExamTitle);
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toHaveScreenshot("student-attempt-history-pending-card.png", {
      animations: "disabled",
      caret: "hide",
    });
  });

  test("@workflow @visual student sees review-ready feedback clearly after a certification practice attempt", async ({
    page,
  }) => {
    const awsExamCode = "DMO-AWS-PRACTICE-01";
    const awsExamTitle = "Demo AWS Practitioner Practice 01";

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();

    const attemptId = await openAttemptFromExamDetail(page, awsExam!.id, awsExamTitle);
    await saveAndSubmitAttempt(page, awsExamTitle, Date.now(), "visual review ready");

    const summaryCards = page.locator(".studentInsightsTwoColumn").first();
    await expect(summaryCards).toHaveScreenshot("student-summary-review-ready-actions.png", {
      animations: "disabled",
      caret: "hide",
    });

    await page.goto(`/app/attempts/${attemptId}/review`);
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
    await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();

    const reviewStateCard = page.locator(".contentCard").filter({
      has: page.getByText(/^review state$/i),
    }).first();
    await expect(reviewStateCard).toHaveScreenshot("student-review-state-card.png", {
      animations: "disabled",
      caret: "hide",
    });

    const firstReviewQuestion = page.locator(".attemptQuestionCard").first();
    await expect(firstReviewQuestion).toHaveScreenshot("student-review-question-card.png", {
      animations: "disabled",
      caret: "hide",
    });

    await page.goto("/app/results?result_status=review_ready");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    const resultsCard = page.locator("article.contentCard").filter({
      has: page.locator("strong", {
        hasText: new RegExp(escapeRegExp(awsExamTitle), "i"),
      }),
    }).first();
    await expect(resultsCard).toBeVisible();
    await expect(resultsCard).toHaveScreenshot("student-results-review-ready-card.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 200,
    });

  });
});
