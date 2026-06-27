import { expect, test } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";

const mutableStudentMultiSubjectLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const multiSubjectPracticeExamCode = "DMO-MIX-PRACTICE-01";
const multiSubjectPracticeExamTitle = "Demo Multi Subject Practice Loop";

async function backendAccessToken(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchStudentAvailableExams(page: import("@playwright/test").Page) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as Array<{
    id: string;
    code: string;
    title: string;
    is_multi_subject?: boolean;
    subject_summary?: {
      display_label?: string;
      subject_count?: number;
    } | null;
  }>;
}

test.describe("Student mutable multi-subject lifecycle", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are required.");

  test.skip(
    !mutableStudentMultiSubjectLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded multi-subject practice lifecycle coverage",
    ),
  );

  test("@workflow @mutable student can run a real mixed-subject practice attempt and see the result land", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const practiceExam = exams.find((exam) => exam.code === multiSubjectPracticeExamCode) ?? null;
    expect(practiceExam).not.toBeNull();
    expect(practiceExam!.title).toBe(multiSubjectPracticeExamTitle);
    expect(practiceExam!.is_multi_subject).toBe(true);
    expect(practiceExam!.subject_summary?.subject_count).toBe(3);

    await page.goto(`/app/exams/${practiceExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(multiSubjectPracticeExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(practiceExam!.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
    const primaryActionCard = page.locator("article").filter({
      has: page.getByText(/primary action/i),
    }).first();
    const startButton = primaryActionCard.getByRole("button", { name: /^start$/i }).first();

    if (await resumeLink.isVisible().catch(() => false)) {
      await resumeLink.click();
    } else {
      await expect(startButton).toBeVisible();
      await startButton.click();
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    const sectionCards = page.locator(".attemptSectionCard");
    if (await sectionCards.count()) {
      await expect(sectionCards).toHaveCount(3);
    }

    await answerCurrentAttemptQuestion(page, Date.now(), "Playwright mixed subject answer");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(
      page.locator(".feedbackBannerSuccess").filter({
        hasText: /response updated successfully/i,
      }).first(),
    ).toBeVisible();

    const nextSectionButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/physics section/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await nextSectionButton.isVisible().catch(() => false)) {
      await nextSectionButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, Date.now() + 1, "Playwright mixed subject answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
    }

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/review/i).first()).toBeVisible();

    await page.goto("/app/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(multiSubjectPracticeExamTitle, "i")).first()).toBeVisible();
    const seededResultCard = page.locator("article").filter({
      has: page.getByText(new RegExp(multiSubjectPracticeExamCode, "i")),
      hasNot: page.getByRole("link", { name: /view analytics/i }),
    }).filter({
      has: page.getByRole("link", { name: /open summary/i }),
    }).first();
    await expect(seededResultCard).toBeVisible();
    await expect(seededResultCard.getByRole("link", { name: /open summary/i })).toBeVisible();
  });
});
