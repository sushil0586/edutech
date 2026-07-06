import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
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

type CreatedPackageResponse = {
  data?: {
    id?: string;
    code?: string;
    name?: string;
  };
};

type CreatedPlanResponse = {
  data?: {
    id?: string;
    code?: string;
    name?: string;
    cycles?: Array<{
      id?: string;
    }>;
    question_bank_package_links?: Array<{
      question_bank_package_code?: string;
    }>;
  };
};

type ApplyPlanResponse = {
  data?: {
    entitlement_count?: number;
    target_institute_code?: string;
    question_bank_package_codes?: string[];
    entitlement_ids?: string[];
  };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchSessionProfile(page: Page) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function createQuestionBankPackage(
  page: Page,
  instituteId: string,
  packageName: string,
  packageCode: string,
) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: instituteId,
      name: packageName,
      code: packageCode,
      description: "Playwright package propagation coverage.",
      package_type: "subject_library",
      ownership_type: "institute",
      access_mode: "link_on_demand",
      is_public_catalog: true,
      sort_order: 30,
      metadata: {
        source: "playwright-admin-economy-cross-role-propagation",
      },
      is_active: true,
      scopes: [
        {
          program: "",
          subject: "",
          topic: "",
          question_source_type: "platform_only",
          difficulty_level: "",
          question_type: "",
          master_visibility: "",
          max_questions_total: null,
          max_questions_per_topic: null,
          metadata: {
            source: "playwright-admin-economy-cross-role-propagation",
          },
          is_active: true,
        },
      ],
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CreatedPackageResponse;
}

async function createSubscriptionPlan(
  page: Page,
  instituteId: string,
  packageId: string,
  planName: string,
  planCode: string,
) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(`${backendBaseUrl}/api/v1/economy/admin/subscription-plans/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: instituteId,
      name: planName,
      code: planCode,
      description: "Playwright linked plan propagation coverage.",
      metadata: {
        source: "playwright-admin-economy-cross-role-propagation",
      },
      is_active: true,
      cycles: [
        {
          billing_interval: "monthly",
          interval_count: 1,
          price_amount: "299.00",
          currency: "INR",
          metadata: {},
          is_active: true,
          star_credit_rules: [
            {
              stars_credited: 200,
              credit_on_activation: true,
              credit_on_renewal: true,
              metadata: {},
              is_active: true,
            },
          ],
        },
      ],
      question_bank_package_links: [
        {
          question_bank_package: packageId,
          grant_mode: "included",
          is_default: true,
          metadata: {
            source: "playwright-admin-economy-cross-role-propagation",
          },
          is_active: true,
        },
      ],
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CreatedPlanResponse;
}

async function applyPlanToInstitute(page: Page, planId: string, instituteId: string) {
  const accessToken = await getAccessToken(page);
  const response = await page.request.post(
    `${backendBaseUrl}/api/v1/economy/admin/subscription-plans/${planId}/apply-to-institute/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        institute: instituteId,
      },
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as ApplyPlanResponse;
}

async function revokeEntitlement(page: Page, entitlementId: string, note: string) {
  const response = await page.request.patch(`/api/admin/economy/question-bank-entitlements/${entitlementId}`, {
    data: {
      status: "revoked",
      notes: note,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Admin economy cross-role package propagation", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Admin and institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminEconomyActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
      "admin to institute package-plan propagation coverage",
    ),
  );

  test("@workflow @mutable admin-applied package plans become visible on institute economy licensing surfaces", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let entitlementIds: string[] = [];
    const uniqueSeed = Date.now();
    const packageName = `Playwright Propagation Package ${uniqueSeed}`;
    const packageCode = `PW_PROP_PKG_${uniqueSeed}`;
    const planName = `Playwright Propagation Plan ${uniqueSeed}`;
    const planCode = `PW_PROP_PLAN_${uniqueSeed}`;

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    const instituteProfile = await fetchSessionProfile(page);
    const instituteId = instituteProfile.institute?.trim() ?? "";
    expect(instituteId).not.toBe("");

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const createdPackage = await createQuestionBankPackage(page, instituteId, packageName, packageCode);
    const packageId = createdPackage.data?.id ?? "";
    expect(packageId).toBeTruthy();

    const createdPlan = await createSubscriptionPlan(page, instituteId, packageId, planName, planCode);
    const planId = createdPlan.data?.id ?? "";
    expect(planId).toBeTruthy();
    expect(createdPlan.data?.question_bank_package_links?.[0]?.question_bank_package_code).toBe(packageCode.toUpperCase());

    const applyBody = await applyPlanToInstitute(page, planId, instituteId);
    expect(applyBody.data?.entitlement_count ?? 0).toBeGreaterThan(0);
    expect(applyBody.data?.question_bank_package_codes ?? []).toContain(packageCode.toUpperCase());
    entitlementIds = applyBody.data?.entitlement_ids ?? [];

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    await page.goto("/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

    const focusLaneSelect = page.getByLabel(/institute economy focus lane/i);
    await expect(focusLaneSelect).toBeVisible();

    await focusLaneSelect.selectOption("plans");
    await expect(page.getByRole("heading", { name: /which subscription plans back which package lanes/i })).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(planName), "i")).first()).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(planCode), "i")).first()).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(packageCode.toUpperCase()), "i")).first()).toBeVisible();
    await expect(page.getByText(/active now:/i).first()).toBeVisible();

    await focusLaneSelect.selectOption("packages");
    await expect(page.getByRole("heading", { name: /packages currently available to this institute/i })).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(packageName), "i")).first()).toBeVisible();
    await expect(page.getByText(new RegExp(escapeRegExp(packageCode.toUpperCase()), "i")).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`Plan:\\s*${escapeRegExp(planName)}`, "i")).first()).toBeVisible();
    await expect(page.getByText(/access source:\s*subscription/i).first()).toBeVisible();
    await expect(page.getByText(/status:\s*active|access remains active|started on/i).first()).toBeVisible();

    for (const entitlementId of entitlementIds) {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      await revokeEntitlement(
        page,
        entitlementId,
        `Playwright cleanup for package propagation ${uniqueSeed}`,
      );
    }
  });
});
