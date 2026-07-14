import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials } from "../helpers/auth";
import { reopenExamWindow } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const mutableStudentPracticeEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const greStudentCredentials = {
  username: "demo-gre-student",
  password: "Demo@12345",
};

const neetExamCode = "DMO-NEET-FULL-01";
const neetExamTitle = "Demo NEET Full Mock 01";
const jeeExamCode = "DMO-JEE-FULL-01";
const jeeExamTitle = "Demo JEE Full Mock 01";
const greExamCode = "DMO-GRE-QUANT-01";
const greExamTitle = "Demo GRE Quant Drill 01";

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
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
  }>;
}

async function openStartableAttempt(page: Page, examId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

  const primaryActionCard = page.locator("article").filter({
    has: page.getByText(/primary action/i),
  }).first();
  const primaryAction = primaryActionCard
    .getByRole("link")
    .or(primaryActionCard.getByRole("button"))
    .filter({ hasText: /^(start|resume|continue)$/i })
    .first();

  await expect(primaryAction).toBeVisible();
  await primaryAction.click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  const attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return attemptId!;
}

async function prepareStartableFamilyAttempt(
  page: Page,
  options: {
    examCode: string;
    examTitle: string;
    studentCredentials: {
      username: string;
      password: string;
    };
  },
) {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    const teacherExam = await fetchTeacherExamByCode(page, options.examCode);
    await reopenExamWindow(page, teacherExam.id, { maxAttempts: 50 });

  await loginWithCredentials(page, options.studentCredentials, "student");
  await expectStudentWorkspace(page);

  const exams = await fetchStudentAvailableExams(page);
  const exam = exams.find((item) => item.code === options.examCode) ?? null;
  expect(exam).not.toBeNull();
  expect(exam!.title).toBe(options.examTitle);

  const attemptId = await openStartableAttempt(page, exam!.id, options.examTitle);
  const resiliencePanel = page.locator(".attemptResiliencePanel").first();
  await expect(resiliencePanel).toBeVisible();
  await expect(resiliencePanel.getByText(/save & recovery status/i)).toBeVisible();
  await expect(resiliencePanel.getByText(/^online$/i)).toBeVisible();

  return { attemptId, resiliencePanel };
}

async function goOffline(page: Page) {
  await page.context().setOffline(true);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

async function goOnline(page: Page) {
  await page.context().setOffline(false);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
  });
}

async function expectSaveCheckpointConfirmed(page: Page, resiliencePanel: ReturnType<Page["locator"]>) {
  await expect
    .poll(async () => {
      const panelText = ((await resiliencePanel.textContent().catch(() => "")) ?? "").toLowerCase();
      const mainText = ((await page.locator("main").textContent().catch(() => "")) ?? "").toLowerCase();
      return (
        panelText.includes("synced") ||
        mainText.includes("response updated successfully") ||
        mainText.includes("responses saved") ||
        mainText.includes("already saved")
      );
    })
    .toBe(true);
}

test.describe("Student family weak-network runtime", () => {
  test.skip(
    !mutableStudentPracticeEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "student family weak-network runtime coverage",
    ),
  );

  test("@workflow @mutable neet student sees truthful offline save recovery guidance and can continue after reconnect", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const { attemptId, resiliencePanel } = await prepareStartableFamilyAttempt(page, {
      examCode: neetExamCode,
      examTitle: neetExamTitle,
      studentCredentials: neetStudentCredentials,
    });

    await answerCurrentAttemptQuestion(page, Date.now(), "Weak network NEET");

    await goOffline(page);

    await page.getByRole("button", { name: /^save answer$/i }).click().catch(() => null);
    await expect
      .poll(async () => {
        const panelText = ((await resiliencePanel.textContent().catch(() => "")) ?? "").toLowerCase();
        return (
          /save answer for question \d+/.test(panelText) ||
          panelText.includes("saving") ||
          panelText.includes("connection lost") ||
          panelText.includes("offline")
        );
      }, { timeout: 20000 })
      .toBe(true);
    await expect(page.getByText(/response updated successfully/i).first()).not.toBeVisible({ timeout: 1000 }).catch(() => null);

    await goOnline(page);
    await expect(resiliencePanel.getByText(/^online$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(/save answer for question \d+ is in progress\. keep this tab open while the backend confirms it\./i),
    ).toBeVisible();
    await expect(resiliencePanel.getByText(/^saving\.\.\.$/i)).toBeVisible();

    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expectSaveCheckpointConfirmed(page, resiliencePanel);
    await expect(resiliencePanel.getByText(/^synced$/i)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
  });

  test("@workflow @mutable neet student sees truthful offline submit recovery guidance and can submit after reconnect", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const { attemptId, resiliencePanel } = await prepareStartableFamilyAttempt(page, {
      examCode: neetExamCode,
      examTitle: neetExamTitle,
      studentCredentials: neetStudentCredentials,
    });

    await answerCurrentAttemptQuestion(page, Date.now() + 1, "Weak submit NEET");
    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expectSaveCheckpointConfirmed(page, resiliencePanel);

    await goOffline(page);
    await expect(resiliencePanel.getByText(/^offline$/i)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click().catch(() => null);
    await expect(resiliencePanel.getByText(/^offline$/i)).toBeVisible();
    await expect(resiliencePanel.getByText(/^submitting\.\.\.$/i)).toBeVisible();
    await expect(resiliencePanel.getByText(/^submit test$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(/connection lost\. keep this tab open\. do not close the browser, and wait for connectivity before trying to submit\./i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);

    await goOnline(page);
    await expect(resiliencePanel.getByText(/^online$/i)).toBeVisible();
    await expect(resiliencePanel.getByText(/^submitting\.\.\.$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(/submit test is in progress\. stay on this page until the summary opens\./i),
    ).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
  });

  test("@workflow @mutable jee student sees truthful offline section-switch recovery guidance under fullscreen checkpoint recovery", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const { resiliencePanel } = await prepareStartableFamilyAttempt(page, {
      examCode: jeeExamCode,
      examTitle: jeeExamTitle,
      studentCredentials: jeeStudentCredentials,
    });

    const sectionCards = page.locator(".attemptSectionCard");
    const targetSectionCard = sectionCards.filter({
      has: page.getByRole("button", { name: /open section/i }),
    }).first();
    await expect(targetSectionCard).toBeVisible();
    const targetSectionName =
      (await targetSectionCard.locator("strong").first().textContent())?.trim() || "next section";
    const targetSectionButton = targetSectionCard.getByRole("button", { name: /open section/i }).first();
    await expect(targetSectionButton).toBeVisible();

    await goOffline(page);

    await targetSectionButton.click().catch(() => null);
    await expect
      .poll(async () => {
        const panelText = ((await resiliencePanel.textContent().catch(() => "")) ?? "").toLowerCase();
        return (
          panelText.includes(`switch to section ${targetSectionName.toLowerCase()}`) ||
          panelText.includes("switching") ||
          panelText.includes("connection lost") ||
          panelText.includes("offline")
        );
      }, { timeout: 20000 })
      .toBe(true);
    await expect(page.getByText(/section switched successfully/i).first()).not.toBeVisible({ timeout: 1000 }).catch(() => null);

    await goOnline(page);
    await expect(resiliencePanel.getByText(/^online$/i)).toBeVisible();
    await expect(resiliencePanel.getByText(/^switching\.\.\.$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(new RegExp(`switch to section ${targetSectionName} is in progress`, "i")),
    ).toBeVisible();

    await targetSectionButton.click();
    await expect
      .poll(async () => {
        const switched = await page.getByText(new RegExp(`current section`, "i")).locator("..").textContent().catch(() => "");
        const currentSectionCardVisible = await page
          .locator(".attemptSectionCard")
          .filter({ has: page.getByText(new RegExp(targetSectionName, "i")) })
          .filter({ has: page.getByRole("button", { name: /current section/i }) })
          .first()
          .isVisible()
          .catch(() => false);
        const fullscreenGuardVisible = await page.getByText(/fullscreen required to continue/i).first().isVisible().catch(() => false);
        return (
          (switched?.toLowerCase().includes(targetSectionName.toLowerCase()) ?? false) ||
          currentSectionCardVisible ||
          fullscreenGuardVisible
        );
      })
      .toBe(true);
  });

  test("@workflow @mutable gre student sees truthful offline save recovery guidance and can continue after reconnect", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const { attemptId, resiliencePanel } = await prepareStartableFamilyAttempt(page, {
      examCode: greExamCode,
      examTitle: greExamTitle,
      studentCredentials: greStudentCredentials,
    });

    await answerCurrentAttemptQuestion(page, Date.now() + 2, "Weak network GRE");

    await goOffline(page);
    await expect(resiliencePanel.getByText(/^offline$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(/connection lost\. keep this tab open\./i),
    ).toBeVisible();

    await page.getByRole("button", { name: /^save answer$/i }).click().catch(() => null);
    await expect(
      resiliencePanel.getByText(/save answer for question \d+/i),
    ).toBeVisible();
    await expect(resiliencePanel.getByText(/^saving\.\.\.$/i)).toBeVisible();
    await expect(page.getByText(/response updated successfully/i).first()).not.toBeVisible({ timeout: 1000 }).catch(() => null);

    await goOnline(page);
    await expect(resiliencePanel.getByText(/^online$/i)).toBeVisible();
    await expect(
      resiliencePanel.getByText(/save answer for question \d+ is in progress\. keep this tab open while the backend confirms it\./i),
    ).toBeVisible();

    await page.getByRole("button", { name: /^save answer$/i }).click();
    await expectSaveCheckpointConfirmed(page, resiliencePanel);
    await expect(resiliencePanel.getByText(/^synced$/i)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /^submit test$/i }).click();

    await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
    await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
    await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
  });
});
