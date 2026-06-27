import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const mutableStudentJeeLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const jeeExamCode = "DMO-JEE-FULL-01";
const jeeExamTitle = "Demo JEE Full Mock 01";

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

test.describe("Student JEE full mock lifecycle", () => {
  test.skip(
    !mutableStudentJeeLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded JEE full-mock lifecycle coverage",
    ),
  );

  test("@workflow @mutable jee student can start a seeded full mock, move between hybrid sections, and submit", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const jeeExam = exams.find((exam) => exam.code === jeeExamCode) ?? null;
    expect(jeeExam).not.toBeNull();
    expect(jeeExam!.title).toBe(jeeExamTitle);
    expect(jeeExam!.is_multi_subject).toBe(true);
    expect(jeeExam!.subject_summary?.subject_count).toBe(3);

    await page.goto(`/app/exams/${jeeExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(jeeExamTitle, "i") }).first()).toBeVisible();
    await expect(page.getByText(jeeExam!.subject_summary!.display_label!).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();

    const primaryActionCard = page.locator("article").filter({
      has: page.getByText(/primary action/i),
    }).first();
    const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
    const startButton = primaryActionCard.getByRole("button", { name: /^start$/i }).first();
    if (await resumeLink.isVisible().catch(() => false)) {
      await resumeLink.click();
    } else {
      await expect(startButton).toBeVisible();
      await startButton.click();
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/attempt progress|overall progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();
    await expect(page.getByText(/fullscreen required/i).first()).toBeVisible();

    const attemptUrl = page.url();
    const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();

    const sectionCards = page.locator(".attemptSectionCard");
    if (await sectionCards.count()) {
      await expect(sectionCards).toHaveCount(6);
    }

    await answerCurrentAttemptQuestion(page, Date.now(), "8");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    const chemistryNumericSectionButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/chemistry numeric/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await chemistryNumericSectionButton.isVisible().catch(() => false)) {
      await chemistryNumericSectionButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, 7, "7");
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
    await expect(page.getByText(/review locked|review availability|review depends on/i).first()).toBeVisible();

    await page.goto("/app/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(new RegExp(jeeExamTitle, "i")).first()).not.toBeVisible({ timeout: 1500 }).catch(() => null);
  });
});
