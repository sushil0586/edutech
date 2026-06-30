import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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

async function gotoEconomyLane(page: Page, path: string, tabHref: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
  await expect(workspaceNav(page).locator(`a[href="${tabHref}"]`)).toHaveAttribute("aria-current", "page");
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
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

    await subsection.selectOption("policy");
    await expect(subsection).toHaveValue("policy");

    await expect(page.getByText(/current workspace lane/i).first()).toBeVisible();
    await expect(page.locator('a[href="/admin/institutes"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/settings"]').first()).toBeVisible();
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
    await offerDisclosure.locator("summary").click();
    await expect(offerDisclosure.getByText(/wallet code:/i)).toBeVisible();

    await referralCard.getByLabel(/reward side/i).selectOption("referrer");
    await expect(referralCard.getByLabel(/reward side/i)).toHaveValue("referrer");
    await referralCard.getByLabel(/program name/i).fill("Browser referral lane");
    await referralCard.getByRole("button", { name: /clear form/i }).click();
    await expect(referralCard.getByLabel(/program name/i)).toHaveValue("");
    const campaignDisclosure = firstDisclosure(referralCard, /view campaign details/i);
    await campaignDisclosure.locator("summary").click();
    await expect(campaignDisclosure.getByText(/reward side:/i)).toBeVisible();

    await rewardCard.getByLabel(/rule type/i).selectOption("score_threshold");
    await expect(rewardCard.getByLabel(/score threshold %/i)).toBeVisible();
    await rewardCard.getByLabel(/stars awarded/i).fill("12");
    await expect(rewardCard.getByLabel(/stars awarded/i)).toHaveValue("12");
    await expect(rewardCard.getByRole("button", { name: /create reward rule|update reward rule/i })).toBeVisible();
    const ruleDisclosure = firstDisclosure(rewardCard, /view rule details/i);
    await ruleDisclosure.locator("summary").click();
    await expect(ruleDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();
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
    await gateDisclosure.locator("summary").click();
    await expect(gateDisclosure.getByText(/content type:/i)).toBeVisible();

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

  test("@workflow browser coverage for question-bank package, visibility, and subscription-plan operations", async ({
    page,
  }) => {
    await gotoEconomyLane(page, "/admin/economy?tab=question-bank", "/admin/economy?tab=question-bank");

    const packageCard = economyCard(page, /create and edit question-bank packages and scope coverage/i);
    const visibilityCard = economyCard(
      page,
      /inspect package scope and institute access before changing subscription controls/i,
    );
    const subscriptionCard = economyCard(page, /create and edit recurring plans, cycles, and credit rules/i);

    await expect(packageCard).toBeVisible();
    await expect(visibilityCard).toBeVisible();
    await expect(subscriptionCard).toBeVisible();
    await page.getByText(/view lane guidance/i).click();
    await expect(page.getByText(/operate the sellable library/i)).toBeVisible();

    const packageWorkspaceView = packageCard.getByLabel(/question bank package workspace view/i);
    await expect(packageWorkspaceView).toHaveValue("editor");
    await expect(packageCard.getByLabel(/question bank package institute filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package type filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package status filter/i)).toBeVisible();
    await expect(packageCard.getByLabel(/question bank package rows to show/i)).toBeVisible();
    const packageIdentityGrid = packageCard.locator(".economyPackageFormGridPrimary").first();
    const packageDeliveryGrid = packageCard.locator(".economyPackageFormGridSecondary").first();
    await packageIdentityGrid.locator("select").nth(1).selectOption("topic_bundle");
    await packageDeliveryGrid.locator("select").nth(0).selectOption("platform");
    await packageDeliveryGrid.locator("select").nth(1).selectOption("materialize_on_entitlement");
    await expect(packageCard.getByText(/scope coverage rows/i)).toBeVisible();
    await packageWorkspaceView.selectOption("all");
    await expect(packageCard.getByText(/current package catalog/i)).toBeVisible();
    const coverageDisclosure = firstDisclosure(packageCard, /view coverage details/i);
    await coverageDisclosure.locator("summary").click();
    await expect(coverageDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();

    const datasetSelect = visibilityCard.getByRole("combobox", { name: /show dataset/i });
    await datasetSelect.selectOption("packages");
    await expect(visibilityCard.getByRole("combobox", { name: /package family/i })).toBeVisible();
    await expect(visibilityCard.getByRole("combobox", { name: /^ownership$/i })).toBeVisible();
    const packageScopeDisclosure = firstDisclosure(visibilityCard, /view package scope details/i);
    await packageScopeDisclosure.locator("summary").click();
    await expect(packageScopeDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();

    await datasetSelect.selectOption("features");
    await expect(visibilityCard.getByRole("combobox", { name: /feature status/i })).toBeVisible();
    const featureDisclosure = firstDisclosure(visibilityCard, /view feature grant details/i);
    await featureDisclosure.locator("summary").click();
    await expect(featureDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();

    await datasetSelect.selectOption("usage");
    await expect(visibilityCard.getByRole("combobox", { name: /usage action/i })).toBeVisible();
    const evidenceDisclosure = firstDisclosure(visibilityCard, /view evidence detail/i);
    await evidenceDisclosure.locator("summary").click();
    await expect(evidenceDisclosure.locator(".economyCatalogDetailStack")).toBeVisible();

    await visibilityCard.getByRole("button", { name: /reset filters/i }).click();
    await expect(datasetSelect).toHaveValue("entitlements");
    await expect(visibilityCard.getByRole("combobox", { name: /entitlement status/i })).toBeVisible();

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
    await commercialDisclosure.locator("summary").click();
    await expect(commercialDisclosure.getByText(/package scope:/i)).toBeVisible();
    const reconciliationDisclosure = firstDisclosure(subscriptionCard, /view access reconciliation/i);
    await reconciliationDisclosure.locator("summary").click();
    await expect(reconciliationDisclosure.getByText(/remediation:/i)).toBeVisible();
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
