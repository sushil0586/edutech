import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute exam builder workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can inspect builder utility handoffs and linked-question workspace", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await page.goto("/institute/exams");

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+$/);

    const openBuilderLink = page.getByRole("link", { name: /open builder/i }).first();
    await expect(openBuilderLink).toBeVisible();
    const builderHref = await openBuilderLink.getAttribute("href");
    expect(builderHref).toBeTruthy();

    const examId = builderHref?.match(/\/institute\/exams\/([^/?#]+)\/builder/)?.[1];
    expect(examId).toBeTruthy();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
    await expect(page.getByText(/paper design/i).first()).toBeVisible();

    const openDeliveryViewLink = page.locator(`a[href="/institute/exams/${examId}"]`).first();
    const openResultsLink = page.locator(`a[href="/institute/results?exam=${examId}"]`).first();
    const openReviewsLink = page.locator(`a[href="/institute/reviews?exam=${examId}"]`).first();
    const openQuestionBankLink = page.locator('a[href="/institute/question-bank"]').first();

    await expect(openDeliveryViewLink).toHaveAttribute("href", `/institute/exams/${examId}`);
    await expect(openResultsLink).toHaveAttribute("href", `/institute/results?exam=${examId}`);
    await expect(openReviewsLink).toHaveAttribute("href", `/institute/reviews?exam=${examId}`);
    await expect(openQuestionBankLink).toHaveAttribute("href", "/institute/question-bank");

    await page.goto(`/institute/results?exam=${examId}`);
    await expect(page).toHaveURL(new RegExp(`/institute/results\\?exam=${examId}`));
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(`/institute/reviews?exam=${examId}`);
    await expect(page).toHaveURL(new RegExp(`/institute/reviews\\?exam=${examId}`));
    await expect(page.getByRole("heading", { name: /review queue|reviews/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/institute/question-bank");
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.getByRole("tab", { name: /linked questions/i }).click();
    await expect(page.getByText(/question mapping/i).first()).toBeVisible();

    await page.goto(`/institute/exams/${examId}`);
    await expect(page).toHaveURL(new RegExp(`/institute/exams/${examId}(?:\\?.*)?$`));
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
  });
});
