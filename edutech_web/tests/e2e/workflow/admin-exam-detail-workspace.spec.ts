import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin exam detail workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect exam detail controls and use non-mutating handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

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

    await expect(page.locator('select[name="policy_type"]').first()).toBeVisible();
    await expect(page.locator('input[name="star_cost"]').first()).toBeVisible();
    await expect(page.locator('input[name="entitlement_code"]').first()).toBeVisible();
    await expect(page.locator('input[name="priority"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save access policy/i }).first()).toBeVisible();

    await expect(page.getByText(/assigned students/i).first()).toBeVisible();
    await expect(page.getByText(/publish history/i).first()).toBeVisible();

    await page.getByRole("link", { name: /link questions/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/builder\?tab=questions$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(page.url().replace(/\/builder\?tab=questions$/, ""));
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

    await page.getByRole("link", { name: /launch advanced builder|advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    await page.goto("/admin/exams");
    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

    await page.locator('a[href="/admin/reports"]').first().click();
    await expect(page).toHaveURL(/\/admin\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible();

    await page.goto("/admin/exams");
    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

    await page.getByRole("link", { name: /open builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(page.url().replace(/\/builder(?:\?.*)?$/, ""));
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);
  });
});
