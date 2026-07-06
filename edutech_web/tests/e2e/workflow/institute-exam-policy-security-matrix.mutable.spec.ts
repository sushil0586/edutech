import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type PolicySecurityScenario = {
  policyType: "stars_only" | "stars_or_entitlement";
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
    policyType: "stars_or_entitlement",
    securityMode: "fullscreen",
    starCost: "9",
    priority: "72",
    entitlementRequired: true,
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function fetchInstituteExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  let response = await page.request.get(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  if (!response.ok()) {
    response = await page.request.get(`/api/institute/exams/${examId}`, {
      timeout: 15000,
    });
  }
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    security_mode: string;
  };
}

async function createInstituteWizardExam(page: Page, uniqueSeed: number) {
  const examTitle = `PW Institute Policy Security ${uniqueSeed}`;
  const examCode = `PW-IPS-${uniqueSeed}`;

  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await page.getByRole("button", { name: /create exam shell/i }).click();
  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  const detailUrl = page.url().split("?")[0] ?? page.url();
  const examId = detailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
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
  await page.goto(`/institute/exams/${examId}`);
  await expect(page.getByRole("heading", { name: /pw institute policy security/i }).first()).toBeVisible();

  const accessPolicySelect = page.getByRole("combobox", { name: /access policy/i });
  await expect(accessPolicySelect.locator('option[value="stars_only"]')).toHaveCount(1);
  await expect(accessPolicySelect.locator('option[value="stars_or_entitlement"]')).toHaveCount(1);

  await accessPolicySelect.selectOption(scenario.policyType);
  await page.getByRole("spinbutton", { name: /star cost/i }).fill(scenario.starCost);
  await page
    .getByRole("textbox", { name: /entitlement code/i })
    .fill(scenario.entitlementRequired ? entitlementCode : "");
  await page.getByRole("spinbutton", { name: /priority/i }).fill(scenario.priority);
  await page.getByRole("button", { name: /save access policy/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();
  await expect(accessPolicySelect).toHaveValue(scenario.policyType);
  await expect(page.getByRole("spinbutton", { name: /star cost/i })).toHaveValue(scenario.starCost);
  await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(scenario.priority);
  await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(
    scenario.entitlementRequired ? entitlementCode : "",
  );
}

async function saveSecurityScenario(page: Page, examId: string, securityMode: PolicySecurityScenario["securityMode"]) {
  await page.goto(`/institute/exams/${examId}/builder`);
  await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();

  const securityModeSelect = page.locator('select[name="security_mode"]').first();
  await expect(securityModeSelect.locator(`option[value="${securityMode}"]`)).toHaveCount(1);
  await securityModeSelect.selectOption(securityMode);
  await page.getByRole("button", { name: /save exam settings/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder\?message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();
  await expect(securityModeSelect).toHaveValue(securityMode);
}

async function expectSecurityWorkspaceVisibility(
  page: Page,
  examTitle: string,
  securityMode: PolicySecurityScenario["securityMode"],
) {
  await page.goto("/institute/security");
  await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
  await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^${escapeRegExp(securityMode)}$`, "i")).first(),
  ).toBeVisible();
}

test.describe("Institute exam policy and security matrix", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute policy and security breadth coverage",
    ),
  );

  test("@workflow @mutable institute can persist stars-based access policies with non-normal security modes", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();

    try {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const created = await createInstituteWizardExam(page, uniqueSeed);
      examId = created.examId;

      for (const [index, scenario] of scenarios.entries()) {
        const entitlementCode = scenario.entitlementRequired
          ? `pw_institute_combo_${uniqueSeed}_${index}`
          : "";
        await saveAccessPolicyScenario(page, examId, scenario, entitlementCode);
        await saveSecurityScenario(page, examId, scenario.securityMode);

        await page.goto(`/institute/exams/${examId}`);
        await expect(page.getByRole("combobox", { name: /access policy/i })).toHaveValue(scenario.policyType);
        await expect(page.getByRole("spinbutton", { name: /star cost/i })).toHaveValue(scenario.starCost);
        await expect(page.getByRole("textbox", { name: /entitlement code/i })).toHaveValue(
          scenario.entitlementRequired ? entitlementCode : "",
        );
        await expect(page.getByRole("spinbutton", { name: /priority/i })).toHaveValue(scenario.priority);

        const detail = await fetchInstituteExamDetail(page, examId);
        expect(detail.security_mode).toBe(scenario.securityMode);

        await expectSecurityWorkspaceVisibility(page, created.examTitle, scenario.securityMode);
      }
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
    }
  });
});
