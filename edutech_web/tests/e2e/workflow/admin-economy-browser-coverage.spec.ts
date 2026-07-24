import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);

type EconomyPolicyConfig = {
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_confirm_order_currency: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
  latest_audit?: {
    message?: string;
  } | null;
};

type EconomyPolicyConfigResponse = {
  data?: EconomyPolicyConfig;
  message?: string;
};

function extractLeadingNumber(value: string | null) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function extractPhraseNumber(value: string | null, phrase: RegExp) {
  const match = value?.match(phrase);
  return match?.[1] ? Number(match[1]) : null;
}

function economyCard(page: Page, heading: RegExp) {
  return page
    .locator("article.dashboardPanel")
    .filter({ has: page.getByRole("heading", { name: heading }) })
    .first();
}

function workspaceNav(page: Page) {
  return page.getByRole("navigation", { name: /economy workspace sections/i });
}

function firstDisclosure(card: Locator, label: RegExp) {
  return card.locator("details", { hasText: label }).first();
}

async function expandDisclosureIfPresent(
  disclosure: Locator,
  assertion?: (openedDisclosure: Locator) => Promise<void>,
) {
  if (!(await disclosure.count())) {
    return;
  }

  await disclosure.locator("summary").click();
  if (assertion) {
    await assertion(disclosure);
  }
}

async function gotoEconomyLane(page: Page, path: string, tabHref: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
  const targetTab = new URL(`http://localhost${tabHref}`).searchParams.get("tab");
  await expect(workspaceNav(page).locator(`a[href*="tab=${targetTab}"][aria-current="page"]`).first()).toBeVisible();
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () =>
      locator.evaluate((element) =>
        element instanceof HTMLSelectElement ? element.options.length : 0,
      ),
    )
    .toBeGreaterThan(0);
}

async function getNonEmptyOptionValues(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
}

async function expectLaneFocusControl(page: Page, expectedValue: string) {
  const subsection = page.getByRole("combobox", { name: /economy subsection/i });
  if (await subsection.count()) {
    await expectSelectHasOptions(subsection);
    await expect(subsection).toHaveValue(expectedValue);
    return;
  }

  const hiddenFocus = page.locator('input[type="hidden"][name="focus"]');
  await expect(hiddenFocus).toHaveValue(expectedValue);
}

test.describe("Admin economy browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage for overview lane scope and operator framing", async ({ page }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=overview", "/admin/economy?tab=overview");

    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /scope the page before reviewing data/i })).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/scan platform posture/i)).toBeVisible();
    await expect(page.getByText(/spot abnormal concentration/i)).toBeVisible();

    const instituteScope = page.getByRole("combobox", { name: /institute scope/i });
    const subsection = page.getByRole("combobox", { name: /economy subsection/i });
    await expectSelectHasOptions(instituteScope);
    await expectSelectHasOptions(subsection);
    const instituteOptions = await getNonEmptyOptionValues(instituteScope);
    expect(instituteOptions.length).toBeGreaterThan(0);
    await expect(instituteScope.locator("option")).toHaveCount(instituteOptions.length + 1);

    await subsection.selectOption("policy");
    await expect(subsection).toHaveValue("policy");

    await expect(page.getByText(/current workspace lane/i).first()).toBeVisible();
    await expect(page.locator('a[href="/admin/institutes"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();
  });

  test("@workflow browser coverage keeps economy scope filters hydrated across visible lanes", async ({
    page,
  }) => {
    const visibleLanes = [
      { tab: "overview", focus: "policy" },
      { tab: "catalog", focus: "star-packs" },
      { tab: "access-control", focus: "policies" },
      { tab: "question-bank", focus: "visibility" },
      { tab: "support-ops", focus: "student-support" },
      { tab: "bootstrap", focus: "all" },
    ] as const;

    for (const lane of visibleLanes) {
      await gotoEconomyLane(
        page,
        `/admin/economy?tab=${lane.tab}&focus=${lane.focus}`,
        `/admin/economy?tab=${lane.tab}`,
      );

      const instituteScope = page.getByRole("combobox", { name: /institute scope/i });
      await expectSelectHasOptions(instituteScope);

      const instituteOptions = await getNonEmptyOptionValues(instituteScope);
      expect(
        instituteOptions.length,
        `Expected ${lane.tab} lane to hydrate at least one institute option.`,
      ).toBeGreaterThan(0);
      await expect(
        instituteScope.locator("option"),
        `Expected ${lane.tab} lane to include All institutes plus hydrated institute options.`,
      ).toHaveCount(instituteOptions.length + 1);
      await expectLaneFocusControl(page, lane.focus);
    }
  });

  test("@workflow browser coverage can apply and reset overview scope filters truthfully", async ({
    page,
  }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=overview&focus=policy", "/admin/economy?tab=overview");

    const instituteScope = page.getByRole("combobox", { name: /institute scope/i });
    const subsection = page.getByRole("combobox", { name: /economy subsection/i });
    const instituteOptions = await getNonEmptyOptionValues(instituteScope);
    expect(instituteOptions.length).toBeGreaterThan(0);

    const selectedInstituteId = instituteOptions[0];
    await instituteScope.selectOption(selectedInstituteId);
    await subsection.selectOption("boundary");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          tab: url.searchParams.get("tab"),
          institute: url.searchParams.get("institute"),
          focus: url.searchParams.get("focus"),
        };
      })
      .toEqual({
        tab: "overview",
        institute: selectedInstituteId,
        focus: "boundary",
      });
    await expect(instituteScope).toHaveValue(selectedInstituteId);
    await expect(subsection).toHaveValue("boundary");
    await expect(page.locator("small").filter({ hasText: /currently scoped in this lane/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /reset scope/i }).click();
    await expect(page).toHaveURL(/\/admin\/economy\?tab=overview$/);
    await expect(instituteScope).toHaveValue("");
    await expect(subsection).toHaveValue("policy");
    await expect(page.getByText(/all institutes are currently in scope/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps admin economy scope and focus steady across reload and revisit", async ({
    page,
  }) => {
    await gotoEconomyLane(
      page,
      "/admin/economy?tab=question-bank&focus=packages",
      "/admin/economy?tab=question-bank",
    );

    const instituteScope = page.getByRole("combobox", { name: /institute scope/i });
    await expectSelectHasOptions(instituteScope);
    const instituteOptions = await getNonEmptyOptionValues(instituteScope);
    expect(instituteOptions.length).toBeGreaterThan(0);
    const selectedInstituteId = instituteOptions[0]!;

    await instituteScope.selectOption(selectedInstituteId);
    const subsection = page.getByRole("combobox", { name: /economy subsection/i });
    await subsection.selectOption("plans");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          tab: url.searchParams.get("tab"),
          institute: url.searchParams.get("institute"),
          focus: url.searchParams.get("focus"),
        };
      })
      .toEqual({
        tab: "question-bank",
        institute: selectedInstituteId,
        focus: "plans",
      });

    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);
    const subscriptionWorkspaceView = subscriptionCard.getByLabel(/subscription plan workspace view/i);
    const subscriptionRows = subscriptionCard.getByLabel(/subscription plan rows to show/i);
    await expect(subscriptionWorkspaceView).toHaveValue("editor");
    const subscriptionRowOptions = await getNonEmptyOptionValues(subscriptionRows);

    if (subscriptionRowOptions.length > 0) {
      const selectedRowCount = subscriptionRowOptions.includes("25")
        ? "25"
        : subscriptionRowOptions[subscriptionRowOptions.length - 1]!;

      await subscriptionRows.selectOption(selectedRowCount);
      await expect(subscriptionRows).toHaveValue(selectedRowCount);
      await expect(subscriptionCard.getByText(/question-bank package access/i).first()).toBeVisible();
    } else {
      await expect(
        subscriptionCard.getByText(/no subscription plans match the current catalog filters/i).first(),
      ).toBeVisible();
    }

    await page.reload();
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(
        `/admin/economy\\?tab=question-bank(?:&[^#]*)?focus=plans(?:&[^#]*)?institute=${selectedInstituteId}|/admin/economy\\?tab=question-bank(?:&[^#]*)?institute=${selectedInstituteId}(?:&[^#]*)?focus=plans`,
      ),
    );
    await expect(page.getByRole("combobox", { name: /institute scope/i })).toHaveValue(selectedInstituteId);
    await expectLaneFocusControl(page, "plans");
    await expect(subscriptionWorkspaceView).toHaveValue("editor");
    if (subscriptionRowOptions.length > 0) {
      await expect(subscriptionRows).toBeVisible();
      await expect(subscriptionCard.getByText(/question-bank package access/i).first()).toBeVisible();
    } else {
      await expect(
        subscriptionCard.getByText(/no subscription plans match the current catalog filters/i).first(),
      ).toBeVisible();
    }

    await page.goto(page.url());
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: /institute scope/i })).toHaveValue(selectedInstituteId);
    await expectLaneFocusControl(page, "plans");
    await expect(subscriptionWorkspaceView).toHaveValue("editor");
    if (subscriptionRowOptions.length > 0) {
      await expect(subscriptionRows).toBeVisible();
      await expect(subscriptionCard.getByText(/question-bank package access/i).first()).toBeVisible();
    } else {
      await expect(
        subscriptionCard.getByText(/no subscription plans match the current catalog filters/i).first(),
      ).toBeVisible();
    }
  });

  test("@workflow browser coverage keeps scoped support and question-bank counts internally consistent", async ({
    page,
  }) => {
    await gotoEconomyLane(
      page,
      "/admin/economy?tab=support-ops&focus=student-support",
      "/admin/economy?tab=support-ops",
    );

    const instituteScope = page.getByRole("combobox", { name: /institute scope/i });
    await expectSelectHasOptions(instituteScope);
    const instituteOptions = await getNonEmptyOptionValues(instituteScope);
    expect(instituteOptions.length).toBeGreaterThan(0);

    const selectedInstituteId = instituteOptions[0];
    await instituteScope.selectOption(selectedInstituteId);
    await page.getByRole("button", { name: /update view/i }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("institute"))
      .toBe(selectedInstituteId);

    const scopedSummary = page.locator(".studentInsightHeroCardCompact small").first();
    await expect(scopedSummary).toContainText(/students in scope/i);
    const scopedSummaryCount = extractPhraseNumber(
      await scopedSummary.textContent(),
      /(\d+)\s+students in scope/i,
    );

    const supportStudentsCard = page
      .locator(".resultsSummaryGrid .metricCard")
      .filter({ has: page.getByText(/^students in scope$/i) })
      .first();
    await expect(supportStudentsCard).toBeVisible();
    const supportStudentsCount = extractLeadingNumber(
      await supportStudentsCard.locator("strong").first().textContent(),
    );

    expect(scopedSummaryCount).not.toBeNull();
    expect(supportStudentsCount).not.toBeNull();
    expect(scopedSummaryCount).toBe(supportStudentsCount);

    await gotoEconomyLane(
      page,
      `/admin/economy?tab=question-bank&focus=packages&institute=${selectedInstituteId}`,
      "/admin/economy?tab=question-bank",
    );

    const packageStatus = page.getByText(/active packages in scope/i).first();
    await expect(packageStatus).toBeVisible();
    const packageStatusCount = extractPhraseNumber(
      await packageStatus.textContent(),
      /(\d+)\s+active packages in scope/i,
    );

    const packageMetricCard = page
      .locator(".resultsSummaryGrid .metricCard")
      .filter({ has: page.getByText(/^active packages$/i) })
      .first();
    await expect(packageMetricCard).toBeVisible();
    const packageMetricCount = extractLeadingNumber(
      await packageMetricCard.locator("strong").first().textContent(),
    );

    expect(packageStatusCount).not.toBeNull();
    expect(packageMetricCount).not.toBeNull();
    expect(packageStatusCount).toBe(packageMetricCount);
  });

  test("@workflow browser coverage for catalog governance cards and form controls", async ({ page }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=catalog", "/admin/economy?tab=catalog");

    const catalogCard = economyCard(
      page,
      /activate or pause live wallet, referral, and subscription catalog lanes/i,
    );
    const starPackCard = economyCard(page, /create and edit live wallet pack offers/i);
    const referralCard = economyCard(page, /create and edit referral campaigns and reward posture/i);
    const rewardCard = economyCard(page, /create and edit reward rules for signup, completion, and score ladders/i);

    await expect(catalogCard).toBeVisible();
    await expect(starPackCard).toBeVisible();
    await expect(referralCard).toBeVisible();
    await expect(rewardCard).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/shape the commercial offer/i)).toBeVisible();

    await expect(starPackCard.getByLabel(/pack name/i)).toBeVisible();
    await starPackCard.getByLabel(/pack name/i).fill("Browser smoke pack");
    await starPackCard.getByRole("button", { name: /clear form/i }).click();
    await expect(starPackCard.getByLabel(/pack name/i)).toHaveValue("");
    await expect(starPackCard.getByRole("button", { name: /create star pack|update star pack/i })).toBeVisible();
    const offerDisclosure = firstDisclosure(starPackCard, /view offer details/i);
    await expandDisclosureIfPresent(offerDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.getByText(/wallet code:/i)).toBeVisible();
    });

    await referralCard.getByLabel(/reward side/i).selectOption("referrer");
    await expect(referralCard.getByLabel(/reward side/i)).toHaveValue("referrer");
    await referralCard.getByLabel(/program name/i).fill("Browser referral lane");
    await referralCard.getByRole("button", { name: /clear form/i }).click();
    await expect(referralCard.getByLabel(/program name/i)).toHaveValue("");
    const campaignDisclosure = firstDisclosure(referralCard, /view campaign details/i);
    await expandDisclosureIfPresent(campaignDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.getByText(/reward side:/i)).toBeVisible();
    });

    await rewardCard.getByLabel(/rule type/i).selectOption("score_threshold");
    await expect(rewardCard.getByLabel(/score threshold %/i)).toBeVisible();
    await rewardCard.getByLabel(/stars awarded/i).fill("12");
    await expect(rewardCard.getByLabel(/stars awarded/i)).toHaveValue("12");
    await expect(rewardCard.getByRole("button", { name: /create reward rule|update reward rule/i })).toBeVisible();
    const ruleDisclosure = firstDisclosure(rewardCard, /view rule details/i);
    await expandDisclosureIfPresent(ruleDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    });
  });

  test("@workflow browser coverage for access-control policies, unlocks, and economy policy settings", async ({
    page,
  }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=access-control", "/admin/economy?tab=access-control");

    const accessCard = economyCard(page, /create and edit premium access policies by content target/i);
    const unlockCard = economyCard(page, /create and edit unlock rules by content target/i);
    const policyCard = economyCard(page, /institute-admin support limits/i);

    await expect(accessCard).toBeVisible();
    await expect(unlockCard).toBeVisible();
    await expect(policyCard).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/define runtime guardrails/i)).toBeVisible();

    const accessWorkspaceView = accessCard.getByLabel(/content access workspace view/i);
    await expect(accessWorkspaceView).toHaveValue("editor");
    await expect(accessCard.getByLabel(/content access institute filter/i)).toBeVisible();
    await expect(accessCard.getByLabel(/content access policy type filter/i)).toBeVisible();
    await expect(accessCard.getByLabel(/content access status filter/i)).toBeVisible();
    await expect(accessCard.getByLabel(/content access rows to show/i)).toBeVisible();
    const accessPolicyType = accessCard.locator(".economySubscriptionEditorPanel select").nth(2);
    await accessPolicyType.selectOption("stars_only");
    await expect(accessPolicyType).toHaveValue("stars_only");
    await accessCard.getByLabel(/star cost/i).fill("25");
    await expect(accessCard.getByLabel(/star cost/i)).toHaveValue("25");
    await expect(accessCard.getByRole("button", { name: /create access policy|update access policy/i })).toBeVisible();
    await accessWorkspaceView.selectOption("all");
    const gateDisclosure = firstDisclosure(accessCard, /view gate details/i);
    await expandDisclosureIfPresent(gateDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.getByText(/content type:/i)).toBeVisible();
    });

    const unlockWorkspaceView = unlockCard.getByLabel(/unlock rule workspace view/i);
    await expect(unlockWorkspaceView).toHaveValue("editor");
    await expect(unlockCard.getByLabel(/unlock rule institute filter/i)).toBeVisible();
    await expect(unlockCard.getByLabel(/unlock rule type filter/i)).toBeVisible();
    await expect(unlockCard.getByLabel(/unlock rule status filter/i)).toBeVisible();
    await expect(unlockCard.getByLabel(/unlock rule rows to show/i)).toBeVisible();
    await unlockCard.locator(".economySubscriptionEditorPanel select").nth(2).selectOption("entitlement");
    await unlockCard.getByLabel(/required entitlement code/i).fill("DEMO-ENTITLEMENT");
    await expect(unlockCard.getByLabel(/required entitlement code/i)).toHaveValue("DEMO-ENTITLEMENT");
    await expect(unlockCard.getByRole("button", { name: /create unlock rule|update unlock rule/i })).toBeVisible();

    await policyCard.getByLabel(/institute admin can grant stars/i).selectOption("no");
    await expect(policyCard.getByLabel(/institute admin can grant stars/i)).toHaveValue("no");
    await policyCard.getByLabel(/max stars per grant/i).fill("15");
    await expect(policyCard.getByLabel(/max stars per grant/i)).toHaveValue("15");
    await expect(policyCard.getByRole("button", { name: /save economy policy/i })).toBeVisible();
    await expect(policyCard.getByText(/policy history/i)).toBeVisible();
  });

  test("@workflow @mutable browser coverage can persist and restore admin economy policy controls", async ({
    page,
  }) => {
    test.skip(
      !mutableAdminEconomyActionsEnabled,
      mutableLaneMessage(
        "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
        "admin economy browser mutable policy coverage",
      ),
    );
    test.setTimeout(120000);

    const currentPolicyResponse = await page.request.get("/api/admin/economy/policy-config");
    expect(currentPolicyResponse.ok()).toBe(true);
    const currentPolicy = (await currentPolicyResponse.json()) as EconomyPolicyConfig;

    const nextPolicy = {
      institute_admin_can_grant_stars: !currentPolicy.institute_admin_can_grant_stars,
      institute_admin_max_grant_stars: Math.max(
        1,
        currentPolicy.institute_admin_max_grant_stars +
          (currentPolicy.institute_admin_max_grant_stars >= 999 ? -5 : 5),
      ),
      institute_admin_can_confirm_orders: !currentPolicy.institute_admin_can_confirm_orders,
      institute_admin_max_confirm_order_amount: (
        Number(currentPolicy.institute_admin_max_confirm_order_amount) + 111.11
      ).toFixed(2),
    };

    try {
      await gotoEconomyLane(page, "/admin/economy?tab=access-control", "/admin/economy?tab=access-control");

      const policyCard = economyCard(page, /institute-admin support limits/i);
      await expect(policyCard).toBeVisible();

      await policyCard
        .getByLabel(/institute admin can grant stars/i)
        .selectOption(nextPolicy.institute_admin_can_grant_stars ? "yes" : "no");
      await policyCard
        .getByLabel(/max stars per grant/i)
        .fill(String(nextPolicy.institute_admin_max_grant_stars));
      await policyCard
        .getByLabel(/institute admin can confirm orders/i)
        .selectOption(nextPolicy.institute_admin_can_confirm_orders ? "yes" : "no");
      await policyCard
        .getByLabel(/max order amount/i)
        .fill(nextPolicy.institute_admin_max_confirm_order_amount);

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/economy/policy-config") &&
          response.request().method() === "PATCH",
      );

      await policyCard.getByRole("button", { name: /save economy policy/i }).click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.ok()).toBe(true);

      const updateBody = (await updateResponse.json()) as EconomyPolicyConfigResponse;
      expect(updateBody.data?.institute_admin_can_grant_stars).toBe(
        nextPolicy.institute_admin_can_grant_stars,
      );
      expect(updateBody.data?.institute_admin_max_grant_stars).toBe(
        nextPolicy.institute_admin_max_grant_stars,
      );
      expect(updateBody.data?.institute_admin_can_confirm_orders).toBe(
        nextPolicy.institute_admin_can_confirm_orders,
      );
      expect(updateBody.data?.institute_admin_max_confirm_order_amount).toBe(
        nextPolicy.institute_admin_max_confirm_order_amount,
      );

      await expect(policyCard.getByText(/economy operator policy updated successfully\./i)).toBeVisible();

      const persistedPolicyResponse = await page.request.get("/api/admin/economy/policy-config");
      expect(persistedPolicyResponse.ok()).toBe(true);
      const persistedPolicy = (await persistedPolicyResponse.json()) as EconomyPolicyConfig;
      expect(persistedPolicy.institute_admin_can_grant_stars).toBe(
        nextPolicy.institute_admin_can_grant_stars,
      );
      expect(persistedPolicy.institute_admin_max_grant_stars).toBe(
        nextPolicy.institute_admin_max_grant_stars,
      );
      expect(persistedPolicy.institute_admin_can_confirm_orders).toBe(
        nextPolicy.institute_admin_can_confirm_orders,
      );
      expect(persistedPolicy.institute_admin_max_confirm_order_amount).toBe(
        nextPolicy.institute_admin_max_confirm_order_amount,
      );
    } finally {
      const restoreResponse = await page.request.patch("/api/admin/economy/policy-config", {
        data: {
          institute_admin_can_grant_stars: currentPolicy.institute_admin_can_grant_stars,
          institute_admin_max_grant_stars: currentPolicy.institute_admin_max_grant_stars,
          institute_admin_can_confirm_orders: currentPolicy.institute_admin_can_confirm_orders,
          institute_admin_max_confirm_order_amount:
            currentPolicy.institute_admin_max_confirm_order_amount,
        },
      });
      expect(restoreResponse.ok()).toBe(true);
    }
  });

  test("@workflow browser coverage for question-bank package, visibility, and subscription-plan operations", async ({
    page,
  }) => {
    await gotoEconomyLane(
      page,
      "/admin/economy?tab=question-bank&focus=all",
      "/admin/economy?tab=question-bank",
    );

    const packageCard = economyCard(page, /create and edit question-bank packages and scope coverage/i);
    const visibilityCard = economyCard(
      page,
      /check package coverage and institute access before changing live access/i,
    );
    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);

    await expect(packageCard).toBeVisible();
    await expect(visibilityCard).toBeVisible();
    await expect(subscriptionCard).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/operate the sellable library/i)).toBeVisible();
    const operatorGlossary = visibilityCard.getByTestId("economy-operator-glossary");
    await expect(operatorGlossary).toBeVisible();
    await expect(operatorGlossary).toContainText(/package/i);
    await expect(operatorGlossary).toContainText(/institute access row/i);
    await expect(operatorGlossary).toContainText(/shared-library switch/i);
    await expect(operatorGlossary).toContainText(/linked or visible questions/i);
    const topAccessChain = visibilityCard.getByTestId("economy-access-chain-health");
    await expect(topAccessChain).toBeVisible();
    await expect(topAccessChain.getByText(/1\. package coverage/i)).toBeVisible();
    await expect(topAccessChain.getByText(/2\. institute entitlement|2\. institute access/i)).toBeVisible();
    await expect(topAccessChain.getByText(/3\. shared-library runtime|3\. shared-library switch/i)).toBeVisible();
    await expect(topAccessChain.getByText(/4\. operator verdict/i)).toBeVisible();
    await expect(visibilityCard.getByText(/coverage first, then institute access, then shared-library switch/i)).toBeVisible();
    const topDiagnosis = visibilityCard.getByTestId("economy-operator-diagnosis");
    await expect(topDiagnosis).toBeVisible();
    await expect(topDiagnosis).toContainText(/start with one package before diagnosing access|coverage review in progress|access chain looks healthy|shared-library switches are the current gap/i);
    await expect(topDiagnosis).toContainText(/next action:/i);

    const packageWorkspaceView = packageCard.getByLabel(/question bank package workspace view/i);
    await expect(packageWorkspaceView).toHaveValue("catalog");
    await expect(packageCard.getByText(/current package catalog/i)).toBeVisible();
    await packageWorkspaceView.selectOption("editor");
    await expect(packageWorkspaceView).toHaveValue("editor");
    await expect(packageCard.getByLabel(/question bank package institute filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package type filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package status filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package rows to show/i)).toBeVisible();
    await expect(packageCard.getByTestId("package-scope-readiness")).toBeVisible();
    await expect(packageCard.getByText(/1\. package promise/i)).toBeVisible();
    await expect(packageCard.getByText(/2\. coverage safety/i)).toBeVisible();
    await expect(packageCard.getByText(/3\. institute expectation/i)).toBeVisible();
    await expect(packageCard.getByText(/4\. save confidence/i)).toBeVisible();
    const packageIdentityGrid = packageCard.locator(".economyPackageFormGridPrimary").first();
    const packageDeliveryGrid = packageCard.locator(".economyPackageFormGridSecondary").first();
    await packageIdentityGrid.locator("select").nth(1).selectOption("topic_bundle");
    await packageDeliveryGrid.locator("select").nth(0).selectOption("platform");
    await packageDeliveryGrid.locator("select").nth(1).selectOption("materialize_on_entitlement");
    await expect(packageCard.getByText(/package coverage rows/i)).toBeVisible();
    await expect(packageCard.getByText(/not ready to save|ready for package save/i)).toBeVisible();
    await packageWorkspaceView.selectOption("all");
    await expect(packageWorkspaceView).toHaveValue("all");
    await expect(packageCard.getByText(/current package catalog/i)).toBeVisible();
    const coverageDisclosure = firstDisclosure(packageCard, /view coverage details/i);
    await expandDisclosureIfPresent(coverageDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    });

    const datasetSelect = visibilityCard.getByRole("combobox", { name: /show dataset/i });
    await datasetSelect.selectOption("packages");
    await expect(visibilityCard.getByRole("combobox", { name: /package family/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /^ownership$/i })).toBeVisible();
    const packageScopeDisclosure = firstDisclosure(visibilityCard, /view package scope details/i);
    await expandDisclosureIfPresent(packageScopeDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    });

    await datasetSelect.selectOption("features");
    await expect(visibilityCard.getByText(/institute shared-library switches/i).first()).toBeVisible();
    const runtimeSwitchHint = visibilityCard.getByText(/this runtime switch/i).first();
    if (await runtimeSwitchHint.count()) {
      await expect(runtimeSwitchHint).toBeVisible();
    }
    await expect(visibilityCard.getByRole("combobox", { name: /feature status/i })).toBeVisible();
    const featureDisclosure = firstDisclosure(visibilityCard, /view feature grant details/i);
    await expandDisclosureIfPresent(featureDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    });

    await datasetSelect.selectOption("usage");
    await expect(visibilityCard.getByRole("combobox", { name: /usage action/i })).toBeVisible();
    const evidenceDisclosure = firstDisclosure(visibilityCard, /view evidence detail/i);
    await expandDisclosureIfPresent(evidenceDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
    });

    await visibilityCard.getByRole("button", { name: /reset filters/i }).click();
    await expect(datasetSelect).toHaveValue("entitlements");
    await expect(
      visibilityCard.getByRole("combobox", { name: /entitlement status|institute access status/i }),
    ).toBeVisible();
    await expect(visibilityCard.getByText(/how to diagnose missing institute access/i)).toBeVisible();
    await expect(topDiagnosis).toContainText(/next action:/i);
    const firstEntitlementRow = visibilityCard.locator('[data-testid^="entitlement-row-"]').first();
    if (await firstEntitlementRow.count()) {
      await expect(firstEntitlementRow).toBeVisible();
      const firstAccessChain = firstEntitlementRow.locator('[data-testid^="entitlement-access-chain-"]').first();
      await expect(firstAccessChain).toBeVisible();
      await expect(firstAccessChain.getByText(/1\. package coverage/i)).toBeVisible();
      await expect(firstAccessChain.getByText(/2\. institute entitlement/i)).toBeVisible();
      await expect(firstAccessChain.getByText(/3\. shared-library runtime/i)).toBeVisible();
      await expect(firstAccessChain.getByText(/4\. operator verdict/i)).toBeVisible();
    }

    const exportButton = visibilityCard.getByRole("button", { name: /export package report/i });
    await expect(exportButton).toBeVisible();
    await page.route("**/api/admin/economy/question-bank-package-report?**", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="question-bank-package-report.csv"',
        },
        body: "package_code,package_name\nSMOKE_EXPORT,Smoke Export Package\n",
      });
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ]);
    expect(await download.suggestedFilename()).toBe("question-bank-package-report.csv");
    await page.unroute("**/api/admin/economy/question-bank-package-report?**");

    await expect(subscriptionCard.locator("select").first()).toBeVisible();
    const subscriptionWorkspaceView = subscriptionCard.getByLabel(/subscription plan workspace view/i);
    await expect(subscriptionWorkspaceView).toHaveValue("editor");
    await expect(subscriptionCard.getByLabel(/subscription plan institute filter/i)).toBeVisible();
    await expect(subscriptionCard.getByLabel(/subscription plan status filter/i)).toBeVisible();
    await expect(subscriptionCard.getByLabel(/subscription plan rows to show/i)).toBeVisible();
    await expect(subscriptionCard.locator('input[type="text"]').nth(0)).toBeVisible();
    await expect(subscriptionCard.locator('input[type="text"]').nth(1)).toBeVisible();
    await expect(subscriptionCard.getByText(/question-bank package access/i).first()).toBeVisible();
    await expect(subscriptionCard.getByRole("button", { name: /create subscription plan|update subscription plan/i })).toBeVisible();
    await subscriptionWorkspaceView.selectOption("all");
    const commercialDisclosure = firstDisclosure(subscriptionCard, /view commercial details/i);
    await expandDisclosureIfPresent(commercialDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.getByText(/package scope:/i)).toBeVisible();
    });
    const reconciliationDisclosure = firstDisclosure(subscriptionCard, /view access reconciliation/i);
    await expandDisclosureIfPresent(reconciliationDisclosure, async (openedDisclosure) => {
      await expect(openedDisclosure.getByText(/remediation:/i)).toBeVisible();
    });
  });

  test("@workflow browser coverage for support-ops request queue and student support tools", async ({ page }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=support-ops", "/admin/economy?tab=support-ops");

    const requestCard = economyCard(page, /institute subscription request queue/i);
    const supportCard = economyCard(page, /inspect wallet state and perform controlled admin actions/i);

    await expect(requestCard).toBeVisible();
    await expect(supportCard).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/resolve active operator queues/i)).toBeVisible();

    await expect(requestCard.getByRole("heading", { name: /pending requests/i })).toBeVisible();
    await expect(requestCard.getByLabel(/institute subscription request queue view/i)).toBeVisible();
    await expect(requestCard.getByLabel(/institute subscription request rows to show/i)).toBeVisible();
    await requestCard.getByLabel(/institute subscription request queue view/i).selectOption("all");
    await expect(requestCard.getByRole("heading", { name: /fulfilled requests/i })).toBeVisible();
    await expect(requestCard.getByRole("heading", { name: /rejected requests/i })).toBeVisible();

    const studentSelect = supportCard.locator(".setupFormGrid").nth(1).locator("select").first();
    await expectSelectHasOptions(studentSelect);
    await expect(supportCard.getByLabel(/stars to grant/i)).toBeVisible();
    await supportCard.getByLabel(/institute economy workspace view/i).selectOption("all");
    await supportCard.getByLabel(/support view/i).selectOption("all");
    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await supportCard.getByLabel(/stars to grant/i).fill("30");
    await supportCard.getByLabel(/reference/i).last().fill("PW-BROWSER-COVERAGE");
    await supportCard.getByLabel(/reason/i).last().fill("");
    await supportCard.getByRole("button", { name: /grant stars/i }).click();
    await expect(supportCard.getByText(/enter a clear reason for the grant/i)).toBeVisible();
  });

  test("@workflow browser coverage for bootstrap seed guidance and command-path visibility", async ({ page }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=bootstrap", "/admin/economy?tab=bootstrap");

    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/prepare environment state/i)).toBeVisible();
    await expect(page.getByText(/seed groups/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /economy scenarios grouped by rollout lane/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /how to stage the seed rollout/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /recommended seed command flow/i })).toBeVisible();
    await expect(page.getByText(/seed_master_economy/i).first()).toBeVisible();
    await expect(page.getByText(/mandatory phase 1 seeds/i).first()).toBeVisible();
  });
});
