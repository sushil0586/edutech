import { expect, type Page, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

async function openAdminExams(page: Page) {
  if (/^\/admin\/exams\/?$/.test(new URL(page.url()).pathname)) {
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    return;
  }

  await page.goto("/admin/exams", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
}

async function openFirstAdminExamDetail(page: Page) {
  const examLink = page.getByRole("link", { name: /view exam/i }).first();
  await expect(examLink).toBeVisible();
  const href = await examLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);
}

test.describe("Admin exam detail workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect exam detail controls and use non-mutating handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await openAdminExams(page);

    await openFirstAdminExamDetail(page);

    await expect(page.getByText(/exam build/i).first()).toBeVisible();
    await expect(page.getByText(/exam actions/i).first()).toBeVisible();
    await expect(page.getByText(/exam configuration/i).first()).toBeVisible();
    await expect(page.getByText(/student access and stars/i).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();

    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /launch advanced builder|advanced builder/i }).first()).toBeVisible();

    await expect(page.getByRole("button", { name: /refresh status/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sync marks/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /disable key entry|enable key entry/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /regenerate key/i }).first()).toBeVisible();

    await expect(page.locator('select[name="commercial_path"]').first()).toBeVisible();
    await expect(page.locator('input[name="star_cost"]').first()).toBeVisible();
    await expect(page.locator('input[name="entitlement_code"]').first()).toBeVisible();
    await expect(page.locator('input[name="priority"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save access policy/i }).first()).toBeVisible();

    await expect(page.getByText(/assigned students/i).first()).toBeVisible();
    await expect(page.getByText(/publish history/i).first()).toBeVisible();

    await page.getByRole("link", { name: /link questions/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/builder\?tab=questions$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(page.url().replace(/\/builder\?tab=questions$/, ""), {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

    await page.getByRole("link", { name: /view advanced builder|advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    await openAdminExams(page);
    await openFirstAdminExamDetail(page);

    await page.locator('a[href="/admin/reports"]').first().click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();

    await openAdminExams(page);
    await openFirstAdminExamDetail(page);

    await page.getByRole("link", { name: /open builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(page.url().replace(/\/builder(?:\?.*)?$/, ""), {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);
  });
});
