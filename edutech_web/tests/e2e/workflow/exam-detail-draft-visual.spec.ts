import { expect, test, type Page } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const instituteCredentials = {
  username: "obpms",
  password: "Demo@12345",
};

const teacherCredentials = {
  username: "demo-teacher",
  password: "Demo@12345",
};

const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const teacherApiBaseUrl = instituteApiBaseUrl;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createExamShell(page: Page, role: "institute" | "teacher", title: string, code: string) {
  await page.goto(`/${role}/exams/new`);
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await page.getByRole("textbox", { name: /exam title/i }).fill(title);
  await page.getByRole("textbox", { name: /exam code/i }).fill(code);
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }
  await expect(page.getByRole("button", { name: /create exam shell/i })).toBeVisible();
  await page.getByRole("button", { name: /create exam shell/i }).click();
}

async function deleteInstituteExam(page: Page, examId: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  }).catch(() => page.request.delete(`/api/institute/exams/${examId}`, { timeout: 15000 }));
}

async function deleteTeacherExam(page: Page, examId: string) {
  try {
    const proxyResponse = await page.request.delete(`/api/teacher/exams/${examId}`, {
      timeout: 15000,
    });
    if (proxyResponse.ok()) return;
  } catch {
    // Fall back to direct backend cleanup.
  }
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  await page.request.delete(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

test.describe("Exam detail draft visual states", () => {
  test("@workflow @visual institute draft exam detail shows the new setup guidance", async ({
    page,
  }, testInfo) => {
    const uniqueSeed = Date.now();
    const examTitle = `PW Draft Institute Visual ${uniqueSeed}`;
    const examCode = `PW-DIV-${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await createExamShell(page, "institute", examTitle, examCode);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      const guideCard = page.locator(".examLifecycleGuideCard").first();
      await expect(guideCard.getByRole("link", { name: /continue setup/i })).toBeVisible();
      await expect(guideCard).toContainText(/next steps before learner release/i);
      await expect(guideCard).toContainText(/link questions/i);
      await expect(guideCard).toContainText(/assign learners/i);
      await expect(guideCard).toContainText(/confirm schedule/i);

      const overviewShot = testInfo.outputPath("institute-draft-exam-detail-overview.png");
      await page.locator("main").screenshot({ path: overviewShot });
      await testInfo.attach("institute-draft-exam-detail-overview", {
        path: overviewShot,
        contentType: "image/png",
      });

      const guideShot = testInfo.outputPath("institute-draft-exam-detail-guide.png");
      await guideCard.screenshot({ path: guideShot });
      await testInfo.attach("institute-draft-exam-detail-guide", {
        path: guideShot,
        contentType: "image/png",
      });
    } finally {
      if (examId) {
        await deleteInstituteExam(page, examId).catch(() => null);
      }
    }
  });

  test("@workflow @visual teacher draft exam detail shows the new setup guidance", async ({
    page,
  }, testInfo) => {
    const uniqueSeed = Date.now();
    const examTitle = `PW Draft Teacher Visual ${uniqueSeed}`;
    const examCode = `PW-DTV-${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await loginWithCredentials(page, teacherCredentials, "teacher");
      await expectTeacherWorkspace(page);

      await createExamShell(page, "teacher", examTitle, examCode);
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?message=/, {
        timeout: 30000,
      });
      const builderUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = builderUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      const guideCard = page.locator(".examLifecycleGuideCard").first();
      await expect(guideCard.getByRole("link", { name: /continue setup/i })).toBeVisible();
      await expect(guideCard).toContainText(/next steps before learner release/i);
      await expect(guideCard).toContainText(/link questions/i);
      await expect(guideCard).toContainText(/assign learners/i);
      await expect(guideCard).toContainText(/confirm schedule/i);

      const overviewShot = testInfo.outputPath("teacher-draft-exam-detail-overview.png");
      await page.locator("main").screenshot({ path: overviewShot });
      await testInfo.attach("teacher-draft-exam-detail-overview", {
        path: overviewShot,
        contentType: "image/png",
      });

      const guideShot = testInfo.outputPath("teacher-draft-exam-detail-guide.png");
      await guideCard.screenshot({ path: guideShot });
      await testInfo.attach("teacher-draft-exam-detail-guide", {
        path: guideShot,
        contentType: "image/png",
      });
    } finally {
      if (examId) {
        await deleteTeacherExam(page, examId).catch(() => null);
      }
    }
  });
});
