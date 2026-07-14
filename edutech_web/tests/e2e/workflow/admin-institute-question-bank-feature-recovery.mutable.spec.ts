import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const BULK_IMPORT_FEATURE_CODE = "QUESTION_BANK_BULK_IMPORT";

type AdminQuestionBankFeatureEntitlement = {
  id: string;
  status: string;
  feature_code?: string;
  institute_code?: string;
  institute?: string;
  source_package?: string | null;
};

type SessionProfile = {
  institute?: string | null;
  institute_code?: string | null;
};

function visibilityCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", {
      name: /check package coverage and institute access before changing live access/i,
    }),
  }).first();
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function fetchSessionProfile(page: Page) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function gotoFeatureDataset(page: Page, instituteId = "") {
  const query = new URLSearchParams({
    tab: "question-bank",
    focus: "visibility",
  });
  if (instituteId) {
    query.set("institute", instituteId);
  }
  await page.goto(`/admin/economy?${query.toString()}`);
  await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

  const card = visibilityCard(page);
  await expect(card).toBeVisible();
  await card.getByRole("combobox", { name: /show dataset/i }).selectOption("features");
  await card.getByRole("combobox", { name: /rows to show/i }).selectOption("50");
  await card.getByRole("combobox", { name: /feature status/i }).selectOption("all");
  return card;
}

function featureRow(card: Locator, featureCode: string, instituteCode?: string | null) {
  const normalizedFeature = featureCode.replaceAll("_", " ");
  const baseRow = card.locator(".weakTopicRow").filter({
    hasText: new RegExp(normalizedFeature, "i"),
  });
  if (!instituteCode) {
    return baseRow.first();
  }
  return baseRow.filter({ hasText: instituteCode }).first();
}

test.describe("Admin to institute question-bank feature recovery", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Admin and institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin to institute question-bank feature recovery coverage",
    ),
  );

  test("@workflow @mutable admin can pause bulk import access, confirm the institute-facing blocked state, and restore the workspace", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    const instituteProfile = await fetchSessionProfile(page);
    const targetInstituteId = instituteProfile.institute?.trim() ?? "";
    const targetInstituteCode = instituteProfile.institute_code?.trim() ?? "";
    expect(targetInstituteId).not.toBe("");

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const featureListResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-feature-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(featureListResponse.ok()).toBe(true);

    const featureRows = (await featureListResponse.json()) as AdminQuestionBankFeatureEntitlement[];
    let targetFeature: AdminQuestionBankFeatureEntitlement | undefined =
      featureRows.find(
        (row) =>
          row.feature_code === BULK_IMPORT_FEATURE_CODE &&
          row.institute === targetInstituteId &&
          row.status === "active",
      ) ??
      featureRows.find(
        (row) =>
          row.feature_code === BULK_IMPORT_FEATURE_CODE &&
          row.institute === targetInstituteId &&
          row.status === "paused",
      );

    let createdFeatureEntitlementId = "";

    if (!targetFeature) {
      const entitlementListResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
        {
          headers: {
            Authorization: `Bearer ${adminAccessToken}`,
          },
        },
      );
      expect(entitlementListResponse.ok()).toBe(true);
      const entitlementRows = (await entitlementListResponse.json()) as Array<{
        institute: string;
        question_bank_package: string;
        status: string;
      }>;
      const sourceEntitlement = entitlementRows.find(
        (row) => row.institute === targetInstituteId && row.status === "active",
      );

      if (!sourceEntitlement) {
        test.skip(true, "No active institute question-bank entitlement exists to seed a bulk-import feature row.");
      }

      const createResponse = await page.request.post(
        "/api/admin/economy/question-bank-feature-entitlements",
        {
          data: {
            institute: targetInstituteId,
            feature_code: BULK_IMPORT_FEATURE_CODE,
            source_package: sourceEntitlement!.question_bank_package,
            metadata: {
              source: "playwright-admin-institute-question-bank-feature-recovery",
              provisioned_for: "bulk-import-recovery",
            },
          },
        },
      );
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createBody = (await createResponse.json()) as {
        data?: AdminQuestionBankFeatureEntitlement;
      };
      expect(createBody.data?.id).toBeTruthy();
      createdFeatureEntitlementId = createBody.data?.id ?? "";
      targetFeature = createBody.data;
    }

    expect(targetFeature).toBeDefined();
    const targetFeatureSnapshot = targetFeature!;

    if (targetFeatureSnapshot.status !== "active") {
      const activateResponse = await page.request.patch(
        `/api/admin/economy/question-bank-feature-entitlements/${targetFeatureSnapshot.id}`,
        {
          data: {
            status: "active",
          },
        },
      );
      expect(activateResponse.ok(), await activateResponse.text()).toBe(true);
    }

    const card = await gotoFeatureDataset(page, targetInstituteId);
    const stableRow = featureRow(
      card,
      BULK_IMPORT_FEATURE_CODE,
      targetFeatureSnapshot.institute_code ?? targetInstituteCode,
    );
    await expect(stableRow).toBeVisible();
    await expect(stableRow).toContainText(/status:\s*active/i);
    await expect(stableRow.getByRole("button", { name: /pause feature/i })).toBeVisible();

    try {
      const pauseResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/economy/question-bank-feature-entitlements/${targetFeatureSnapshot.id}`) &&
          response.request().method() === "PATCH",
      );
      await stableRow.getByRole("button", { name: /pause feature/i }).click();
      const pauseResponse = await pauseResponsePromise;
      expect(pauseResponse.ok()).toBe(true);

      await expect(card.getByText(/question bank feature entitlement updated successfully\./i)).toBeVisible();
      await expect(stableRow).toContainText(/status:\s*paused/i);
      await expect(stableRow.getByRole("button", { name: /reactivate feature/i })).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto("/institute/question-bank/import");

      await expect(page.getByRole("heading", { name: /import questions/i })).toBeVisible();
      await expect(
        page.getByText(/question-bank bulk import is not enabled for this institute yet/i).first(),
      ).toBeVisible();
      await expect(
        page.getByText(/ask the platform operator to activate question bank bulk import through your package or subscription plan/i).first(),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /open economy oversight/i })).toBeVisible();

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      const refreshedCard = await gotoFeatureDataset(page, targetInstituteId);
      const refreshedRow = featureRow(
        refreshedCard,
        BULK_IMPORT_FEATURE_CODE,
        targetFeatureSnapshot.institute_code,
      );
      await expect(refreshedRow).toBeVisible();

      const reactivateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/economy/question-bank-feature-entitlements/${targetFeatureSnapshot.id}`) &&
          response.request().method() === "PATCH",
      );
      await refreshedRow.getByRole("button", { name: /reactivate feature/i }).click();
      const reactivateResponse = await reactivateResponsePromise;
      expect(reactivateResponse.ok()).toBe(true);

      await expect(refreshedCard.getByText(/question bank feature entitlement updated successfully\./i)).toBeVisible();
      await expect(refreshedRow).toContainText(/status:\s*active/i);
      await expect(refreshedRow.getByRole("button", { name: /pause feature/i })).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto("/institute/question-bank/import");

      await expect(page.getByRole("heading", { name: /import questions/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /download template/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /preview import/i })).toBeVisible();
      await expect(
        page.getByText(/question-bank bulk import is not enabled for this institute yet/i).first(),
      ).toHaveCount(0);
    } finally {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      const cleanupFeatureId = createdFeatureEntitlementId || targetFeatureSnapshot.id;
      await page.request.patch(`/api/admin/economy/question-bank-feature-entitlements/${cleanupFeatureId}`, {
        data: {
          status: createdFeatureEntitlementId ? "revoked" : "active",
        },
      });
    }
  });
});
