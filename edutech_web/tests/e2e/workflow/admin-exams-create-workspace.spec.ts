import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin exam create workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect the create-exam wizard and move through steps safely", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams/new");

    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
    await expect(page.getByText(/choose the academic lane this exam belongs to/i).first()).toBeVisible();

    const instituteChip = page.locator(".academicInstituteChip").nth(1);
    if (await instituteChip.isVisible().catch(() => false)) {
      await instituteChip.click();
      await expect(page).toHaveURL(/\/admin\/exams\/new\?institute=/);
    }

    await expect(page.getByText(/guided creation/i).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /scope and identity/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /schedule and delivery/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /runtime rules/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /learner experience/i })).toBeVisible();

    const academicYear = page.locator('select[name="academic_year"]').first();
    const program = page.locator('select[name="program"]').first();
    const title = page.locator('input[name="title"]').first();
    const code = page.locator('input[name="code"]').first();
    const source = page.locator('select[name="source_type"]').first();
    const accessPolicy = page.locator('select[name="economy_policy_type"]').first();
    const starCost = page.locator('input[name="economy_star_cost"]').first();

    await expect(academicYear).toBeVisible();
    await expect(program).toBeVisible();
    await expect(title).toBeVisible();
    await expect(code).toBeVisible();
    await expect(source).toBeVisible();
    await expect(accessPolicy).toBeVisible();
    await expect(starCost).toBeVisible();

    await title.fill("");
    await code.fill("");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/scope and identity/i).first()).toBeVisible();
    await expect
      .poll(async () => title.evaluate((element) => element.validationMessage))
      .not.toBe("");

    await title.fill("PW Admin Wizard Baseline");
    await code.fill("PW-ADMIN-WIZ");
    await source.selectOption("institute");
    await accessPolicy.selectOption({ index: 0 });
    await starCost.fill("0");

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/schedule and delivery/i).first()).toBeVisible();
    await expect(page.locator('input[name="duration_minutes"]').first()).toBeVisible();
    await expect(page.locator('input[name="max_attempts"]').first()).toBeVisible();

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/runtime rules/i).first()).toBeVisible();
    await expect(page.locator('select[name="security_mode"]').first()).toBeVisible();
    await expect(page.locator('select[name="review_mode"]').first()).toBeVisible();

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByText(/learner experience/i).first()).toBeVisible();
    await expect(page.locator('textarea[name="description"]').first()).toBeVisible();
    await expect(page.locator('textarea[name="instructions"]').first()).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /allow resume/i })).toBeChecked();
    await expect(page.getByRole("button", { name: /create exam shell/i })).toBeVisible();

    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByText(/runtime rules/i).first()).toBeVisible();
  });
});
