import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function examAccessKeyCard(page: Page) {
  return page
    .locator("article")
    .filter({ has: page.getByText("Exam Access Key", { exact: true }).first() })
    .first();
}

async function deleteInstituteExam(apiContext: APIRequestContext, examId: string, accessToken: string) {
  try {
    const response = await apiContext.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok() || response.status() === 404) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await apiContext.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect([200, 202, 204, 404]).toContain(proxyResponse.status());
}

async function createDisposableExam(
  page: Page,
  cleanupRequest: APIRequestContext,
  accessToken: string,
  uniqueSeed: number,
) {
  const examTitle = `PW Mutable Exam ${uniqueSeed}`;
  const examCode = `PW-MUT-${uniqueSeed}`;

  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await page.getByRole("button", { name: /create exam shell/i }).click();
  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();
  await expect(page.getByText(examCode, { exact: true })).toBeVisible();

  const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();
  const examIdMatch = examDetailBaseUrl.match(/\/institute\/exams\/([^/?#]+)/);
  const examId = examIdMatch?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
    examCode,
    examDetailBaseUrl,
    async cleanup() {
      await deleteInstituteExam(cleanupRequest, examId!, accessToken);
    },
  };
}

async function createCleanupRequest(page: Page) {
  const accessToken =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(accessToken).not.toBe("");
  const cleanupRequest = await request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return { accessToken, cleanupRequest };
}

test.describe("Institute mutable exam actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "disposable exam mutation coverage",
    ),
  );

  test("@workflow @mutable institute can create a disposable exam shell and validate cross-surface handoffs", async ({
    page,
  }) => {
    test.setTimeout(90000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const { accessToken, cleanupRequest } = await createCleanupRequest(page);
    let exam: Awaited<ReturnType<typeof createDisposableExam>> | null = null;

    try {
      exam = await createDisposableExam(page, cleanupRequest, accessToken, uniqueSeed);

      await expect(page.locator(`a[href="/institute/results?exam=${exam.examId}"]`).first()).toBeVisible();
      await expect(page.locator(`a[href="/institute/reviews?exam=${exam.examId}"]`).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open question bank/i }).first()).toBeVisible();

      await page.getByRole("link", { name: /continue setup/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/institute/exams/${exam.examId}/builder(?:\\?.*)?$`));
      await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();
      await page.goto(exam.examDetailBaseUrl);
      await page.getByRole("link", { name: /link questions/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/institute/exams/${exam.examId}/builder\\?tab=questions`));
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
      await page.goto(exam.examDetailBaseUrl);

      await expect(examAccessKeyCard(page)).toBeVisible();
      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    } finally {
      if (exam) {
        await exam.cleanup();
      }
      await cleanupRequest.dispose();
    }
  });

  test("@workflow @mutable institute can mutate exam delivery actions and access policy on a disposable exam", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const entitlementCode = `pw_mutable_${uniqueSeed}`;
    const updatedPriority = "77";
    const entitlementPolicyLabel = "Subscription Only";
    const { accessToken, cleanupRequest } = await createCleanupRequest(page);
    let exam: Awaited<ReturnType<typeof createDisposableExam>> | null = null;

    try {
      exam = await createDisposableExam(page, cleanupRequest, accessToken, uniqueSeed);
      await page.goto(exam.examDetailBaseUrl);

      const accessKeyCard = examAccessKeyCard(page);
      await expect(accessKeyCard).toBeVisible();

      await page.getByRole("button", { name: /refresh status/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/exam action completed successfully|status/i).first()).toBeVisible();
      await page.goto(exam.examDetailBaseUrl);

      await page.getByRole("button", { name: /sync marks/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/marks/i).first()).toBeVisible();
      await page.goto(exam.examDetailBaseUrl);

      const originalAccessKey = (await accessKeyCard.locator("strong").first().textContent())?.trim() ?? "";
      expect(originalAccessKey).not.toBe("");

      const toggleAccessKeyButton = page.getByRole("button", {
        name: /enable key entry|disable key entry/i,
      });
      const toggleLabelBefore = ((await toggleAccessKeyButton.textContent()) ?? "").trim();
      await toggleAccessKeyButton.click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/access key (enabled|disabled) successfully/i)).toBeVisible();

      const toggleAccessKeyButtonAfter = page.getByRole("button", {
        name: /enable key entry|disable key entry/i,
      });
      const toggleLabelAfter = ((await toggleAccessKeyButtonAfter.textContent()) ?? "").trim();
      expect(toggleLabelAfter).not.toBe(toggleLabelBefore);

      const accessKeyBeforeRegeneration =
        (await accessKeyCard.locator("strong").first().textContent())?.trim() ?? "";
      await page.getByRole("button", { name: /regenerate key/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/access key regenerated successfully/i)).toBeVisible();

      const regeneratedAccessKey =
        (await accessKeyCard.locator("strong").first().textContent())?.trim() ?? "";
      expect(regeneratedAccessKey).not.toBe("");
      expect(regeneratedAccessKey).not.toBe(accessKeyBeforeRegeneration);

      await page.getByRole("combobox", { name: /access policy/i }).selectOption({
        label: entitlementPolicyLabel,
      });
      await page.getByRole("textbox", { name: /entitlement code/i }).fill(entitlementCode);
      await page.getByRole("spinbutton", { name: /priority/i }).fill(updatedPriority);
      await page.getByRole("button", { name: /save access policy/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("subscription_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.goto(exam.examDetailBaseUrl);
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("subscription_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    } finally {
      if (exam) {
        await exam.cleanup();
      }
      await cleanupRequest.dispose();
    }
  });
});
