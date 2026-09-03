import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type SessionProfile = {
  institute?: string | null;
};

type EntitlementRow = {
  institute: string;
  question_bank_package_code: string;
  status: string;
};

type RequestablePlan = {
  id: string;
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

type CreatedRequestResponse = {
  data?: {
    id?: string;
    notes?: string;
    institute_code?: string;
    subscription_plan_name?: string;
    subscription_plan_code?: string;
    subscription_cycle_label?: string;
  };
  message?: string;
  detail?: string;
};

async function getAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

function adminRequestQueueCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: /institute subscription request queue/i }),
  }).first();
}

function instituteRequestCard(page: Page) {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: /request question-bank subscription activation/i }),
  }).first();
}

async function listEntitlements(page: Page, accessToken: string) {
  const entitlementsResponse = await page.request.get(
    `${backendBaseUrl}/api/v1/economy/admin/institute-question-bank-entitlements/`,
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
  const entitlements = await listEntitlements(page, accessToken);

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

async function findPendingRequestRow(card: Locator, options: {
  note: string;
  requestId?: string | null;
  instituteCode?: string | null;
  planCode?: string | null;
  planName?: string | null;
  cycleLabel?: string | null;
}) {
  const rows = card.locator(".weakTopicRow");
  const count = await rows.count();

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    if ((await row.getByRole("button", { name: /approve|reject/i }).count()) === 0) {
      continue;
    }
    if (options.requestId && (await row.getByText(options.requestId, { exact: false }).count()) > 0) {
      return row;
    }
    if ((await row.getByText(options.note, { exact: false }).count()) > 0) {
      return row;
    }
    const matchesInstituteCode =
      !options.instituteCode || (await row.getByText(options.instituteCode, { exact: false }).count()) > 0;
    const matchesPlanCode =
      !options.planCode || (await row.getByText(options.planCode, { exact: false }).count()) > 0;
    const matchesPlanName =
      !options.planName || (await row.getByText(options.planName, { exact: false }).count()) > 0;
    const matchesCycleLabel =
      !options.cycleLabel || (await row.getByText(options.cycleLabel, { exact: false }).count()) > 0;
    if (matchesInstituteCode && matchesPlanCode && matchesPlanName && matchesCycleLabel) {
      return row;
    }
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

    const cycleSelect = requestCard.getByLabel(/institute requestable plan cycle/i);
    await cycleSelect.selectOption(selection!.cycleId);
    await expect(cycleSelect).toHaveValue(selection!.cycleId);

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
    const requestBody = (await requestResponse.json()) as CreatedRequestResponse;

    await expect(
      page.getByText(
        /subscription request submitted successfully|a matching pending subscription request already exists/i,
      ).first(),
    ).toBeVisible();

    return {
      ...selection!,
      requestId: requestBody.data?.id ?? null,
      instituteCode: requestBody.data?.institute_code ?? null,
      planCode: requestBody.data?.subscription_plan_code ?? null,
      planName: requestBody.data?.subscription_plan_name ?? null,
      cycleLabel: requestBody.data?.subscription_cycle_label ?? null,
    };
  } finally {
    await context.close();
  }
}

test.describe("Admin request queue review rejection", () => {
  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute"),
    "Platform admin or institute Playwright credentials are not configured.",
  );

  test("@workflow admin request queue review keeps missing-request backend rejection visible with deterministic setup", async ({
    browser,
    page,
  }) => {
    test.setTimeout(180000);

    const requestNote = `PW deterministic request review rejection ${Date.now()}`;
    const selection = await createInstituteRequest(browser, requestNote);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await page.goto("/admin/economy?tab=support-ops");
    await expect(page.getByRole("heading", { name: /institute subscription request queue/i })).toBeVisible();

    const queueCard = adminRequestQueueCard(page);
    await expect(queueCard).toBeVisible();
    await queueCard.getByLabel(/institute subscription request queue view/i).selectOption("pending");
    await queueCard.getByLabel(/institute subscription request rows to show/i).selectOption("12");

    const requestRow = await findPendingRequestRow(queueCard, {
      note: requestNote,
      requestId: selection.requestId,
      instituteCode: selection.instituteCode,
      planCode: selection.planCode,
      planName: selection.planName,
      cycleLabel: selection.cycleLabel,
    });
    if (!requestRow) {
      test.skip(
        true,
        "The just-created institute subscription request is not visible as pending in the admin queue.",
      );
    }
    await expect(requestRow!).toBeVisible();

    const missingRequestId = "00000000-0000-0000-0000-000000000409";
    await page.evaluate((staleRequestId) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        if (/\/api\/admin\/economy\/institute-subscription-requests\/[^/]+\/review/.test(url)) {
          const nextUrl = url.replace(
            /\/api\/admin\/economy\/institute-subscription-requests\/[^/]+\/review/,
            `/api/admin/economy/institute-subscription-requests/${staleRequestId}/review`,
          );
          if (typeof input === "string") {
            return originalFetch(nextUrl, init);
          }
          if (input instanceof Request) {
            return originalFetch(new Request(nextUrl, input), init);
          }
          return originalFetch(nextUrl, init);
        }
        return originalFetch(input, init);
      };
    }, missingRequestId);

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/economy/institute-subscription-requests/${missingRequestId}/review`) &&
        response.request().method() === "POST",
    );
    await requestRow!.getByRole("button", { name: /reject/i }).click();
    const reviewResponse = await reviewResponsePromise;
    expect(reviewResponse.ok(), await reviewResponse.text()).toBe(false);

    await expect(
      queueCard.getByText(/request not found|request failed with status 404|request failed with status 400/i).first(),
    ).toBeVisible();
    await expect(queueCard.getByText(/subscription request reviewed successfully/i)).toHaveCount(0);
    await expect(requestRow!.locator(".weakTopicMeta strong")).toHaveText(/pending/i);
  });
});
