import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute economy workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute admin can inspect economy policy visibility and student support controls", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/economy");

    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /packages currently available to this institute/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /what the current licensed packages actually cover/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /which subscription plans back which package lanes/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /request question-bank subscription activation/i }),
    ).toBeVisible();
    await expect(page.getByText(/package request workflow/i).first()).toBeVisible();
    await expect(page.getByText(/licensed question bank access/i).first()).toBeVisible();
    await expect(page.getByText(/what this plan unlocks/i).first()).toBeVisible();
    await expect(page.getByText(/plan family/i).first()).toBeVisible();
    await expect(page.getByText(/commercial lanes:/i).first()).toBeVisible();
    await expect(page.getByText(/renewal posture:/i).first()).toBeVisible();
    await expect(page.getByText(/access source:/i).first()).toBeVisible();
    await expect(page.getByText(/status:/i).first()).toBeVisible();

    const studentSelect = page.locator("select").filter({ has: page.locator("option") }).nth(0);
    await expect(studentSelect).toBeVisible();

    const starsInput = page.locator('input[type="number"]').first();
    const reasonInput = page.locator('input[placeholder*="Manual adjustment"]').first();
    const referenceInput = page.locator('input[placeholder*="Optional ticket"]').first();

    await expect(starsInput).toHaveValue("25");
    await starsInput.fill("12");
    await expect(starsInput).toHaveValue("12");

    await reasonInput.fill("");
    await referenceInput.fill("INST-E2E-REF");
    await page.getByRole("button", { name: /grant stars/i }).click();
    await expect(page.getByText(/enter a clear reason for the grant/i)).toBeVisible();

    await page.getByRole("button", { name: /refresh unlocks/i }).click();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();

    await page.locator('a[href="/institute/exams"]').first().click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.goto("/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

    await page.locator('a[href="/institute/results"]').first().click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  });
});
