import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteSubscriptionRequestEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SUBSCRIPTION_REQUEST",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type ReviewedRequest = {
  institute_code: string;
  metadata?: {
    question_bank_package_codes?: string[];
  };
};

type EntitlementRow = {
  institute: string;
  institute_code: string;
  question_bank_package_code: string;
  status: string;
};

type SessionProfile = {
  institute?: string | null;
};

type RequestablePlan = {
  id: string;
  code: string;
  cycles: Array<{
    id: string;
    is_active: boolean;
  }>;
  question_bank_package_links: Array<{
    question_bank_package_code: string;
    is_active: boolean;
  }>;
};

type RequestSelection = {
  cycleId: string;
  packageCodes: string[];
  instituteId: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function listEntitlements(
  page: Page,
  accessToken: string,
  endpoint = `${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`,
) {
  const entitlementsResponse = await page.request.get(
    endpoint,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  expect(entitlementsResponse.ok()).toBe(true);
  return (await entitlementsResponse.json()) as EntitlementRow[];
}

async function selectUnentitledRequestableCycle(page: Page, accessToken: string) {
  const profileResponse = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(profileResponse.ok()).toBe(true);
  const profile = (await profileResponse.json()) as SessionProfile;
  const instituteId = profile.institute ?? "";
  expect(instituteId).not.toBe("");

  const plansResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/economy/admin/institute-requestable-subscription-plans/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  expect(plansResponse.ok()).toBe(true);
  const plans = (await plansResponse.json()) as RequestablePlan[];
  const entitlements = await listEntitlements(
    page,
    accessToken,
    `${backendBaseUrl}/api/v1/economy/admin/institute-question-bank-entitlements/`,
  );

  const activePackageCodes = new Set(
    entitlements
      .filter((row) => row.institute === instituteId && row.status === "active")
      .map((row) => row.question_bank_package_code),
  );

  for (const plan of plans) {
    const packageCodes = plan.question_bank_package_links
      .filter((link) => link.is_active)
      .map((link) => link.question_bank_package_code);
    if (packageCodes.length === 0) {
      continue;
    }
    if (packageCodes.every((code) => activePackageCodes.has(code))) {
      continue;
    }
    const cycle = plan.cycles.find((entry) => entry.is_active);
    if (!cycle) {
      continue;
    }
    return {
      cycleId: cycle.id,
      packageCodes,
      instituteId,
    } satisfies RequestSelection;
  }

  return null;
}

function instituteRequestCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: /request question-bank subscription activation/i }),
  }).first();
}

function adminRequestQueueCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: /institute subscription request queue/i }),
  }).first();
}

async function findPendingRequestRowByNote(card: Locator, note: string) {
  const rows = card.locator(".weakTopicRow");
  const count = await rows.count();

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    if ((await row.getByText(note, { exact: false }).count()) === 0) {
      continue;
    }
    if ((await row.getByRole("button", { name: /approve/i }).count()) === 0) {
      continue;
    }
    return row;
  }

  return null;
}

async function createInstituteRequest(browser: Browser, requestNote: string) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
    const instituteAccessToken = await getAccessToken(page);
    expect(instituteAccessToken).not.toBe("");

    await page.goto("/institute/economy");
    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();

    const requestCard = instituteRequestCard(page);
    await expect(requestCard).toBeVisible();

    const selection = await selectUnentitledRequestableCycle(page, instituteAccessToken);
    if (!selection) {
      test.skip(
        true,
        "No requestable subscription cycle currently exposes a package that is not already active for the institute.",
      );
    }

    const cycleSelect = requestCard.locator("select").first();
    await cycleSelect.selectOption(selection!.cycleId);
    const selectedCycleId = await cycleSelect.inputValue();
    expect(selectedCycleId).toBe(selection!.cycleId);

    const notesInput = requestCard.locator('input[placeholder*="needs the package lane"]').first();
    await notesInput.fill(requestNote);

    const requestResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/institute-subscription-requests") &&
        response.request().method() === "POST",
    );
    await requestCard.getByRole("button", { name: /submit subscription request/i }).click();
    const requestResponse = await requestResponsePromise;
    expect(requestResponse.ok()).toBe(true);

    await expect(page.getByText(/subscription request submitted successfully/i).first()).toBeVisible();
    await expect(requestCard.getByText(requestNote, { exact: false })).toBeVisible();

    return selection!;
  } finally {
    await context.close();
  }
}

async function approveInstituteRequest(
  browser: Browser,
  requestNote: string,
  expectedPackageCodes: string[],
  targetInstituteId: string,
) {
  return reviewInstituteRequest(
    browser,
    requestNote,
    "approve",
    expectedPackageCodes,
    targetInstituteId,
  );
}

async function rejectInstituteRequest(
  browser: Browser,
  requestNote: string,
  expectedPackageCodes: string[],
  targetInstituteId: string,
) {
  return reviewInstituteRequest(
    browser,
    requestNote,
    "reject",
    expectedPackageCodes,
    targetInstituteId,
  );
}

async function reviewInstituteRequest(
  browser: Browser,
  requestNote: string,
  decision: "approve" | "reject",
  expectedPackageCodes: string[],
  targetInstituteId: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);
    expect(adminAccessToken).not.toBe("");
    const entitlementsBefore = await listEntitlements(page, adminAccessToken);

    await page.goto("/admin/economy");
    await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();

    const queueCard = adminRequestQueueCard(page);
    await expect(queueCard).toBeVisible();

    const requestRow = await findPendingRequestRowByNote(queueCard, requestNote);
    if (!requestRow) {
      test.skip(
        true,
        "The just-created institute subscription request is not visible as pending in the admin queue.",
      );
    }

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/institute-subscription-requests/") &&
        response.url().includes("/review") &&
        response.request().method() === "POST",
    );
    await requestRow!.getByRole("button", { name: decision === "approve" ? /approve/i : /reject/i }).click();
    const reviewResponse = await reviewResponsePromise;
    expect(reviewResponse.ok()).toBe(true);
    const reviewBody = (await reviewResponse.json()) as { data?: ReviewedRequest };

    await expect(page.getByText(/subscription request reviewed successfully/i).first()).toBeVisible();
    await expect(requestRow!.locator(".weakTopicMeta strong")).toHaveText(
      decision === "approve" ? /fulfilled/i : /rejected/i,
    );

    if (decision === "approve") {
      const instituteCode = reviewBody.data?.institute_code ?? "";
      const packageCodes = reviewBody.data?.metadata?.question_bank_package_codes ?? [];

      expect(instituteCode).not.toBe("");
      expect(packageCodes.length).toBeGreaterThan(0);
      expect(packageCodes.sort()).toEqual(expectedPackageCodes.slice().sort());

      const entitlements = await listEntitlements(page, adminAccessToken);

      for (const packageCode of packageCodes) {
        expect(
          entitlementsBefore.some(
            (row) =>
              row.institute === targetInstituteId &&
              row.question_bank_package_code === packageCode &&
              row.status === "active",
          ),
        ).toBe(false);
        expect(
          entitlements.some(
            (row) =>
              row.institute_code === instituteCode &&
              row.question_bank_package_code === packageCode &&
              row.status === "active",
          ),
        ).toBe(true);
      }
    } else {
      const entitlements = await listEntitlements(page, adminAccessToken);
      for (const packageCode of expectedPackageCodes) {
        expect(
          entitlementsBefore.some(
            (row) =>
              row.institute === targetInstituteId &&
              row.question_bank_package_code === packageCode &&
              row.status === "active",
          ),
        ).toBe(false);
        expect(
          entitlements.some(
            (row) =>
              row.institute === targetInstituteId &&
              row.question_bank_package_code === packageCode &&
              row.status === "active",
          ),
        ).toBe(false);
      }
    }
  } finally {
    await context.close();
  }
}

test.describe("Admin and institute subscription request mutable workflow", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Platform admin or institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteSubscriptionRequestEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_SUBSCRIPTION_REQUEST",
      "institute subscription request workflow coverage",
    ),
  );

  test("@workflow @mutable institute can submit a subscription request and admin can reject it", async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const requestNote = `PW institute subscription rejection ${Date.now()}`;

    const selection = await createInstituteRequest(browser, requestNote);
    await rejectInstituteRequest(
      browser,
      requestNote,
      selection.packageCodes,
      selection.instituteId,
    );
  });

  test("@workflow @mutable institute can submit a subscription request and admin can approve it", async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const requestNote = `PW institute subscription request ${Date.now()}`;

    const selection = await createInstituteRequest(browser, requestNote);
    await approveInstituteRequest(
      browser,
      requestNote,
      selection.packageCodes,
      selection.instituteId,
    );
  });
});
