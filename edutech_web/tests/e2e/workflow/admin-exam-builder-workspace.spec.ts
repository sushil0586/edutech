import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

test.describe("Admin exam builder workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can inspect builder tabs and cross-workspace handoffs", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await page.goto("/admin/exams");

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/admin\/exams\/.+$/);

    const openBuilderLink = page.getByRole("link", { name: /open builder/i }).first();
    await expect(openBuilderLink).toBeVisible();
    const builderHref = await openBuilderLink.getAttribute("href");
    expect(builderHref).toBeTruthy();

    const examId = builderHref?.match(/\/admin\/exams\/([^/?#]+)\/builder/)?.[1];
    expect(examId).toBeTruthy();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
    await expect(page.getByText(/exam settings/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /scope and identity/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /schedule and delivery/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /runtime rules/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sections/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /linked questions/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /student assignment/i }).first()).toBeVisible();

    const openDeliveryViewLink = page.locator(`a[href="/admin/exams/${examId}"]`).first();
    await expect(openDeliveryViewLink).toHaveAttribute("href", `/admin/exams/${examId}`);
    await expect(page.locator('a[href="/admin/reports"]').first()).toHaveAttribute(
      "href",
      "/admin/reports",
    );
    await expect(page.getByRole("link", { name: /^link questions$/i }).first()).toHaveAttribute(
      "href",
      `/admin/exams/${examId}/builder?tab=questions`,
    );

    await page.getByRole("link", { name: /schedule and delivery/i }).first().click();
    await expect(page).toHaveURL(/#schedule-delivery$/);
    await expect(page.getByText(/schedule and delivery/i).first()).toBeVisible();

    await page.getByRole("link", { name: /runtime rules/i }).first().click();
    await expect(page).toHaveURL(/#runtime-rules$/);
    await expect(page.getByText(/runtime rules/i).first()).toBeVisible();

    await page.getByRole("link", { name: /linked questions/i }).first().click();
    await expect(page).toHaveURL(/#linked-questions$/);

    await page.getByRole("tab", { name: /student assignment/i }).click();
    await expect(page.getByText(/student assignment/i).first()).toBeVisible();
    await expect(page.getByText(/choose whether this exam follows scope-based distribution/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open delivery view/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/admin/exams/${examId}(?:\\?.*)?$`));
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
  });
});
