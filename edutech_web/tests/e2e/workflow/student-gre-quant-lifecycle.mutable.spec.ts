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

const greStudentCredentials = {
  username: "demo-gre-student",
  password: "Demo@12345",
};

const mutableStudentGreLifecycleEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const greExamCode = "DMO-GRE-QUANT-01";
const greExamTitle = "Demo GRE Quant Drill 01";

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

test.describe("Student GRE quant lifecycle", () => {
  test.skip(
    !mutableStudentGreLifecycleEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "seeded GRE quant lifecycle coverage",
    ),
  );

  test("@workflow @mutable gre student can start a seeded quant drill, move sections, and submit into controlled release state", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginWithCredentials(page, greStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const exams = await fetchStudentAvailableExams(page);
    const greExam = exams.find((exam) => exam.code === greExamCode) ?? null;
    expect(greExam).not.toBeNull();
    expect(greExam!.title).toBe(greExamTitle);
    expect(greExam!.is_multi_subject).toBe(false);
    expect(greExam!.subject_summary?.subject_count).toBe(1);

    await page.goto(`/app/exams/${greExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(greExamTitle, "i") }).first()).toBeVisible();
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

    await answerCurrentAttemptQuestion(page, Date.now(), "8");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

    const quantSectionTwoButton = page
      .locator(".attemptSectionCard")
      .filter({ has: page.getByText(/quant section 2/i) })
      .getByRole("button", { name: /open section/i })
      .first();

    if (await quantSectionTwoButton.isVisible().catch(() => false)) {
      await quantSectionTwoButton.click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      await answerCurrentAttemptQuestion(page, Date.now() + 1, "20");
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
    await expect(page.getByText(new RegExp(greExamTitle, "i")).first()).not.toBeVisible({ timeout: 1500 }).catch(() => null);
  });
});
