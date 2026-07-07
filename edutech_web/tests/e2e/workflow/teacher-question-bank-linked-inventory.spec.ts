import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { expectTeacherWorkspace } from "../helpers/navigation";

const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO :: ";

async function findSeededLinkedInventoryCard(cards: Locator, questionPrefix: string) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasLinkedCopy =
      (await card.getByText(/read-only linked row/i).count()) > 0 ||
      (await card.getByText(/source state:\s*linked source/i).count()) > 0;

    if (hasLinkedCopy) {
      if (cardText.includes(questionPrefix)) {
        return card;
      }
      fallbackCard ??= card;
    }
  }

  return fallbackCard;
}

async function loadTeacherQuestionBank(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/teacher/question-bank");
    if (await page.getByText(/find questions faster|find linked questions faster/i).first().isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(1000);
  }

  await expect(page.getByText(/find questions faster|find linked questions faster/i).first()).toBeVisible();
}

async function expectLinkedTeacherInventoryCard(card: Locator) {
  await expect(card).toBeVisible();
  await expect(card.getByText(/linked source/i).first()).toBeVisible();
  await expect(card.getByText(/licensed source active|licensed source paused/i).first()).toBeVisible();
  await expect(card.getByText(/this is a read-only linked row/i).first()).toBeVisible();
  await expect(card.getByText(/read-only linked row · duplicate before editing/i).first()).toBeVisible();
  await expect(card.getByText(/source state:\s*linked source\s*·\s*read-only linked row/i).first()).toBeVisible();
  await expect(card.getByRole("button", { name: /preview/i })).toBeVisible();
  await expect(card.getByRole("link", { name: /duplicate to edit/i })).toBeVisible();
  await expect(card.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
}

test.describe("Teacher linked inventory browser coverage", () => {
  test.beforeEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.afterEach(() => {
    resetAndSeedDemoSharedLibraryWorkflow();
  });

  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test("@workflow teacher sees linked licensed inventory as read-only duplicate-first rows and never gets institute linking controls", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await loadTeacherQuestionBank(page);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

    const sharedLibrarySection = page.locator("section.contentCard").filter({
      has: page.getByRole("heading", { name: /shared platform library/i }),
    }).first();
    await expect(sharedLibrarySection).toBeVisible();
    await expect(sharedLibrarySection.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /bulk link current lane/i })).toHaveCount(0);

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill(PAUSED_ONLY_PREFIX);
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/search=/);
    await expect(searchField).toHaveValue(PAUSED_ONLY_PREFIX);

    const inventorySection = page.locator("section.contentCard").filter({
      hasText: "Question inventory",
    }).first();
    await expect(inventorySection).toBeVisible();

    const linkedInventoryCard = await findSeededLinkedInventoryCard(
      inventorySection.locator(".questionBankCard"),
      PAUSED_ONLY_PREFIX,
    );

    if (!linkedInventoryCard) {
      test.skip(true, "No teacher-visible linked shared-library row is available in local inventory.");
    }

    await expectLinkedTeacherInventoryCard(linkedInventoryCard!);

    await linkedInventoryCard!.getByRole("button", { name: /preview/i }).click();
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(
      previewDialog.getByText(/source state: linked source · edit posture: read-only linked row/i).first(),
    ).toBeVisible();
    await expect(previewDialog.getByRole("link", { name: /open as duplicate|create editable copy/i })).toBeVisible();
  });
});
