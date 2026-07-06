import { expect, test } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminEconomyQuestionBankPage } from "../page-objects/admin/admin-economy-question-bank.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const opbmsCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_USERNAME?.trim() || "opbms",
  password: process.env.PLAYWRIGHT_OPBMS_PASSWORD?.trim() || "Demo@12345",
};

type AdminQuestionBankPackage = {
  id: string;
  code: string;
  name: string;
  scopes: Array<{
    program_name: string | null;
    subject_name: string | null;
    topic_name: string | null;
  }>;
};

type AdminQuestionBankEntitlement = {
  id: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

test.describe("Admin question-bank OPBMS science scope coverage", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin OPBMS question-bank scope coverage",
    ),
  );

  test("@workflow @mutable admin can cover OPBMS science package scope and restore usable entitlement", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = (
      await page.context().cookies()
    ).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
    expect(adminAccessToken).not.toBe("");

    const packagesResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(packagesResponse.ok(), await packagesResponse.text()).toBe(true);
    const packages = (await packagesResponse.json()) as AdminQuestionBankPackage[];
    const scholarPackage = packages.find((pkg) => pkg.code === "SCHOLAR-QUESTION-BANK-ACCESS");
    expect(scholarPackage).toBeTruthy();

    const hasScienceScope = scholarPackage!.scopes.some(
      (scope) =>
        /class 7/i.test(scope.program_name || "") &&
        /science/i.test(scope.subject_name || ""),
    );

    const economyPage = new AdminEconomyQuestionBankPage(page);
    await economyPage.goto();
    await economyPage.openCatalogView();
    await economyPage.editPackage("Scholar Question Bank Access");

    if (!hasScienceScope) {
      await economyPage.addScopeRow();
      const scopeRows = economyPage.scopeRows();
      const newScopeRow = scopeRows.nth((await scopeRows.count()) - 1);
      await economyPage.selectScopeProgram(newScopeRow, /class 7/i);
      await economyPage.selectScopeSubject(newScopeRow, /science/i);
      await economyPage.setScopeActive(newScopeRow);
      await economyPage.savePackageUpdate();
      await expect(economyPage.packageCard().getByTestId("package-save-outcome")).toContainText(/package updated/i);
      await expect(economyPage.packageCard().getByTestId("package-save-outcome")).toContainText(/science/i);
    }

    const entitlementsResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok(), await entitlementsResponse.text()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as AdminQuestionBankEntitlement[];
    const opbmsScholarEntitlement = entitlements.find(
      (entitlement) =>
        entitlement.institute_code === "OPBMS" &&
        entitlement.question_bank_package_code === "SCHOLAR-QUESTION-BANK-ACCESS",
    );
    expect(opbmsScholarEntitlement).toBeTruthy();

    await economyPage.showEntitlementsForPackage("Scholar Question Bank Access (SCHOLAR-QUESTION-BANK-ACCESS)");
    const entitlementRow = economyPage.entitlementRow(opbmsScholarEntitlement!.id);
    await expect(entitlementRow).toBeVisible();

    const currentStatus = opbmsScholarEntitlement!.status.toLowerCase();
    if (currentStatus === "revoked") {
      const restoreResponsePromise = page.waitForResponse((response) =>
        response.url().includes(`/api/admin/economy/question-bank-entitlements/${opbmsScholarEntitlement!.id}`) &&
        response.request().method() === "PATCH",
      );
      await entitlementRow.getByRole("button", { name: /restore institute access/i }).click();
      const restoreResponse = await restoreResponsePromise;
      expect(restoreResponse.ok(), await restoreResponse.text()).toBe(true);
      await expect(economyPage.visibilityCard().getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    } else if (currentStatus === "paused") {
      const reactivateResponsePromise = page.waitForResponse((response) =>
        response.url().includes(`/api/admin/economy/question-bank-entitlements/${opbmsScholarEntitlement!.id}`) &&
        response.request().method() === "PATCH",
      );
      await entitlementRow.getByRole("button", { name: /reactivate entitlement/i }).click();
      const reactivateResponse = await reactivateResponsePromise;
      expect(reactivateResponse.ok(), await reactivateResponse.text()).toBe(true);
      await expect(economyPage.visibilityCard().getByText(/question bank entitlement updated successfully\./i)).toBeVisible();
    }

    await expect(entitlementRow).toContainText(/status:\s*active/i);
    await expect(entitlementRow).toContainText(/subjects:\s*math,\s*science|subjects:\s*science,\s*math/i);
    await expect(entitlementRow).toContainText(/package scope/i);
    await expect(entitlementRow).toContainText(/institute entitlement/i);
    await expect(entitlementRow).toContainText(/shared-library feature/i);

    await loginWithCredentials(page, opbmsCredentials, "institute");
    await expectInstituteWorkspace(page);

    const instituteQuestionBank = new InstituteQuestionBankPage(page);
    await instituteQuestionBank.gotoLinked();
    await instituteQuestionBank.expectLinkedLoaded();

    await instituteQuestionBank.selectAcademicFilters(/class 7/i, /science/i);
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page.getByText(/subject:\s*science/i).first()).toBeVisible();
    await expect(page.getByText(/filtered scope/i).first()).toBeVisible();
    await expect(page.getByText(/total linked rows in this filtered scope/i).first()).toBeVisible();
    await expect(page.getByText(/rows on this page/i).first()).toBeVisible();
    await expect(page.getByText(/active package coverage/i).first()).toBeVisible();

    const totalLinkedText = await page
      .locator(".builderSummaryCard")
      .filter({ hasText: /total linked rows in this filtered scope/i })
      .first()
      .locator("strong")
      .innerText();
    const totalLinkedQuestions = Number(totalLinkedText.replace(/[^\d]/g, ""));
    expect(totalLinkedQuestions).toBeGreaterThanOrEqual(900);
  });
});
