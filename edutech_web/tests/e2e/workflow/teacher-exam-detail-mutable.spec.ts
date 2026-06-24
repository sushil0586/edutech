import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
);
const teacherApiBaseUrl = (
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

async function deleteTeacherExamDirectly(page: Page, examId: string) {
  try {
    const proxyResponse = await page.request.delete(`/api/teacher/exams/${examId}`, {
      timeout: 15000,
    });
    if (proxyResponse.ok()) {
      return;
    }
  } catch {
    // Fall through to direct backend cleanup.
  }

  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Teacher mutable exam detail actions", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
      "disposable teacher exam detail coverage",
    ),
  );

  test("@workflow @mutable teacher can validate core exam detail page links and policy actions", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Detail ${uniqueSeed}`;
    const examCode = `PW-TD-${uniqueSeed}`;
    const entitlementCode = `pw_teacher_detail_${uniqueSeed}`;
    const updatedPriority = "81";
    let examId: string | null = null;

    try {
      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?message=/, {
        timeout: 30000,
      });
      await expect(
        page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}.*builder`, "i") }).first(),
      ).toBeVisible();

      const builderBaseUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = builderBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await expect(page.getByText(examCode, { exact: true })).toBeVisible();
      await page.getByRole("link", { name: /open delivery view/i }).click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}(?:\\?.*)?$`));
      const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();

      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /save access policy/i })).toBeVisible();

      const openResultsLink = page.locator(`a[href="/teacher/results?exam=${examId}"]`).first();
      if (await openResultsLink.isVisible().catch(() => false)) {
        await page.goto(`/teacher/results?exam=${examId}`);
        await expect(page).toHaveURL(new RegExp(`/teacher/results\\?exam=${examId}`));
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
        await page.goto(examDetailBaseUrl);
      }

      const openReviewsLink = page.locator(`a[href="/teacher/reviews?exam=${examId}"]`).first();
      if (await openReviewsLink.isVisible().catch(() => false)) {
        await page.goto(`/teacher/reviews?exam=${examId}`);
        await expect(page).toHaveURL(new RegExp(`/teacher/reviews\\?exam=${examId}`));
        await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
        await page.goto(examDetailBaseUrl);
      }

      await page.getByRole("link", { name: /^open builder$/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));
      await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await page.getByRole("link", { name: /link questions/i }).click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder\\?tab=questions`));
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await expect(examAccessKeyCard(page)).toBeVisible();

      await page.getByRole("button", { name: /refresh status/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/exam action completed successfully|status/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await page.getByRole("button", { name: /sync marks/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/marks/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      const toggleAccessKeyButton = page.getByRole("button", {
        name: /enable key entry|disable key entry/i,
      });
      const toggleLabelBefore = ((await toggleAccessKeyButton.textContent()) ?? "").trim();
      await toggleAccessKeyButton.click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/access key (enabled|disabled) successfully/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /enable key entry|disable key entry/i }),
      ).not.toHaveText(toggleLabelBefore);
      await page.goto(examDetailBaseUrl);

      const accessKeyBeforeRegeneration =
        (await examAccessKeyCard(page).locator("strong").first().textContent())?.trim() ?? "";
      await page.getByRole("button", { name: /regenerate key/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/access key regenerated successfully/i)).toBeVisible();
      const regeneratedAccessKey =
        (await examAccessKeyCard(page).locator("strong").first().textContent())?.trim() ?? "";
      expect(regeneratedAccessKey).not.toBe("");
      expect(regeneratedAccessKey).not.toBe(accessKeyBeforeRegeneration);
      await page.goto(examDetailBaseUrl);

      await page.getByRole("combobox", { name: /access policy/i }).selectOption({
        label: "Entitlement Only",
      });
      await page.getByRole("spinbutton", { name: /star cost/i }).fill("0");
      await page.getByRole("textbox", { name: /entitlement code/i }).fill(entitlementCode);
      await page.getByRole("spinbutton", { name: /priority/i }).fill(updatedPriority);
      await page.getByRole("button", { name: /save access policy/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("entitlement_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    } finally {
      if (examId) {
        await deleteTeacherExamDirectly(page, examId);
      }
    }
  });
});
