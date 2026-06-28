import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherSharedLibraryQuotaEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_QUOTA",
);
const quotaSearchProbe = "QUOTA LOCK DEMO ::";

test.describe("Teacher shared-library mutable quota exhausted flow", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.skip(
    !mutableTeacherSharedLibraryQuotaEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_SHARED_LIBRARY_QUOTA",
      "teacher shared-library quota exhausted coverage",
    ),
  );

  test("@workflow @mutable teacher sees deterministic quota exhausted shared-library state", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(quotaSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=QUOTA/);

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const targetCard = sharedLibrarySection.locator(".questionBankCard").filter({
      hasText: quotaSearchProbe,
    }).first();
    await expect(targetCard).toBeVisible();
    await expect(targetCard.getByText(/quota exhausted/i).first()).toBeVisible();
    await expect(
      targetCard.getByText(/matching subscribed packages were found, but their question quota is exhausted/i),
    ).toBeVisible();
    await expect(targetCard.getByRole("button", { name: /request access/i })).toHaveCount(0);
    await expect(targetCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
  });
});
