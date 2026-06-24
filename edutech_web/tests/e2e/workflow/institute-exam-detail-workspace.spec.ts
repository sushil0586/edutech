import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute exam detail workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can open an exam detail route and inspect the core detail panels", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

    await expect(page.getByText(/^exam code$/i).first()).toBeVisible();
    await expect(page.getByText(/^questions$/i).first()).toBeVisible();
    await expect(page.getByText(/^assigned students$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();

    await expect(page.getByText(/^exam readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^hard blockers$/i).first()).toBeVisible();
    await expect(page.getByText(/^still pending$/i).first()).toBeVisible();
    await expect(page.getByText(/^already ready$/i).first()).toBeVisible();

    await expect(page.getByText(/^exam actions$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
    await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
    await expect(page.getByText(/^publish history$/i).first()).toBeVisible();
  });
});
