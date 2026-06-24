import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
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

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Admin mutable exam detail actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "disposable admin exam detail coverage",
    ),
  );

  test("@workflow @mutable admin can validate core exam detail page links and policy actions", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Admin Detail ${uniqueSeed}`;
    const examCode = `PW-AD-${uniqueSeed}`;
    const entitlementCode = `pw_admin_detail_${uniqueSeed}`;
    const updatedPriority = "82";
    let examId: string | null = null;

    try {
      await page.goto("/admin/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\?message=/, { timeout: 30000 });
      const createdExamCard = page.locator("article").filter({
        has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first(),
      }).first();
      await expect(createdExamCard).toBeVisible();
      const openExamHref = await createdExamCard.getByRole("link", { name: /open exam/i }).getAttribute("href");
      examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/admin/exams/${examId}`);
      const examDetailBaseUrl = page.url().split("?")[0] ?? page.url();

      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /save access policy/i })).toBeVisible();
      await expect(page.getByText(examCode, { exact: true })).toBeVisible();

      await page.getByRole("link", { name: /^open builder$/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/exams/${examId}/builder(?:\\?.*)?$`));
      await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await page.getByRole("link", { name: /link questions/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/exams/${examId}/builder\\?tab=questions`));
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await expect(examAccessKeyCard(page)).toBeVisible();

      await page.getByRole("button", { name: /refresh status/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/exam action completed successfully|status/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      await page.getByRole("button", { name: /sync marks/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/marks/i).first()).toBeVisible();
      await page.goto(examDetailBaseUrl);

      const toggleAccessKeyButton = page.getByRole("button", {
        name: /enable key entry|disable key entry/i,
      });
      const toggleLabelBefore = ((await toggleAccessKeyButton.textContent()) ?? "").trim();
      await toggleAccessKeyButton.click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/access key (enabled|disabled) successfully/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /enable key entry|disable key entry/i }),
      ).not.toHaveText(toggleLabelBefore);
      await page.goto(examDetailBaseUrl);

      const accessKeyBeforeRegeneration =
        (await examAccessKeyCard(page).locator("strong").first().textContent())?.trim() ?? "";
      await page.getByRole("button", { name: /regenerate key/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
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
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();
      await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue("entitlement_only");
      await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(entitlementCode);
      await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(updatedPriority);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    } finally {
      if (examId) {
        await deleteAdminExamDirectly(page, examId);
      }
    }
  });
});
