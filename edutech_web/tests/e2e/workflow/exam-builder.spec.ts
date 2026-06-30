import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

test.describe("Teacher exam builder workflow", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can inspect the exam builder and drill through linked results analysis", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1400 });
    await loginAsRole(page, "teacher");
    await page.goto("/teacher/exams");

    const setupLink = page.getByRole("link", { name: /setup/i }).first();
    await expect(setupLink).toBeVisible();

    const builderHref = await setupLink.getAttribute("href");
    expect(builderHref).toBeTruthy();

    await page.goto(builderHref!);

    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
    await expect(page.getByText(/paper design/i).first()).toBeVisible();
    await expect(page.getByText(/add a new section/i)).toBeVisible();

    const examId = builderHref?.match(/\/teacher\/exams\/([^/?#]+)\/builder/)?.[1];
    expect(examId).toBeTruthy();

    const openDeliveryViewLink = page.locator(`a[href="/teacher/exams/${examId}"]`).first();
    const openResultsLink = page.locator(`a[href="/teacher/results?exam=${examId}"]`).first();
    const openReviewsLink = page.locator(`a[href="/teacher/reviews?exam=${examId}"]`).first();

    await expect(openDeliveryViewLink).toHaveAttribute("href", `/teacher/exams/${examId}`);
    await expect(openResultsLink).toHaveAttribute("href", `/teacher/results?exam=${examId}`);
    await expect(openReviewsLink).toHaveAttribute("href", `/teacher/reviews?exam=${examId}`);

    await page.goto(`/teacher/results?exam=${examId}`);
    await expect(page).toHaveURL(new RegExp(`/teacher/results\\?exam=${examId}`));
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(`/teacher/reviews?exam=${examId}`);
    await expect(page).toHaveURL(new RegExp(`/teacher/reviews\\?exam=${examId}`));
    await expect(page.getByRole("heading", { name: /review queue|reviews/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto(`/teacher/exams/${examId}`);
    await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}(?:\\?.*)?$`));
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();

    await page.goto(builderHref!);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    const sectionRows = page.locator(".builderListRow");
    const sectionCount = await sectionRows.count();
    expect(sectionCount).toBeGreaterThan(0);

    const firstSectionRow = sectionRows.first();
    await expect(firstSectionRow.locator("strong").first()).toBeVisible();
    await expect(firstSectionRow).toContainText(/section\s+\d+/i);

    const orderInput = page.locator('input[name="section_order"]').first();
    const nextOrderValue = Number(await orderInput.inputValue());
    expect(nextOrderValue).toBe(sectionCount + 1);

    await expect(page.locator('input[name="allow_skip_section"]')).toBeChecked();

    await page.getByRole("tab", { name: /linked questions/i }).click();
    await expect(page.getByText(/question mapping/i).first()).toBeVisible();
    await expect(page.getByText(/question list view/i)).toBeVisible();

    const explanationPreview = page.locator("details.builderQuestionPreviewPanel").filter({
      has: page.getByText(/preview explanation/i),
    }).first();
    await explanationPreview.locator("summary").click();
    await expect(explanationPreview.locator("p")).toBeVisible();

    const rapidAttachForm = page.locator("form.builderForm.builderSubform").filter({
      has: page.getByText(/rapid attach/i),
    }).first();
    const rapidAttachWorkspace = rapidAttachForm.locator(".builderQuickAttachWorkspace");

    const rapidAttachSearch = rapidAttachWorkspace.getByRole("searchbox");
    await rapidAttachSearch.fill("cloud");

    const rapidAttachCheckboxes = rapidAttachWorkspace.locator(".builderQuickAttachGrid input[type='checkbox']");
    const rapidAttachCount = await rapidAttachCheckboxes.count();

    if (rapidAttachCount > 0) {
      await rapidAttachCheckboxes.first().check();
      await expect(rapidAttachForm.locator(".builderSelectionPreviewPanel")).toContainText(/1 selected/i);

      await rapidAttachForm.getByRole("button", { name: /^clear$/i }).click();
      await expect(rapidAttachForm.locator(".builderSelectionPreviewPanel")).toContainText(/0 selected/i);
    } else {
      await expect(rapidAttachForm.locator(".builderSelectionPreviewPanel")).toContainText(/0 selected/i);
      await expect(rapidAttachForm.getByText(/visible now/i).first()).toBeVisible();
    }

    await page.goto("/teacher/results/analysis");

    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();

    await page.getByLabel(/group by/i).selectOption("status");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/exam_list_group=status/);
    await expect(page.getByText(/group: status/i)).toBeVisible();

    const builderLink = page.getByRole("link", { name: /open builder/i }).last();
    await expect(builderLink).toBeVisible();
    await expect(builderLink).toHaveAttribute("href", /\/teacher\/exams\/.+\/builder/);

    await builderLink.click();
    await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
  });
});
