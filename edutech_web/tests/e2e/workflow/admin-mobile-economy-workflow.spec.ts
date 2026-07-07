import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function openMobileAdminNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /platform admin navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-workspace-menu")).toBeVisible();
  return page.locator("#mobile-workspace-menu");
}

function economyWorkspaceNav(page: Page) {
  return page.getByRole("navigation", { name: /economy workspace sections/i });
}

test.describe("Admin mobile economy workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin"),
    "Admin Playwright credentials are not configured.",
  );

  test("@workflow admin mobile viewport supports economy lane switching and dense policy form review", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    const mobileNav = await openMobileAdminNav(page);
    await expect(mobileNav.getByRole("link", { name: /^economy$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^economy$/i }).click();

    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /scope the page before reviewing data/i })).toBeVisible();
    await expect(page.getByText(/current workspace lane/i).first()).toBeVisible();

    const workspaceNav = economyWorkspaceNav(page);
    await expect(workspaceNav).toBeVisible();

    await workspaceNav.getByRole("link", { name: /catalog/i }).click();
    await expect(page).toHaveURL(/tab=catalog/);
    await expect(
      page.getByRole("heading", {
        name: /activate or pause live wallet, referral, and subscription catalog lanes/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /create and edit live wallet pack offers/i })).toBeVisible();

    const starPackName = page.getByLabel(/pack name/i);
    await expect(starPackName).toBeVisible();
    await starPackName.fill("Mobile Browser Pack");
    await expect(starPackName).toHaveValue("Mobile Browser Pack");
    await page.getByRole("button", { name: /clear form/i }).first().click();
    await expect(starPackName).toHaveValue("");

    await workspaceNav.getByRole("link", { name: /access control/i }).click();
    await expect(page).toHaveURL(/tab=access-control/);
    await expect(
      page.getByRole("heading", { name: /institute-admin support limits/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /create and edit premium access policies by content target/i }),
    ).toBeVisible();

    const canGrantStars = page.getByLabel(/institute admin can grant stars/i);
    const maxStars = page.getByLabel(/max stars per grant/i);
    await expect(canGrantStars).toBeVisible();
    await canGrantStars.selectOption("no");
    await expect(canGrantStars).toHaveValue("no");
    await maxStars.fill("15");
    await expect(maxStars).toHaveValue("15");
    await expect(page.getByRole("button", { name: /save economy policy/i })).toBeVisible();
    await expect(page.getByText(/policy history/i).first()).toBeVisible();

    await workspaceNav.getByRole("link", { name: /support ops/i }).click();
    await expect(page).toHaveURL(/tab=support-ops/);
    await expect(
      page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
    ).toBeVisible();
    const starsInput = page.getByLabel(/stars to grant/i);
    await expect(starsInput).toBeVisible();
    await expect(starsInput).toHaveValue("25");
    await starsInput.fill("30");
    await expect(starsInput).toHaveValue("30");
    await expect(page.getByRole("button", { name: /grant stars/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh unlocks/i })).toBeVisible();
  });
});
