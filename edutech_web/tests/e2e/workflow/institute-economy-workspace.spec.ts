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
    await expect(page.getByRole("heading", { name: /review one economy lane at a time/i })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /packages currently available to this institute/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /request question-bank subscription activation/i }),
    ).toBeVisible();
    await expect(page.getByText(/overview filters/i).first()).toBeVisible();
    const focusLaneSelect = page.getByLabel(/institute economy focus lane/i);
    await expect(focusLaneSelect).toBeVisible();
    await focusLaneSelect.selectOption("licensing");
    await expect(
      page.getByRole("heading", { name: /what is active, blocked, and approaching renewal/i }),
    ).toBeVisible();
    await focusLaneSelect.selectOption("plans");
    await expect(
      page.getByRole("heading", { name: /which subscription plans back which package lanes/i }),
    ).toBeVisible();
    await expect(page.getByText(/package request workflow/i).first()).toBeVisible();
    await focusLaneSelect.selectOption("packages");
    await expect(page.getByText(/licensed question bank access/i).first()).toBeVisible();

    const requestWorkspaceView = page.getByLabel(/institute subscription workspace view/i);
    await expect(requestWorkspaceView).toBeVisible();
    await requestWorkspaceView.selectOption("plans");
    await expect(page.getByText(/what this plan unlocks/i).first()).toBeVisible();
    await expect(page.getByText(/plan family/i).first()).toBeVisible();
    await expect(page.getByText(/commercial lanes:/i).first()).toBeVisible();
    await expect(page.getByText(/renewal posture:/i).first()).toBeVisible();
    await expect(page.getByText(/access source:/i).first()).toBeVisible();
    await expect(page.getByText(/status:/i).first()).toBeVisible();
    await requestWorkspaceView.selectOption("request");
    await expect(page.getByLabel(/institute requestable plan cycle/i)).toBeVisible();
    await expect(page.getByLabel(/institute subscription request notes/i)).toBeVisible();
    await requestWorkspaceView.selectOption("history");
    await expect(page.getByText(/track what was submitted, what was approved/i).first()).toBeVisible();
    await requestWorkspaceView.selectOption("all");

    const economyWorkspaceView = page.getByLabel(/institute economy workspace view/i);
    await expect(economyWorkspaceView).toBeVisible();
    await economyWorkspaceView.selectOption("actions");
    await expect(page.getByText(/support control center/i).first()).toBeVisible();
    await expect(page.getByLabel(/^student$/i)).toBeVisible();
    await expect(page.getByLabel(/stars to grant/i)).toBeVisible();
    await expect(page.getByLabel(/reason/i)).toBeVisible();
    await expect(page.getByLabel(/reference/i)).toBeVisible();
    await economyWorkspaceView.selectOption("wallet");
    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();
    await economyWorkspaceView.selectOption("activity");
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();
    await economyWorkspaceView.selectOption("orders");
    await expect(page.getByText(/pending order requests for the selected student/i).first()).toBeVisible();
    await economyWorkspaceView.selectOption("all");

    const studentSelect = page.getByLabel(/^student$/i);
    await expect(studentSelect).toBeVisible();

    const starsInput = page.locator('input[type="number"]').first();
    const reasonInput = page.locator('input[placeholder*="Manual adjustment"]').first();
    const referenceInput = page.locator('input[placeholder*="Optional ticket"]').first();

    await expect(starsInput).toHaveValue("25");
    await starsInput.fill("12");
    await expect(starsInput).toHaveValue("12");

    await reasonInput.fill("Institute support review");
    await referenceInput.fill("INST-E2E-REF");
    await expect(reasonInput).toHaveValue("Institute support review");
    await expect(referenceInput).toHaveValue("INST-E2E-REF");

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
