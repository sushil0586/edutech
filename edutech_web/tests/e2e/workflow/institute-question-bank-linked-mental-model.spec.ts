import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";
import { InstituteShellPage } from "../page-objects/institute/institute-shell.po";
import { expectInstituteWorkspace } from "../helpers/navigation";

const linkerCtaPattern = /open shared library linker(?: for this scope)?/i;

test.describe("Institute linked question mental model", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can distinguish local versus linked lanes and recover from filtered linked empty states", async ({
    page,
  }) => {
    const shell = new InstituteShellPage(page);
    const questionBank = new InstituteQuestionBankPage(page);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await shell.expectWorkspace();

    await questionBank.goto();
    await questionBank.expectLoaded();
    await expect(page.getByText(/current lane:\s*local question bank/i).first()).toBeVisible();
    await expect(
      page.getByText(/stay here to create, edit, import, and organize institute-owned questions/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open linked questions/i }).first()).toBeVisible();
    await expect(page.locator("form.questionBankBulkBar").first()).toBeVisible();
    await expect(
      page.getByText(/bulk mutation tools are hidden in linked review mode/i),
    ).toHaveCount(0);

    await questionBank.openLinkedLane();
    await questionBank.expectLinkedLoaded();
    await questionBank.expectLinkedScopeSummary();
    await expect(page.getByText(/current lane:\s*linked questions/i).first()).toBeVisible();
    await expect(
      page.getByText(/stay here to review and use already-linked platform questions/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open local question bank/i }).first()).toBeVisible();
    await expect(page.locator("form.questionBankBulkBar")).toHaveCount(0);
    await expect(
      page.getByText(/current linked view/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/filters only change what you are seeing right now\. they do not remove access or delete rows/i).first(),
    ).toBeVisible();

    const linkedInventory = page.locator(".questionBankCard");
    const duplicateLink = linkedInventory.getByRole("link", {
      name: /create editable copy|duplicate to edit/i,
    }).first();
    await expect(duplicateLink).toBeVisible();

    const duplicateHref = await duplicateLink.getAttribute("href");
    expect(duplicateHref).toBeTruthy();
    expect(duplicateHref).toContain("/institute/question-bank/linked/new?duplicate=");

    await questionBank.search("playwright-linked-empty-zzqv-1781");
    await expect(page).toHaveURL(/search=playwright-linked-empty-zzqv-1781/);
    const filteredEmptyState = page.getByText(/no linked questions match this selection/i).first();
    const resetLinkedFilters = page.getByRole("link", { name: /reset linked filters/i }).first();
    const linkedLaneGuide = page.getByRole("link", { name: linkerCtaPattern }).first();
    await expect
      .poll(
        async () => {
          const emptyVisible = await filteredEmptyState.isVisible().catch(() => false);
          const linkedRows = await linkedInventory.count().catch(() => 0);
          return emptyVisible || linkedRows > 0;
        },
        {
          message: "Expected the linked lane to settle into either a filtered empty state or a visible linked row set.",
          timeout: 10000,
        },
      )
      .toBeTruthy();

    if (await filteredEmptyState.isVisible().catch(() => false)) {
      await expect(filteredEmptyState).toBeVisible();
      await expect(
        page.getByText(
          /no linked questions are visible for this filtered lane right now\. either nothing has been linked for this class and subject yet, or the current filters are narrower than the linked stock/i,
        ).first(),
      ).toBeVisible();
      await expect(resetLinkedFilters).toBeVisible();
      await expect(linkedLaneGuide).toBeVisible();
    } else {
      await questionBank.expectLinkedLoaded();
      await expect(page.getByText(/current linked view/i).first()).toBeVisible();
      await expect(page.getByText(/rows on this page/i).first()).toBeVisible();
      const linkedRowsVisible = await linkedInventory.first().isVisible().catch(() => false);
      if (linkedRowsVisible) {
        await expect(linkedInventory.first()).toBeVisible();
      } else {
        await expect(resetLinkedFilters).toBeVisible();
      }
    }

    await resetLinkedFilters.click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/linked(?:\?.*)?$/);
    await questionBank.expectLinkedLoaded();
    const linkedEmptyState = page.getByText(/no linked questions match this selection/i).first();
    const hasLinkedEmptyState = await linkedEmptyState.isVisible().catch(() => false);
    if (hasLinkedEmptyState) {
      await expect(resetLinkedFilters).toBeVisible();
      await expect(linkedLaneGuide).toBeVisible();
    } else {
      await expect(page.getByText(/current linked view/i).first()).toBeVisible();
      await expect(page.getByText(/rows on this page/i).first()).toBeVisible();
    }
  });
});
