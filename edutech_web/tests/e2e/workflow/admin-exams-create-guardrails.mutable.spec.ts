import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminExamCreateActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_CREATE_ACTIONS",
);

const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function wizardTab(page: Page, name: RegExp) {
  return page.getByRole("tab", { name }).first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await locator.selectOption(options[0]!);
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: Page, examId: string | null) {
  if (!examId) {
    return;
  }
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Admin exam create wizard guardrails", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminExamCreateActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_CREATE_ACTIONS",
      "admin exam create wizard guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can create an exam shell from the wizard with minimum valid browser inputs", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Admin Wizard Guardrail ${uniqueSeed}`;
    const examCode = `PW-AWG-${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await page.goto("/admin/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const academicYear = page.locator('select[name="academic_year"]').first();
      const program = page.locator('select[name="program"]').first();
      const sourceType = page.locator('select[name="source_type"]').first();

      if ((await academicYear.inputValue()) === "") {
        await selectFirstNonEmptyOption(academicYear);
      }
      if ((await program.inputValue()) === "") {
        await selectFirstNonEmptyOption(program);
      }

      await page.locator('input[name="title"]').fill(examTitle);
      await page.locator('input[name="code"]').fill(examCode);
      if ((await sourceType.inputValue()) === "") {
        await selectFirstNonEmptyOption(sourceType);
      }

      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /schedule and delivery/i)).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /runtime rules/i)).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(wizardTab(page, /learner experience/i)).toHaveAttribute("aria-selected", "true");

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\?message=/, { timeout: 30000 });
      await expect(page.locator(".examCard").filter({ hasText: examTitle }).first()).toBeVisible();

      const createdCard = page.locator(".examCard").filter({ hasText: examTitle }).first();
      const openExamHref = await createdCard.getByRole("link", { name: /open exam/i }).getAttribute("href");
      examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();
    } finally {
      await deleteAdminExamDirectly(page, examId);
    }
  });

  test("@workflow @mutable admin exam wizard preserves in-progress values across back and continue navigation", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Admin Wizard Preserve ${uniqueSeed}`;
    const examCode = `PW-AWP-${uniqueSeed}`;
    const description = "Disposable wizard description preserved across guided steps.";
    const instructions = "Disposable wizard instructions preserved across guided steps.";
    const duration = "47";
    const maxAttempts = "3";

    await page.goto("/admin/exams/new");
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

    const academicYear = page.locator('select[name="academic_year"]').first();
    const program = page.locator('select[name="program"]').first();
    if ((await academicYear.inputValue()) === "") {
      await selectFirstNonEmptyOption(academicYear);
    }
    if ((await program.inputValue()) === "") {
      await selectFirstNonEmptyOption(program);
    }

    await page.locator('input[name="title"]').fill(examTitle);
    await page.locator('input[name="code"]').fill(examCode);

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(wizardTab(page, /schedule and delivery/i)).toHaveAttribute("aria-selected", "true");
    await page.locator('input[name="duration_minutes"]').fill(duration);
    await page.locator('input[name="max_attempts"]').fill(maxAttempts);

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(wizardTab(page, /runtime rules/i)).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(wizardTab(page, /learner experience/i)).toHaveAttribute("aria-selected", "true");
    await page.locator('textarea[name="description"]').fill(description);
    await page.locator('textarea[name="instructions"]').fill(instructions);

    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(wizardTab(page, /runtime rules/i)).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(wizardTab(page, /schedule and delivery/i)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('input[name="duration_minutes"]')).toHaveValue(duration);
    await expect(page.locator('input[name="max_attempts"]')).toHaveValue(maxAttempts);

    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(wizardTab(page, /scope and identity/i)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('input[name="title"]')).toHaveValue(examTitle);
    await expect(page.locator('input[name="code"]')).toHaveValue(examCode);

    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(wizardTab(page, /learner experience/i)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(description);
    await expect(page.locator('textarea[name="instructions"]')).toHaveValue(instructions);
  });
});
