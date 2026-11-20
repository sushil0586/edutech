import { expect, test, type Page } from "@playwright/test";
import {
  fetchStudentExamDetailCatalog,
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const awsStudentCredentials = {
  username: "demo-aws-student",
  password: "Demo@12345",
};

const awsExamCode = "DMO-AWS-PRACTICE-01";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ERR_ABORTED") && page.url().includes(url)) {
        return;
      }
      if (
        (!message.includes("ERR_CONNECTION_REFUSED") && !message.includes("ERR_ABORTED")) ||
        attempt === attempts
      ) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

test.describe("Student AWS practice contract", () => {
  test("@workflow aws student sees the seeded AWS practice set as a practice-first certification lane", async ({
    page,
  }) => {
    await loginStudentFamilyAccountOrSkip(page, awsStudentCredentials, "aws");

    const awsExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "AWS practice",
      examCode: awsExamCode,
    });
    if (!awsExam) {
      return;
    }
    expect(awsExam!.is_multi_subject).toBe(false);
    expect(awsExam!.subject_summary.subject_count).toBe(1);

    const detail = await fetchStudentExamDetailCatalog(page, awsExam!.id);
    expect(detail.code).toBe(awsExamCode);
    expect(detail.exam_type).toBe("practice");
    expect(detail.result_published).toBe(false);
    expect(detail.experience_profile.assessment_family).toBe("certification");
    expect(detail.experience_profile.actual_timer_mode).toBe("global");
    expect(detail.experience_profile.actual_navigation_mode).toBe("free_exam");

    await gotoWithRetry(page, "/app/practice");
    await expect(page.getByText(awsExam!.title).first()).toBeVisible();

    await gotoWithRetry(page, `/app/exams/${awsExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(awsExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(/45 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/certification/i).first()).toBeVisible();
    await expect(page.getByText(/review availability/i).first()).toBeVisible();
    await expect(page.getByText(/cloud concepts/i).first()).toBeVisible();
  });
});
