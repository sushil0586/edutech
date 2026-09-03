import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);

type CreatePayload = {
  data?: {
    id?: string;
  };
  id?: string;
};

function economyCard(page: Page, heading: RegExp) {
  return page
    .locator("article.dashboardPanel")
    .filter({ has: page.getByRole("heading", { name: heading }) })
    .first();
}

function fieldContainer(scope: Locator, label: RegExp) {
  return scope.locator("label").filter({ hasText: label }).first();
}

function fieldInput(scope: Locator, label: RegExp) {
  return fieldContainer(scope, label).locator("input").first();
}

function fieldSelect(scope: Locator, label: RegExp) {
  return fieldContainer(scope, label).locator("select").first();
}

async function gotoEconomyLane(page: Page, tab: string, focus: string) {
  await page.goto(`/admin/economy?tab=${tab}&focus=${focus}`);
  await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
}

async function applyScopedInstitute(page: Page) {
  const scopeSelect = page.getByRole("combobox", { name: /institute scope/i });
  await expect(scopeSelect).toBeVisible();
  await expect
    .poll(async () =>
      scopeSelect.evaluate((element) =>
        element instanceof HTMLSelectElement ? element.options.length : 0,
      ),
    )
    .toBeGreaterThan(1);

  const instituteId = await scopeSelect.locator("option").evaluateAll((options) => {
    return (
      options
        .map((option) => (option as HTMLOptionElement).value)
        .find((value) => value.trim().length > 0) ?? ""
    );
  });
  expect(instituteId).toBeTruthy();
  await scopeSelect.selectOption(instituteId);
  await page.getByRole("button", { name: /apply filters|update view/i }).click();
  return instituteId;
}

test.describe("Admin economy CRUD guardrails", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin economy CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin star-pack form clears unsaved state and exits edit mode truthfully", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoEconomyLane(page, "catalog", "star-packs");
    const instituteId = await applyScopedInstitute(page);
    const starPackCard = economyCard(page, /create and edit live wallet pack offers/i);
    await expect(starPackCard).toBeVisible();
    const uniqueSeed = Date.now();
    const originalName = `PW Guardrail Pack ${uniqueSeed}`;
    const originalCode = `PW-GSP-${uniqueSeed}`;
    const unsavedName = `${originalName} Unsaved`;
    const unsavedCode = `${originalCode}-U`;
    let createdStarPackId: string | null = null;

    try {
      await fieldInput(starPackCard, /pack name/i).fill(unsavedName);
      await fieldInput(starPackCard, /pack code/i).fill(unsavedCode);
      await fieldInput(starPackCard, /stars credited/i).fill("333");
      await fieldInput(starPackCard, /price amount/i).fill("199.00");
      await fieldInput(starPackCard, /currency/i).fill("USD");
      await fieldInput(starPackCard, /sort order/i).fill("9");
      await starPackCard.getByRole("button", { name: /clear form/i }).click();

      await expect(fieldInput(starPackCard, /pack name/i)).toHaveValue("");
      await expect(fieldInput(starPackCard, /pack code/i)).toHaveValue("");
      await expect(fieldInput(starPackCard, /stars credited/i)).toHaveValue("100");
      await expect(fieldInput(starPackCard, /price amount/i)).toHaveValue("99.00");
      await expect(fieldInput(starPackCard, /currency/i)).toHaveValue("INR");
      await expect(fieldInput(starPackCard, /sort order/i)).toHaveValue("1");
      await expect(starPackCard.getByRole("button", { name: /create star pack/i })).toBeVisible();

      const createResponse = await page.request.post("/api/admin/economy/star-packs", {
        data: {
          institute: instituteId,
          name: originalName,
          code: originalCode,
          stars_credited: 145,
          price_amount: "149.00",
          currency: "INR",
          sort_order: 7,
          is_active: true,
          metadata: {
            source: "playwright-economy-guardrail",
          },
        },
      });
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as CreatePayload;
      createdStarPackId = createPayload.data?.id ?? createPayload.id ?? null;

      await page.reload();
      await expectAdminWorkspace(page);
      await gotoEconomyLane(page, "catalog", "star-packs");
      await expect(starPackCard).toBeVisible();

      const createdRow = starPackCard
        .locator(".weakTopicRow")
        .filter({ hasText: originalName })
        .filter({ hasText: originalCode })
        .first();
      await expect(createdRow).toBeVisible();

      await createdRow.getByRole("button", { name: /edit/i }).click();
      await expect(starPackCard.getByRole("button", { name: /update star pack/i })).toBeVisible();
      await expect(fieldInput(starPackCard, /pack name/i)).toHaveValue(originalName);
      await expect(fieldInput(starPackCard, /pack code/i)).toHaveValue(originalCode);

      await fieldInput(starPackCard, /pack name/i).fill(`${originalName} Edited`);
      await fieldInput(starPackCard, /pack code/i).fill(`${originalCode}-EDITED`);
      await fieldInput(starPackCard, /stars credited/i).fill("999");
      await starPackCard.getByRole("button", { name: /clear form/i }).click();

      await expect(starPackCard.getByRole("button", { name: /create star pack/i })).toBeVisible();
      await expect(fieldInput(starPackCard, /pack name/i)).toHaveValue("");
      await expect(fieldInput(starPackCard, /pack code/i)).toHaveValue("");
      await expect(createdRow).toContainText(originalName);
      await expect(createdRow).toContainText(originalCode);

      await createdRow.getByRole("button", { name: /edit/i }).click();
      await expect(fieldInput(starPackCard, /pack name/i)).toHaveValue(originalName);
      await expect(fieldInput(starPackCard, /pack code/i)).toHaveValue(originalCode);
    } finally {
      if (createdStarPackId) {
        await page.request.patch(`/api/admin/economy/star-packs/${createdStarPackId}`, {
          data: { is_active: false },
        }).catch(() => null);
      }
    }
  });

  test("@workflow @mutable admin referral form clears unsaved state and exits edit mode truthfully", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoEconomyLane(page, "catalog", "referrals");
    const instituteId = await applyScopedInstitute(page);
    const referralCard = economyCard(page, /create and edit referral campaigns and reward posture/i);
    await expect(referralCard).toBeVisible();
    const uniqueSeed = Date.now();
    const originalName = `PW Guardrail Referral ${uniqueSeed}`;
    const unsavedName = `${originalName} Unsaved`;
    let createdReferralId: string | null = null;

    try {
      await fieldInput(referralCard, /program name/i).fill(unsavedName);
      await fieldSelect(referralCard, /reward side/i).selectOption("referrer");
      await fieldInput(referralCard, /referrer stars/i).fill("80");
      await fieldInput(referralCard, /referee stars/i).fill("0");
      await fieldSelect(referralCard, /active status/i).selectOption("no");
      await referralCard.getByRole("button", { name: /clear form/i }).click();

      await expect(fieldInput(referralCard, /program name/i)).toHaveValue("");
      await expect(fieldSelect(referralCard, /reward side/i)).toHaveValue("both");
      await expect(fieldInput(referralCard, /referrer stars/i)).toHaveValue("50");
      await expect(fieldInput(referralCard, /referee stars/i)).toHaveValue("50");
      await expect(fieldSelect(referralCard, /active status/i)).toHaveValue("yes");
      await expect(referralCard.getByRole("button", { name: /create referral program/i })).toBeVisible();

      const createResponse = await page.request.post("/api/admin/economy/referral-programs", {
        data: {
          institute: instituteId,
          name: originalName,
          referrer_stars: 40,
          referee_stars: 25,
          reward_side: "both",
          valid_from: "2026-08-01T00:00:00Z",
          valid_until: "2026-12-31T00:00:00Z",
          metadata: {
            source: "playwright-economy-guardrail",
          },
          is_active: true,
        },
      });
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as CreatePayload;
      createdReferralId = createPayload.data?.id ?? createPayload.id ?? null;

      await page.reload();
      await expectAdminWorkspace(page);
      await gotoEconomyLane(page, "catalog", "referrals");
      await expect(referralCard).toBeVisible();

      const createdRow = referralCard
        .locator(".weakTopicRow")
        .filter({ hasText: originalName })
        .first();
      await expect(createdRow).toBeVisible();

      await createdRow.getByRole("button", { name: /edit/i }).click();
      await expect(referralCard.getByRole("button", { name: /update referral program/i })).toBeVisible();
      await expect(fieldInput(referralCard, /program name/i)).toHaveValue(originalName);
      await expect(fieldSelect(referralCard, /reward side/i)).toHaveValue("both");

      await fieldInput(referralCard, /program name/i).fill(`${originalName} Edited`);
      await fieldSelect(referralCard, /reward side/i).selectOption("referrer");
      await fieldInput(referralCard, /referrer stars/i).fill("91");
      await fieldInput(referralCard, /referee stars/i).fill("0");
      await referralCard.getByRole("button", { name: /clear form/i }).click();

      await expect(referralCard.getByRole("button", { name: /create referral program/i })).toBeVisible();
      await expect(fieldInput(referralCard, /program name/i)).toHaveValue("");
      await expect(fieldSelect(referralCard, /reward side/i)).toHaveValue("both");
      await expect(createdRow).toContainText(originalName);
      await expect(createdRow).toContainText(/referrer 40/i);
      await expect(createdRow).toContainText(/referee 25/i);

      await createdRow.getByRole("button", { name: /edit/i }).click();
      await expect(fieldInput(referralCard, /program name/i)).toHaveValue(originalName);
      await expect(fieldSelect(referralCard, /reward side/i)).toHaveValue("both");
    } finally {
      if (createdReferralId) {
        await page.request.patch(`/api/admin/economy/referral-programs/${createdReferralId}`, {
          data: { is_active: false },
        }).catch(() => null);
      }
    }
  });
});
