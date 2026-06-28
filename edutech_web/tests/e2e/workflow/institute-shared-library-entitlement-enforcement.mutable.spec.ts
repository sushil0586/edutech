import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSharedLibraryEntitlementEnforcementEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type SessionProfile = {
  institute?: string | null;
};

type InstituteRecord = {
  id: string;
  code: string;
  name: string;
};

type MasterLibraryRow = {
  id: string;
  question_text: string;
  has_access: boolean;
  has_entitlement: boolean;
  access_availability: string;
  matching_packages: Array<{
    code: string;
    name: string;
  }>;
};

type EntitlementRow = {
  id: string;
  institute_code: string;
  question_bank_package_code: string;
  granted_via: string;
  status: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

test.describe("Institute shared-library entitlement enforcement", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("admin"),
    "Institute or admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSharedLibraryEntitlementEnforcementEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SHARED_LIBRARY_ENTITLEMENT_ENFORCEMENT",
      "institute shared-library entitlement enforcement coverage",
    ),
  );

  test("@workflow @mutable institute shared-library availability turns blocked when the matching subscription entitlement is paused", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
    });
    expect(profileResponse.ok()).toBe(true);
    const profile = (await profileResponse.json()) as SessionProfile;
    expect(profile.institute).toBeTruthy();

    const instituteResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/institutes/${profile.institute}/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(instituteResponse.ok()).toBe(true);
    const institute = (await instituteResponse.json()) as InstituteRecord;
    expect(institute.code).toBeTruthy();

    const masterLibraryResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/question-bank/master-library/`,
      {
        headers: {
          Authorization: `Bearer ${instituteAccessToken}`,
        },
      },
    );
    expect(masterLibraryResponse.ok()).toBe(true);
    const masterLibraryBody = (await masterLibraryResponse.json()) as {
      results?: MasterLibraryRow[];
    };
    const candidateRow =
      masterLibraryBody.results?.find(
        (row) =>
          row.has_access &&
          row.has_entitlement &&
          row.access_availability === "available" &&
          row.matching_packages.length === 1,
      ) ?? null;

    if (!candidateRow) {
      test.skip(
        true,
        "No institute-visible shared-library question currently has exactly one active matching package.",
      );
    }

    const packageCode = candidateRow!.matching_packages[0]?.code ?? "";
    const searchProbe = candidateRow!.question_text.slice(0, 60);
    expect(packageCode).not.toBe("");
    expect(searchProbe).not.toBe("");

    await loginAsRole(page, "admin");

    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");

    const entitlementsResponse = await page.request.get(
      `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      },
    );
    expect(entitlementsResponse.ok()).toBe(true);
    const entitlements = (await entitlementsResponse.json()) as EntitlementRow[];
    const targetEntitlements = entitlements.filter(
      (row) =>
        row.institute_code === institute.code &&
        row.question_bank_package_code === packageCode &&
        row.status === "active",
    );

    if (targetEntitlements.length === 0) {
      test.skip(
        true,
        `No active entitlement matched institute ${institute.code} and package ${packageCode}.`,
      );
    }

    try {
      for (const entitlement of targetEntitlements) {
        const pauseResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "paused",
              notes: "Playwright enforcement check paused this entitlement temporarily.",
            },
          },
        );
        expect(pauseResponse.ok()).toBe(true);
      }

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/question-bank");
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

      const searchField = page.getByRole("textbox", { name: /search question text/i });
      await searchField.fill(searchProbe);
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=/);

      const sharedLibrarySection = page.locator("section.contentCard").filter({
        has: page.getByRole("heading", { name: /shared platform library/i }),
      }).first();
      await expect(sharedLibrarySection).toBeVisible();

      const targetCard = sharedLibrarySection
        .locator(".questionBankCard")
        .filter({ hasText: searchProbe })
        .filter({ hasText: /subscription required/i })
        .first();
      await expect(targetCard).toBeVisible();
      await expect(targetCard.getByText(/subscription required/i)).toBeVisible();
      await expect(
        targetCard.getByText(/no matching subscribed package was found for this local scope/i).first(),
      ).toBeVisible();
      await expect(targetCard.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
    } finally {
      for (const entitlement of targetEntitlements) {
        const reactivateResponse = await page.request.patch(
          `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/${entitlement.id}/`,
          {
            headers: {
              Authorization: `Bearer ${adminAccessToken}`,
              "Content-Type": "application/json",
            },
            data: {
              status: "active",
              notes: "Playwright enforcement check restored this entitlement.",
            },
          },
        );
        expect(reactivateResponse.ok()).toBe(true);
      }
    }
  });
});
