import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import {
  awsStudentCredentials,
  backendBaseUrl,
  escapeRegExp,
} from "../helpers/family-runtime";
import { expectStudentWorkspace } from "../helpers/navigation";
import { suppressVisualNoise } from "../helpers/visual";

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

async function openAttemptFromExamDetail(page: Page, examId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();

  const openSummaryLink = page.getByRole("link", { name: /open summary/i }).first();
  const openReviewLink = page.getByRole("link", { name: /open review/i }).first();
  const resumeLink = page.getByRole("link", { name: /resume/i }).first();
  const launchAction = page
    .locator("a,button")
    .filter({
      hasText: /^(start|start test|start mock test|start exam|start practice set|resume|resume test|resume attempt)$/i,
    })
    .first();
  let entryState: "runtime" | "summary" | "review" = "runtime";
  if (await openSummaryLink.isVisible().catch(() => false)) {
    await openSummaryLink.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
    entryState = "summary";
  } else if (await openReviewLink.isVisible().catch(() => false)) {
    await openReviewLink.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/);
    entryState = "review";
  } else if (await resumeLink.isVisible().catch(() => false)) {
    await resumeLink.click();
  } else {
    await expect(launchAction).toBeVisible();
    await launchAction.click();
  }

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\/(summary|review))?(?:\?.*)?$/);
  const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return {
    attemptId: attemptId!,
    entryState,
  };
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
  await page.getByRole("button", { name: /^(submit test|end test)$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}\\s+Summary`, "i") }).first(),
  ).toBeVisible();
}

test.describe("Student mobile post-submit visual", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    await suppressVisualNoise(page);
  });

  test("@workflow @visual student mobile summary and review stay readable after submission", async ({
    page,
  }) => {
    const awsExamCode = "DMO-AWS-PRACTICE-01";
    const awsExamTitle = "Demo AWS Practitioner Practice 01";

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();

    const entry = await openAttemptFromExamDetail(page, awsExam!.id, awsExamTitle);
    const attemptId = entry.attemptId;
    if (entry.entryState === "runtime") {
      await saveAndSubmitAttempt(page, awsExamTitle, Date.now(), "student mobile review visual");
    } else if (entry.entryState === "review") {
      await page.goto(`/app/attempts/${attemptId}/summary`);
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary(?:\\?.*)?$`));
    }

    const summaryHero = page.locator(".studentInsightHeroCardCompact").first();
    await expect(summaryHero).toHaveScreenshot("student-mobile-summary-hero-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
      mask: [summaryHero.locator(".studentSummaryHeroMeta").first()],
    });

    const summaryKpiStrip = page.locator(".resultsSummaryGrid").first();
    await expect(summaryKpiStrip).toHaveScreenshot("student-mobile-summary-kpi-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
      mask: [summaryKpiStrip.locator(".metricCard").first().locator("strong").first()],
    });

    const summaryCards = page.locator(".studentInsightsTwoColumn .contentCard");
    await expect(summaryCards.first()).toHaveScreenshot("student-mobile-summary-status-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });
    await expect(summaryCards.nth(1)).toHaveScreenshot("student-mobile-summary-next-step-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 220,
    });

    await page.goto(`/app/attempts/${attemptId}/review`);
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
    await expect(page.locator(".studentAppContent")).toHaveScreenshot("student-mobile-review-ready.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 200,
      mask: [page.locator(".studentPageHeader").first(), page.locator(".studentInsightHeroCard").first()],
    });
  });
});
