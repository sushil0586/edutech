import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableAdminExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type PolicySecurityScenario = {
  policyType: "stars_only" | "subscription_or_stars" | "platform_managed";
  securityMode: "focus" | "fullscreen";
  starCost: string;
  priority: string;
  entitlementRequired: boolean;
};

const scenarios: PolicySecurityScenario[] = [
  {
    policyType: "stars_only",
    securityMode: "focus",
    starCost: "7",
    priority: "71",
    entitlementRequired: false,
  },
  {
    policyType: "subscription_or_stars",
    securityMode: "fullscreen",
    starCost: "9",
    priority: "72",
    entitlementRequired: true,
  },
  {
    policyType: "platform_managed",
    securityMode: "focus",
    starCost: "0",
    priority: "73",
    entitlementRequired: false,
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function submitWizardAndLandOnExamList(page: Page) {
  const createResponsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      /\/admin\/exams\/new(?:\?|$)/.test(response.url())
    );
  });

  await page.getByRole("button", { name: /create exam shell/i }).click();

  const createResponse = await createResponsePromise;
  const actionRedirectHeader = createResponse.headers()["x-action-redirect"] ?? "";
  const expectedListUrlPattern = /\/admin\/exams\?message=/;

  try {
    await expect(page).toHaveURL(expectedListUrlPattern, { timeout: 10000 });
    return;
  } catch {
    const fallbackRedirectTarget = actionRedirectHeader.split(";")[0]?.trim() ?? "";
    expect(fallbackRedirectTarget).toMatch(expectedListUrlPattern);
    await page.goto(fallbackRedirectTarget, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(expectedListUrlPattern);
  }
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function fetchAdminExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    security_mode: string;
    economy_policy?: {
      commercial_path?: string;
    } | null;
  };
}

async function createAdminWizardExam(page: Page, uniqueSeed: number) {
  const examTitle = `PW Admin Policy Security ${uniqueSeed}`;
  const examCode = `PW-APS-${uniqueSeed}`;

  await page.goto("/admin/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.locator('select[name="source_type"]').selectOption("platform");

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await submitWizardAndLandOnExamList(page);
  const createdExamCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first(),
  }).first();
  await expect(createdExamCard).toBeVisible();

  const openExamHref = await createdExamCard.getByRole("link", { name: /view exam|open exam/i }).getAttribute("href");
  const examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
  };
}

async function saveAccessPolicyScenario(
  page: Page,
  examId: string,
  scenario: PolicySecurityScenario,
  entitlementCode: string,
) {
  await page.goto(`/admin/exams/${examId}`);
  await expect(page.getByRole("heading", { name: /pw admin policy security/i }).first()).toBeVisible();

  const accessPolicySelect = page.getByRole("combobox", { name: /access policy/i });
  await expect(accessPolicySelect.locator('option[value="stars_only"]')).toHaveCount(1);
  await expect(accessPolicySelect.locator('option[value="subscription_or_stars"]')).toHaveCount(1);
  await expect(accessPolicySelect.locator('option[value="platform_managed"]')).toHaveCount(1);

  await accessPolicySelect.selectOption(scenario.policyType);
  await page.getByRole("spinbutton", { name: /star cost/i }).fill(scenario.starCost);
  await page
    .getByRole("textbox", { name: /entitlement code/i })
    .fill(scenario.entitlementRequired ? entitlementCode : "");
  await page.getByRole("spinbutton", { name: /priority/i }).fill(scenario.priority);
  await page.getByRole("button", { name: /save access policy/i }).click();

  await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
  await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();

  await expect(accessPolicySelect).toHaveValue(scenario.policyType);
  await expect(page.getByRole("spinbutton", { name: /star cost/i })).toHaveValue(scenario.starCost);
  await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(scenario.priority);
  await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(
    scenario.entitlementRequired ? entitlementCode : "",
  );
}

async function saveSecurityScenario(page: Page, examId: string, securityMode: PolicySecurityScenario["securityMode"]) {
  await page.goto(`/admin/exams/${examId}/builder`);
  await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();

  const securityModeSelect = page.locator('select[name="security_mode"]').first();
  await expect(securityModeSelect.locator(`option[value="${securityMode}"]`)).toHaveCount(1);
  await securityModeSelect.selectOption(securityMode);
  await page.getByRole("button", { name: /save exam settings/i }).click();

  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();
  await expect(securityModeSelect).toHaveValue(securityMode);
}

async function expectSecurityWorkspaceVisibility(
  page: Page,
  examId: string,
  examTitle: string,
  securityMode: PolicySecurityScenario["securityMode"],
) {
  await page.goto(
    `/admin/security?examId=${encodeURIComponent(examId)}&exam_filter=elevated&exam_sort=latest`,
  );
  await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^${escapeRegExp(securityMode)}$`, "i")).first(),
  ).toBeVisible();
}

test.describe("Admin exam policy and security matrix", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "platform-admin policy and security breadth coverage",
    ),
  );

  test("@workflow @mutable admin can persist stars-based access policies with non-normal security modes", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const created = await createAdminWizardExam(page, uniqueSeed);
      examId = created.examId;

      for (const [index, scenario] of scenarios.entries()) {
        const entitlementCode = scenario.entitlementRequired
          ? `pw_admin_combo_${uniqueSeed}_${index}`
          : "";
        await saveAccessPolicyScenario(page, examId, scenario, entitlementCode);
        await saveSecurityScenario(page, examId, scenario.securityMode);

        await page.goto(`/admin/exams/${examId}`);
        await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue(scenario.policyType);
        await expect(page.getByRole("spinbutton", { name: /star cost/i })).toHaveValue(scenario.starCost);
        await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(
          scenario.entitlementRequired ? entitlementCode : "",
        );
        await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(scenario.priority);

        const detail = await fetchAdminExamDetail(page, examId);
        expect(detail.security_mode).toBe(scenario.securityMode);
        expect(detail.economy_policy?.commercial_path ?? "").toBe(scenario.policyType);

        await expectSecurityWorkspaceVisibility(page, examId, created.examTitle, scenario.securityMode);
      }
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteAdminExamDirectly(page, examId);
      }
    }
  });
});
