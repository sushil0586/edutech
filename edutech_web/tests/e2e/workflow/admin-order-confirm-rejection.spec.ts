import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type WalletSummary = {
  institute?: string;
};

type CreatedStarPackResponse = {
  data?: {
    id: string;
  };
};

async function getAccessToken(page: Page) {
  const accessToken =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

function supportActionsCard(page: Page) {
  return page.locator(".dashboardPanel").filter({
    has: page.getByRole("heading", {
      name: /inspect wallet state and perform controlled admin actions/i,
    }),
  }).first();
}

async function gotoAdminEconomyLane(page: Page) {
  await page.goto("/admin/economy?tab=support-ops&focus=student-support");
  await expect(page.getByRole("heading", { name: /economy/i }).first()).toBeVisible();
}

test.describe("Admin order confirmation rejection", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test("@workflow admin order confirmation keeps stale-order backend rejection visible", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    const studentAccessToken = await getAccessToken(page);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    const studentProfileCard = page.locator(".detailCard").filter({
      has: page.getByText(/^student profile$/i),
    }).first();
    await expect(studentProfileCard).toBeVisible();
    const studentId = (await studentProfileCard.locator("strong").textContent())?.trim() ?? "";
    expect(studentId).toBeTruthy();

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    const adminAccessToken = await getAccessToken(page);

    const walletResponse = await page.request.get(`/api/admin/economy/student/${studentId}/wallet`);
    expect(walletResponse.ok()).toBe(true);
    const wallet = (await walletResponse.json()) as WalletSummary;
    const instituteId = wallet.institute ?? "";
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const starPackResponse = await page.request.post("/api/admin/economy/star-packs/", {
      data: {
        institute: instituteId,
        name: `Playwright Reject Pack ${uniqueSeed}`,
        code: `PW-REJ-PACK-${uniqueSeed}`,
        stars_credited: 125,
        price_amount: "149.00",
        currency: "INR",
        sort_order: 10,
        metadata: {
          source: "playwright-admin-order-confirm-rejection",
        },
        is_active: true,
      },
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
      },
    });
    expect(starPackResponse.ok(), await starPackResponse.text()).toBe(true);
    const createdStarPack = (await starPackResponse.json()) as CreatedStarPackResponse;
    const starPackId = createdStarPack.data?.id ?? "";
    expect(starPackId).toBeTruthy();

    const createOrderResponse = await page.request.post(`${backendBaseUrl}/api/v1/economy/orders/star-pack/`, {
      data: {
        star_pack: starPackId,
        provider_name: "playwright",
        provider_order_reference: `PW-ORDER-REJECT-${uniqueSeed}`,
        metadata: {
          source: "playwright-admin-order-confirm-rejection",
        },
      },
      headers: {
        Authorization: `Bearer ${studentAccessToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(createOrderResponse.ok(), await createOrderResponse.text()).toBe(true);

    await gotoAdminEconomyLane(page);

    const supportCard = supportActionsCard(page);
    await expect(supportCard).toBeVisible();

    const studentSelect = supportCard.getByLabel(/^student$/i);
    await expect(studentSelect).toBeVisible();
    await studentSelect.selectOption(studentId);
    await supportCard.getByLabel(/institute economy workspace view/i).selectOption("orders");

    const operatorQueuePanel = page.locator(".dashboardPanel").filter({
      has: page.getByRole("heading", { name: /pending order requests for the selected student/i }),
    }).first();
    await expect(operatorQueuePanel).toBeVisible();

    const pendingOrderRow = operatorQueuePanel.locator(".weakTopicRow").filter({
      has: page.getByText(/star pack/i),
      hasNot: page.getByText(/completed/i),
    }).first();
    await expect(pendingOrderRow).toBeVisible();

    const missingOrderId = "00000000-0000-0000-0000-000000000408";
    await page.evaluate((staleOrderId) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
        if (/\/api\/admin\/economy\/orders\/[^/]+\/confirm/.test(url)) {
          const nextUrl = url.replace(
            /\/api\/admin\/economy\/orders\/[^/]+\/confirm/,
            `/api/admin/economy/orders/${staleOrderId}/confirm`,
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
    }, missingOrderId);

    const confirmResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/economy/orders/${missingOrderId}/confirm`) &&
        response.request().method() === "POST",
    );

    await pendingOrderRow.getByRole("button", { name: /confirm order/i }).click();
    const confirmResponse = await confirmResponsePromise;
    expect(confirmResponse.ok(), await confirmResponse.text()).toBe(false);

    await expect(
      supportCard.getByText(/payment order not found|order confirmation failed with status 404|order confirmation failed with status 400/i).first(),
    ).toBeVisible();
    await expect(supportCard.getByText(/payment order completed successfully\./i)).toHaveCount(0);
    await expect(pendingOrderRow.getByRole("button", { name: /confirm order/i })).toBeVisible();
  });
});
