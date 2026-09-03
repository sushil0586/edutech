import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { InstituteLibraryLinkerPage } from "../page-objects/institute/institute-library-linker.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";
import { InstituteShellPage } from "../page-objects/institute/institute-shell.po";

const opbmsCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "obpms",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};

test.describe("Institute OPBMS linked science browser coverage", () => {
  test("@workflow opbms can filter linked science questions and read the linked-scope explanation", async ({
    page,
  }) => {
    const shell = new InstituteShellPage(page);
    const questionBank = new InstituteQuestionBankPage(page);
    const linkedHowItWorksCard = page.locator("section.contentCard").filter({
      has: page.getByText(/how linked questions work/i),
    }).first();

    await loginWithCredentials(page, opbmsCredentials, "institute");
    await shell.expectWorkspace();

    await questionBank.gotoLinked();
    await questionBank.expectLinkedLoaded();
    await questionBank.expectLinkedScopeSummary();
    await expect(page.getByText(/read the chain in this order: switch status, package coverage, then linked questions already inside the institute bank/i).first()).toBeVisible();
    await expect(page.getByText(/1\. intake switch:\s*ready/i).first()).toBeVisible();
    await expect(page.getByText(/2\. package coverage:\s*ready/i).first()).toBeVisible();
    await expect(page.getByText(/how linked questions work/i).first()).toBeVisible();
    await expect(page.getByText(/review only the platform questions already available inside your institute bank/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library/i }).first()).toBeVisible();
    await expect(linkedHowItWorksCard.locator("strong").filter({ hasText: /linked questions are not the same as package coverage/i }).first()).toBeVisible();
    await expect(page.getByText(/review platform source stock and remaining linkable rows topic by topic/i).first()).toBeVisible();
    await expect(linkedHowItWorksCard.locator("strong").filter({ hasText: /step 1: package coverage says what this institute is allowed to take/i }).first()).toBeVisible();
    await expect(linkedHowItWorksCard.locator("strong").filter({ hasText: /step 2: the shared library linker brings matching platform questions into the bank/i }).first()).toBeVisible();
    await expect(linkedHowItWorksCard.locator("strong").filter({ hasText: /step 3: linked questions shows only what is already available for your team right now/i }).first()).toBeVisible();

    await questionBank.selectAcademicFilters(/class 7/i, /science/i);
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/subject=/);
    await expect(page.getByText(/subject:\s*science/i).first()).toBeVisible();
    await expect(page.getByText(/filtered scope/i).first()).toBeVisible();
    await expect(
      page.getByText(/you are viewing only the selected academic slice/i).first(),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ hasText: /counts come from different stages|scope is filtered/i }).first(),
    ).toContainText(/linked questions shows already-added questions/i);

    const totalLinkedText = await page
      .locator(".builderSummaryCard")
      .filter({ hasText: /total linked rows in this filtered scope/i })
      .first()
      .locator("strong")
      .innerText();
    const totalLinkedQuestions = Number(totalLinkedText.replace(/[^\d]/g, ""));
    expect(totalLinkedQuestions).toBeGreaterThanOrEqual(900);
  });

  test("@workflow opbms can open the science linker, review topic coverage, and page through topic inventory", async ({
    page,
  }) => {
    const shell = new InstituteShellPage(page);
    const questionBank = new InstituteQuestionBankPage(page);
    const linker = new InstituteLibraryLinkerPage(page);

    await loginWithCredentials(page, opbmsCredentials, "institute");
    await shell.expectWorkspace();

    await questionBank.gotoLinked();
    await questionBank.expectLinkedLoaded();
    await questionBank.openSharedLibraryLinker();

    await expect(page).toHaveURL(/\/institute\/question-bank\/library-linker(?:\?.*)?$/);
    await linker.expectLoaded();
    await linker.applyScope(/class 7/i, /science/i);
    await linker.expectTopicCoverageVisible();

    await expect(page.getByText(/subject:\s*science/i).first()).toBeVisible();
    await expect(page.getByText(/topics with available source questions:/i).first()).toBeVisible();
    await expect(page.getByText(/this page is not for editing wording/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /show only topics still linkable/i })).toBeVisible();
    await expect(page.getByText(/available in platform bank/i).first()).toBeVisible();
    await expect(page.getByText(/already linked locally/i).first()).toBeVisible();
    await expect(page.getByText(/not yet added/i).first()).toBeVisible();
    await expect(page.getByText(/choose one topic only, especially for careful manual review/i).first()).toBeVisible();

    await linker.openFirstAvailableTopic();
    await linker.expectTopicReviewVisible();
    await linker.expectQuestionCardsVisible();
    await expect(page.getByText(/in platform library/i).first()).toBeVisible();
    await expect(page.getByText(/already linked/i).first()).toBeVisible();
    await expect(page.getByText(/this topic is showing/i).first()).toBeVisible();
    await expect(page.getByText(/not only questions already in the institute bank/i).first()).toBeVisible();
    await expect(page.getByText(/open linked rows for this topic when you want to review what the institute already has/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open linked rows for this topic/i })).toBeVisible();

    await expect(page.getByText(/rows per page:\s*100/i).first()).toBeVisible();
    await Promise.all([
      page.waitForURL(/library_page_size=25/),
      linker.setRowsPerPage("25"),
    ]);
    await expect(page.getByText(/rows per page:\s*25/i).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/search=acid/),
      linker.searchCurrentTopic("acid"),
    ]);
    await linker.expectTopicReviewVisible();

    const nextPage = linker.nextPageButton();
    if (await nextPage.isVisible().catch(() => false)) {
      await nextPage.click();
      await expect(page).toHaveURL(/library_page=2/);
      await expect(linker.previousPageButton()).toBeVisible();
    }
  });
});
