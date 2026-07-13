import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute preset pack library", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can inspect preset pack library filters and builder handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams/preset-packs");

    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open advanced builder/i }).first()).toBeVisible();
    await expect(page.getByText(/search the library and move into builder when you are ready to tune runtime/i).first()).toBeVisible();

    const searchInput = page.getByLabel(/search preset packs/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("starter");
    await expect(searchInput).toHaveValue("starter");

    await page.getByRole("button", { name: /starter/i }).click();
    await expect(page.getByText(/scope:\s*starter/i).first()).toBeVisible();

    await page.getByRole("button", { name: /managed/i }).click();
    await expect(page.getByText(/scope:\s*managed/i).first()).toBeVisible();

    await page.getByRole("button", { name: /platform/i }).click();
    await expect(page.getByText(/scope:\s*platform/i).first()).toBeVisible();

    await searchInput.fill("");
    await expect(searchInput).toHaveValue("");
    await page.getByRole("button", { name: /all packs/i }).click();
    await expect(page.getByText(/scope:\s*all/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open in builder/i }).first()).toBeVisible();

    const backToExamsLink = page.getByRole("link", { name: /back to exams/i }).first();
    await expect(backToExamsLink).toHaveAttribute("href", "/institute/exams");
    await Promise.all([
      page.waitForURL(/\/institute\/exams(?:\?.*)?$/),
      backToExamsLink.click(),
    ]);
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.goto("/institute/exams/preset-packs");
    const openInBuilderLink = page.getByRole("link", { name: /open in builder/i }).first();
    const openInBuilderHref = await openInBuilderLink.getAttribute("href");
    expect(openInBuilderHref).toMatch(/\/institute\/exams\/advanced\?preset_pack=/);
    await openInBuilderLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/advanced\?preset_pack=/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

    await page.goto("/institute/exams/preset-packs");
    await page.getByRole("link", { name: /open advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
  });
});
