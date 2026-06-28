import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

const unentitledSearchProbe = "UNENTITLED DEMO ::";

async function expectTruthfulBlockedSharedLibraryCard(targetCard: Locator) {
  await expect(
    targetCard.locator(".statusPill").filter({ hasText: /^(Subscription required|Quota exhausted)$/i }).first(),
  ).toBeVisible();
  await expect(
    targetCard.getByText(
      /no matching subscribed package was found for this local scope|matching subscribed packages were found, but their question quota is exhausted/i,
    ).first(),
  ).toBeVisible();
}

test.describe("Institute shared-library no-entitlement workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute admin sees truthful blocked shared-library state when no matching package exists", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(unentitledSearchProbe);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=UNENTITLED/);

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();

    const targetCard = sharedLibrarySection.locator(".questionBankCard").filter({
      hasText: unentitledSearchProbe,
    }).first();
    await expect(targetCard).toBeVisible();
    await expectTruthfulBlockedSharedLibraryCard(targetCard);
    await expect(targetCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(targetCard.getByRole("button", { name: /request access/i })).toHaveCount(0);
  });
});
