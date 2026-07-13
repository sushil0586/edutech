import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { backendAccessToken, jeeStudentCredentials, reopenExamWindow } from "../helpers/family-runtime";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const jeeExamCode = "DMO-JEE-FULL-01";
const jeeExamTitle = "Demo JEE Full Mock 01";

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

test.describe("Student mobile JEE section switching", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @mutable student can switch sections on a mobile multi-section family exam", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginWithCredentials(page, jeeStudentCredentials, "student");
    await expectStudentWorkspace(page);

    await loginWithCredentials(page, { username: "demo-teacher", password: "Demo@12345" }, "teacher");
    await expectTeacherWorkspace(page);
    const teacherResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/teacher/exams/?search=${encodeURIComponent(jeeExamCode)}&page_size=20`,
      {
        headers: {
          Authorization: `Bearer ${await backendAccessToken(page)}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );
    expect(teacherResponse.ok()).toBe(true);
    const teacherPayload = (await teacherResponse.json()) as {
      results?: Array<{
        id: string;
        code: string;
        title: string;
      }>;
    };
    const teacherExam = teacherPayload.results?.find((item) => item.code === jeeExamCode) ?? null;
    expect(teacherExam).not.toBeNull();
    await reopenExamWindow(page, teacherExam!.id, { maxAttempts: 5 });

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
    const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
    expect(attemptId).not.toBeNull();
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();

    const sectionCards = page.locator(".attemptSectionCard");
    await expect(sectionCards).toHaveCount(6);

    await answerCurrentAttemptQuestion(page, Date.now(), "8");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    const chemistryNumericSectionButton = page
      .locator(".attemptSectionCard")
      .filter({ hasText: /chemistry numeric/i })
      .getByRole("button", { name: /open section/i })
      .first();
    await expect(chemistryNumericSectionButton).toBeVisible();
    await chemistryNumericSectionButton.click();
    await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();

    await answerCurrentAttemptQuestion(page, 7, "7");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
    await expect(page.getByText(/test in progress/i).first()).toBeVisible();
    await expect(page.getByText(/section access/i).first()).toBeVisible();
    await expect(page.locator(".attemptSectionCard")).toHaveCount(6);
    await expect(
      page
        .locator(".attemptSectionCard")
        .filter({ has: page.getByRole("button", { name: /current section/i }) })
        .first(),
    ).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
    await expect(page.getByText(/wait for publication|review locked|review availability/i).first()).toBeVisible();
  });
});
