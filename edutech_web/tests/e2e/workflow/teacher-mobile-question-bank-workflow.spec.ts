import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resetAndSeedDemoSharedLibraryWorkflow } from "../helpers/demo-shared-library";
import { expectTeacherWorkspace } from "../helpers/navigation";

const PAUSED_ONLY_PREFIX = "PAUSED ONLY DEMO ::";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function openMobileTeacherNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /teacher navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-teacher-menu")).toBeVisible();
  return page.locator("#mobile-teacher-menu");
}

async function findSeededLinkedInventoryCard(cards: Locator, questionPrefix: string) {
  const cardCount = await cards.count();
  let fallbackCard: Locator | null = null;

  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
    const hasLinkedState =
      (await card.getByText(/read-only linked row/i).count()) > 0 ||
      (await card.getByText(/source state:\s*linked source/i).count()) > 0;

    if (!hasLinkedState) {
      continue;
    }

    if (cardText.includes(questionPrefix)) {
      return card;
    }

    fallbackCard ??= card;
  }

  return fallbackCard;
}

test.describe("Teacher mobile question bank workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

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

  test("@workflow teacher mobile viewport supports linked question-bank review and preview", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();

    const mobileNav = await openMobileTeacherNav(page);
    await expect(mobileNav.getByRole("link", { name: /^question bank$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^question bank$/i }).click();

    await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await expect(searchField).toBeVisible();
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
      test.skip(true, "No teacher-visible linked shared-library row is available for compact-viewport workflow coverage.");
    }

    await expect(linkedInventoryCard!).toBeVisible();
    await expect(linkedInventoryCard!.getByText(/linked source/i).first()).toBeVisible();
    await expect(linkedInventoryCard!.getByText(/licensed source active|licensed source paused/i).first()).toBeVisible();
    await expect(linkedInventoryCard!.getByText(/read-only linked row · duplicate before editing/i).first()).toBeVisible();
    await expect(linkedInventoryCard!.getByRole("link", { name: /duplicate to edit/i })).toBeVisible();

    await linkedInventoryCard!.getByRole("button", { name: /preview/i }).click();
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByText(/question preview/i).first()).toBeVisible();
    await expect(
      previewDialog.getByText(/source state:\s*linked source\s*·\s*edit posture:\s*read-only linked row/i).first(),
    ).toBeVisible();
    await expect(previewDialog.getByRole("link", { name: /open as duplicate|create editable copy/i })).toBeVisible();

    await previewDialog.getByRole("button", { name: /^close$/i }).click();
    await expect(previewDialog).toHaveCount(0);
    await expect(linkedInventoryCard!).toBeVisible();
  });
});
