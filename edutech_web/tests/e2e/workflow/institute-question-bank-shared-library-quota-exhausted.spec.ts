import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

test.describe("Institute shared-library quota exhausted workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute admin sees truthful blocked shared-library state when quota is exhausted", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
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
        "No institute-visible shared-library card currently shows the quota exhausted state.",
      );
    }

    await expect(quotaExhaustedCard!.getByText(/quota exhausted/i).first()).toBeVisible();
    await expect(
      quotaExhaustedCard!.getByText(/matching subscribed packages were found, but their question quota is exhausted/i),
    ).toBeVisible();
    await expect(quotaExhaustedCard!.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(quotaExhaustedCard!.getByRole("button", { name: /request access/i })).toHaveCount(0);
    await expect(quotaExhaustedCard!.getByText(/scope mismatch/i)).toHaveCount(0);
  });
});
