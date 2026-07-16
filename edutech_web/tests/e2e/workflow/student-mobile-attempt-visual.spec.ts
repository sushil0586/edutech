import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials } from "../helpers/auth";
import { awsStudentCredentials } from "../helpers/family-runtime";
import { expectStudentWorkspace } from "../helpers/navigation";
import type { StudentAvailableExam } from "@/features/dashboard/types";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

function mobileSnapshotMasks(page: Page) {
  return [
    page.locator(".attemptWorkspaceHeader").first(),
    page.locator(".attemptMobileRuntimeHeader").first(),
    page.locator(".attemptQuestionPrompt").first(),
    page.locator(".attemptOptionList").first(),
    page.locator(".attemptQuestionMetaLine").first(),
  ];
}

test.describe("Student mobile attempt visual", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow @visual student mobile attempt layout stays readable on a live runtime", async ({
    page,
  }, testInfo) => {
    const awsExamCode = "DMO-AWS-PRACTICE-01";
    const awsExamTitle = "Demo AWS Practitioner Practice 01";

    await loginWithCredentials(page, awsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    const accessToken = await backendAccessToken(page);
    const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    expect(response.ok()).toBe(true);
    const exams = (await response.json()) as StudentAvailableExam[];
    const awsExam = exams.find((exam) => exam.code === awsExamCode) ?? null;
    expect(awsExam).not.toBeNull();
    expect(awsExam!.title).toBe(awsExamTitle);

    await page.goto(`/app/exams/${awsExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExamTitle, "i") }).first()).toBeVisible();

    const resumeLink = page.getByRole("link", { name: /^resume$/i }).first();
    const startButton = page.getByRole("button", { name: /^start$/i }).first();
    if (await resumeLink.isVisible().catch(() => false)) {
      await resumeLink.click();
    } else {
      await startButton.click();
    }

    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    await expect(page.locator(".attemptMobileRuntimeStrip").first()).toBeVisible();
    await expect(page.locator(".attemptQuestionCard").first()).toBeVisible();

    await answerCurrentAttemptQuestion(page, Date.now(), "Mobile visual answer");
    await page.getByRole("checkbox", { name: /mark for review/i }).check();

    await expect(page).toHaveScreenshot("student-mobile-attempt-overview.png", {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      maxDiffPixels: 1500,
      mask: mobileSnapshotMasks(page),
    });
    await expect(page.locator(".attemptMobileRuntimeStrip").first()).toHaveScreenshot(
      "student-mobile-attempt-runtime-strip.png",
      {
        animations: "disabled",
        caret: "hide",
        mask: [page.locator(".attemptMobileRuntimeHeader").first()],
      },
    );
    const overviewShot = testInfo.outputPath("student-mobile-attempt-overview.png");
    await page.locator("main").screenshot({ path: overviewShot });
    await testInfo.attach("student-mobile-attempt-overview", {
      path: overviewShot,
      contentType: "image/png",
    });

    const runtimeStripShot = testInfo.outputPath("student-mobile-attempt-runtime-strip.png");
    await page.locator(".attemptMobileRuntimeStrip").first().screenshot({ path: runtimeStripShot });
    await testInfo.attach("student-mobile-attempt-runtime-strip", {
      path: runtimeStripShot,
      contentType: "image/png",
    });

  });
});
