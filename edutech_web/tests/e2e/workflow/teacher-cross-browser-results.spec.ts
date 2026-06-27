import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

test.describe("Teacher cross-browser results routes", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can navigate results deep routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /open leaderboard/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/leaderboard(?:\?.*)?$/);
    await expect(page.getByText(/^leaderboard$/i).first()).toBeVisible();
    await expect(page.getByText(/publication checklist/i).first()).toBeVisible();

    await page.getByRole("link", {
      name: /analysis.*topics, hard questions, and skip patterns/i,
    }).first().click();
    await expect(page).toHaveURL(/\/teacher\/results\/analysis(?:\?.*)?$/);
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expect(page.getByText(/^student explorer$/i).first()).toBeVisible();

    await gotoWithRetry(page, "/teacher/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const liveMonitorNavLink = page.getByRole("link", {
      name: /live monitor.*intervention queue and active alerts/i,
    }).first();
    await expect(liveMonitorNavLink).toBeVisible();
    await liveMonitorNavLink.click();
    await expect(page).toHaveURL(/\/teacher\/results\/live(?:\?.*)?$/);
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
  });
});
