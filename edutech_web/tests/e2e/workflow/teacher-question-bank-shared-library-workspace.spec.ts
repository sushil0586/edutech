import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { expectQuestionBankAcademicDependencyChain } from "../helpers/question-bank-academics";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectSharedLibrarySection(page: Page) {
  await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

  const section = page.locator("section.contentCard").filter({
    has: page.getByRole("heading", { name: /shared platform library/i }),
  }).first();
  await expect(section).toBeVisible();  
  await section.scrollIntoViewIfNeeded();

  const loadingLane = section.getByText(/loading current lane/i).first();
  await expect
    .poll(async () => loadingLane.isVisible().catch(() => false), { timeout: 30000 })
    .toBe(false);

  const sharedLibraryLocked = await section
    .getByText(/shared platform library is not enabled for your institute subscription yet/i)
    .first()
    .isVisible()
    .catch(() => false);

  if (sharedLibraryLocked) {
    await expect(
      section.getByText(/shared platform library is not enabled for your institute subscription yet/i).first(),
    ).toBeVisible();
    return;
  }

  const cards = section.locator(".questionBankCard");
  const emptyState = section.getByText(/no shared library questions match this scope/i).first();
  await expect
    .poll(async () => {
      const firstCardVisible = await cards.first().isVisible().catch(() => false);
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      return firstCardVisible || emptyStateVisible;
    })
    .toBe(true);

  if (await cards.first().isVisible().catch(() => false)) {
    await expect(cards.first()).toBeVisible();
    await expect(
      section.getByText(
        /access available|subscription required|request pending|scope mismatch|already linked/i,
      ).first(),
    ).toBeVisible();
    await expect(section.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
  } else {
    await expect(emptyState).toBeVisible();
  }
}

test.describe("Teacher question bank shared library workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can inspect the shared library lane from question bank", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await gotoWithRuntimeRecovery(page, "/teacher/question-bank");
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i)).toBeVisible();
    await expect(page.getByText(/how licensed platform questions work here/i).first()).toBeVisible();
    await expect(
      page.getByText(
        /this panel answers three operator questions quickly: can teachers see platform questions, can they act on them, and who owns the final linking step/i,
      ).first(),
    ).toBeVisible();
    await expect(page.getByText(/platform question visibility is enabled/i).first()).toBeVisible();
    await expect(
      page.getByText(
        /teachers can review platform-backed rows only when the institute package lane also matches the current class and subject/i,
      ).first(),
    ).toBeVisible();
    await expect(page.getByText(/teacher action path/i).first()).toBeVisible();
    await expect(
      page.getByText(
        /teachers do not perform the final link here\..*teacher lane stays request-only and the institute admin still approves or performs the intake step/i,
      ).first(),
    ).toBeVisible();
    await expect(page.getByText(/teacher role in licensed intake/i).first()).toBeVisible();
    await expect(
      page.getByText(
        /institute admins complete the final linking step in shared library linker.*once that happens, teachers should switch to linked questions/i,
      ).first(),
    ).toBeVisible();

    await expectSharedLibrarySection(page);

    const searchField = page.getByTestId("question-bank-search-input");
    await searchField.fill("algebra");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/search=algebra/);
    await expect(searchField).toHaveValue("algebra");
    await expect(page.getByText(/search: active/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();
  });

  test("@workflow teacher question bank hydrates academic filters without waiting for apply", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
    await gotoWithRuntimeRecovery(page, "/teacher/question-bank", 8);
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expectQuestionBankAcademicDependencyChain(page);
  });
});
