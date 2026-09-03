import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { InstituteLibraryLinkerPage } from "../page-objects/institute/institute-library-linker.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";
import { InstituteShellPage } from "../page-objects/institute/institute-shell.po";

const opbmsCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "obpms",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};

test.describe("Institute linked question and linker journey", () => {
  test("@workflow institute user can move from linked questions into the shared-library linker", async ({
    page,
  }) => {
    const shell = new InstituteShellPage(page);
    const questionBank = new InstituteQuestionBankPage(page);
    const linker = new InstituteLibraryLinkerPage(page);

    await loginWithCredentials(page, opbmsCredentials, "institute");
    await shell.expectWorkspace();

    await questionBank.gotoLinked();
    await questionBank.expectLinkedLoaded();
    await questionBank.expectLinkedScopeSummary();
    await expect(page.getByText(/rows on this page/i).first()).toBeVisible();
    await expect(page.getByText(/total linked rows in this filtered scope/i).first()).toBeVisible();
    await expect(page.getByText(/filters narrow what you see\. they do not remove access or delete rows/i).first()).toBeVisible();
    await expect(page.getByText(/read-only linked row · duplicate before editing/i).first()).toBeVisible();
    await expect(page.getByText(/linked questions are not the same as package coverage/i).first()).toBeVisible();
    await expect(
      page.getByText(/coverage tells your team what can be linked, not how many linked questions are already inside this bank/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/why questions are or are not visible/i).first()).toBeVisible();
    await expect(page.getByText(/shared-library switch/i).first()).toBeVisible();
    await expect(page.getByText(/question package access/i).first()).toBeVisible();
    await expect(page.getByText(/current class and subject filter/i).first()).toBeVisible();
    await expect(
      page.getByText(/step 3 is active: package access is valid\. stay here to review questions already linked into the institute bank/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/stay on one surface at a time/i).first()).toBeVisible();
    await expect(
      page.getByText(/current lane: linked questions/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/use this page for review and exam reuse/i).first()).toBeVisible();
    await expect(page.getByText(/create an editable local copy first/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open shared library linker/i }).first()).toBeVisible();

    await questionBank.openSharedLibraryLinker();
    await expect(page).toHaveURL(/\/institute\/question-bank\/library-linker(?:\?.*)?$/);
    await linker.expectLoaded();

    const programSelect = page.locator('select[name="program"]').first();
    const hasPrograms = (await programSelect.locator("option").count()) > 1;

    if (hasPrograms) {
      const subjectSelect = page.locator('select[name="subject"]').first();
      const hasSubjects = (await subjectSelect.locator("option").count()) > 1;

      if (hasSubjects) {
        await linker.applyScope(/class 7/i, /science|math|social science|computer|general knowledge/i);
        await linker.expectTopicCoverageVisible();
      } else {
        await linker.applyScope(/class 7/i);
        await expect(page.getByText(/subject:\s*not chosen yet/i).first()).toBeVisible();
      }
    }
  });
});
