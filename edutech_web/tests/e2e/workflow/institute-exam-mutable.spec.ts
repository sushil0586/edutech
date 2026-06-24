import { expect, test, type Page } from "@playwright/test";
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

async function deleteInstituteExam(page: Page, examId: string) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
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

  test("@workflow @mutable institute can create a disposable exam shell and validate mutable detail actions", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Mutable Exam ${uniqueSeed}`;
    const examCode = `PW-MUT-${uniqueSeed}`;
    const entitlementCode = `pw_mutable_${uniqueSeed}`;
    const updatedPriority = "77";
    const entitlementPolicyLabel = "Entitlement Only";
    const sectionName = `PW Institute Section ${uniqueSeed}`;
    let examId: string | null = null;

    try {
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
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      const openResultsLink = page.locator(`a[href="/institute/results?exam=${examId}"]`).first();
      if (await openResultsLink.isVisible().catch(() => false)) {
        await page.goto(`/institute/results?exam=${examId}`);
        await expect(page).toHaveURL(new RegExp(`/institute/results\\?exam=${examId}`));
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
        await page.goto(examDetailBaseUrl);
      }

      const openReviewsLink = page.locator(`a[href="/institute/reviews?exam=${examId}"]`).first();
      if (await openReviewsLink.isVisible().catch(() => false)) {
        await page.goto(`/institute/reviews?exam=${examId}`);
        await expect(page).toHaveURL(new RegExp(`/institute/reviews\\?exam=${examId}`));
        await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
        await page.goto(examDetailBaseUrl);
      }

      await page.getByRole("link", { name: /^open builder$/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/institute/exams/${examId}/builder(?:\\?.*)?$`));
      await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();

      await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
      await expect(page.getByText(/add a new section/i).first()).toBeVisible();
      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section added/i)).toBeVisible();

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      const selectedQuestionLabel = questionOptions[0]!.label;
      const selectedQuestionTitle =
        selectedQuestionLabel
          .split("·")
          .map((part) => part.trim())
          .find((part) => /^pw /i.test(part) || /question/i.test(part)) ?? selectedQuestionLabel;
      await questionSelect.selectOption(questionOptions[0]!.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();
      await sectionSelect.selectOption(sectionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("button", { name: /export as pdf/i }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState("domcontentloaded");
      await expect(popup.locator("h1")).toContainText(examTitle);
      await expect(popup.locator("body")).toContainText(selectedQuestionTitle);
      await popup.close();

      await page.goto(examDetailBaseUrl);

      await page.getByRole("link", { name: /link questions/i }).click();
      await expect(page).toHaveURL(new RegExp(`/institute/exams/${examId}/builder\\?tab=questions`));
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      const accessKeyCard = examAccessKeyCard(page);
      await expect(accessKeyCard).toBeVisible();

      await page.getByRole("button", { name: /refresh status/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/exam action completed successfully|status/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await page.getByRole("button", { name: /sync marks/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
      await expect(page.getByText(/marks/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

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
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("entitlement_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.goto(examDetailBaseUrl);
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("entitlement_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    } finally {
      if (examId) {
        await deleteInstituteExam(page, examId);
      }
    }
  });
});
