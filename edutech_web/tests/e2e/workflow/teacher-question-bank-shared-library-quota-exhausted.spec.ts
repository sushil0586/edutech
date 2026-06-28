import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

async function findQuotaExhaustedSharedLibraryCard(cards: Locator) {
  const cardCount = await cards.count();

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const hasQuotaExhaustedPill = (await card.getByText(/quota exhausted/i).count()) > 0;

    if (hasQuotaExhaustedPill) {
      return card;
    }
  }

  return null;
}

test.describe("Teacher shared-library quota exhausted workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher sees truthful blocked shared-library state when quota is exhausted", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const sharedLibraryCards = sharedLibrarySection.locator(".questionBankCard");
    const quotaExhaustedCard = await findQuotaExhaustedSharedLibraryCard(sharedLibraryCards);

    if (!quotaExhaustedCard) {
      test.skip(
        true,
        "No teacher-visible shared-library card currently shows the quota exhausted state.",
      );
    }

    await expect(quotaExhaustedCard!.getByText(/quota exhausted/i).first()).toBeVisible();
    await expect(
      quotaExhaustedCard!.getByText(/matching subscribed packages were found, but their question quota is exhausted/i),
    ).toBeVisible();
    await expect(quotaExhaustedCard!.getByRole("button", { name: /request access/i })).toHaveCount(0);
    await expect(quotaExhaustedCard!.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(quotaExhaustedCard!.getByText(/scope mismatch/i)).toHaveCount(0);
  });
});
