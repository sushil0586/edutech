import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

const seededMixedStateProbe = "DEMO ::";
const impossibleSearchProbe = "playwright-bulk-recovery-empty-zzqv-1781";
const seededTopicName = "Triangle Properties";

async function linkerReviewSection(page: Page) {
  return page.locator("section.contentCard").filter({
    hasText: /step 3\. review and link platform source questions/i,
  }).first();
}

async function findCardWithButton(cards: Locator, buttonName: RegExp) {
  const cardCount = await cards.count();
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    if ((await card.getByRole("button", { name: buttonName }).count()) > 0) {
      return card;
    }
  }
  return null;
}

async function findCardWithText(cards: Locator, pattern: RegExp) {
  const cardCount = await cards.count();
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    if ((await card.getByText(pattern).count()) > 0) {
      return card;
    }
  }
  return null;
}

async function findLinkedStateCard(cards: Locator) {
  const linkedPatterns = [
    /already linked locally/i,
    /already linked/i,
    /already in institute bank/i,
    /not addable in this lane/i,
  ];
  const cardCount = await cards.count();
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index);
    for (const pattern of linkedPatterns) {
      if ((await card.getByText(pattern).count()) > 0) {
        return card;
      }
    }
    if ((await card.getByRole("button", { name: /add to institute bank/i }).count()) === 0) {
      if ((await card.getByText(/package:/i).count()) > 0) {
        return card;
      }
    }
  }
  return null;
}

test.describe("Institute bulk eligibility and recovery coverage", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can read ready-vs-linked shared-library states and recover after narrowing filters too far", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.locator("form.questionBankBulkBar").first()).toBeVisible();
    await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();
    await expect(
      page.getByText(/use the linker only when the current bank is not enough and this institute needs additional platform-backed stock/i).first(),
    ).toBeVisible();
    await page.getByRole("link", { name: /open shared library linker/i }).first().click();

    await expect(page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(page.getByText(/step 1\. choose class and subject/i).first()).toBeVisible();
    const programSelect = page.getByRole("combobox", { name: /^program$/i });
    await programSelect.selectOption({ label: "Class 7" });
    await page.getByRole("button", { name: /load topics/i }).click();
    await expect(page).toHaveURL(/program=/);
    const subjectSelect = page.getByRole("combobox", { name: /^subject$/i });
    await expect(subjectSelect).toBeEnabled();
    await expect(subjectSelect.locator("option", { hasText: /^Math$/ })).toHaveCount(1);
    await subjectSelect.selectOption({ label: "Math" });
    await page.getByRole("button", { name: /load topics/i }).click();
    await expect(page.getByText(/step 2\. pick one topic/i).first()).toBeVisible();
    const seededTopicCard = page.locator(".questionBankCard").filter({
      hasText: new RegExp(seededTopicName, "i"),
    }).first();
    const seededTopicLink = seededTopicCard.getByRole("link", { name: /review this topic|currently open/i });
    const seededTopicHref = await seededTopicLink.getAttribute("href");

    expect(seededTopicHref).toBeTruthy();
    await page.goto(seededTopicHref!);
    await expect(page).toHaveURL(/topic=/);
    await expect(page.getByText(/step 3\. review and link platform source questions/i).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^topic$/i })).not.toHaveValue("");

    const unfilteredSection = await linkerReviewSection(page);
    await expect(unfilteredSection).toBeVisible();
    const unfilteredCards = unfilteredSection.locator(".questionBankCard");
    const readyCard = await findCardWithButton(unfilteredCards, /add to institute bank/i);

    expect(readyCard).not.toBeNull();
    await expect(readyCard!).toBeVisible();
    await expect(readyCard!.getByRole("button", { name: /add to institute bank/i })).toBeVisible();
    await expect(readyCard!.getByText(/package:/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /select all ready questions/i })).toBeEnabled();

    const searchField = page.getByRole("textbox", { name: /search current topic/i });
    await searchField.fill(seededMixedStateProbe);
    await page.getByRole("button", { name: /show questions/i }).click();

    await expect(page).toHaveURL(/topic=/);
    await expect(page).toHaveURL(/search=/);
    await expect(searchField).toHaveValue(seededMixedStateProbe);

    const section = await linkerReviewSection(page);
    await expect(section).toBeVisible();
    const cards = section.locator(".questionBankCard");

    const linkedCard = await findLinkedStateCard(cards);
    if (linkedCard) {
      await expect(linkedCard).toBeVisible();
      await expect(linkedCard.getByRole("button", { name: /add to institute bank/i })).toHaveCount(0);
      await expect(
        linkedCard
          .getByText(/already linked locally|already linked|already in institute bank|not addable in this lane/i)
          .first(),
      ).toBeVisible();
      await expect(linkedCard.getByText(/package:/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/already linked locally:\s*[1-9]\d*/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open linked questions for this scope/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open linked rows for this topic/i }).first()).toBeVisible();
      await expect(cards.first().getByRole("button", { name: /add to institute bank/i })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /select all ready questions/i })).toBeVisible();

    await searchField.fill(impossibleSearchProbe);
    await page.getByRole("button", { name: /show questions/i }).click();

    await expect(page).toHaveURL(new RegExp(`search=${impossibleSearchProbe}`));
    await expect(page.getByText(/step 1\. choose class and subject/i).first()).toBeVisible();
    await expect(page.getByText(/step 2\. pick one topic/i).first()).toBeVisible();
    await expect(
      page.getByText(/if this page looks empty, first ask whether package access is missing, the topic is unseeded, or the current filters are too narrow/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /open linked questions for this scope/i }).first(),
    ).toBeVisible();

    await searchField.fill("");
    await page.getByRole("button", { name: /show questions/i }).click();
    await expect(page).toHaveURL(/search=/);
    await expect(section.locator(".questionBankCard").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /select all ready questions/i })).toBeEnabled();
    await expect(searchField).toHaveValue("");
  });
});
