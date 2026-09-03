import { type Page } from "@playwright/test";

const NEXT_FALLBACK_HEADING = /this page couldn[’']t load/i;
const NEXT_FALLBACK_RELOAD_BUTTON = /^reload$/i;

async function isTransientFallbackPage(page: Page) {
  return page.getByRole("heading", { name: NEXT_FALLBACK_HEADING }).first().isVisible().catch(() => false);
}

async function recoverTransientFallbackPage(page: Page) {
  const reloadButton = page.getByRole("button", { name: NEXT_FALLBACK_RELOAD_BUTTON }).first();

  if (await reloadButton.isVisible().catch(() => false)) {
    await reloadButton.click();
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    return;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
}

async function waitForFallbackToSettle(page: Page, milliseconds = 3000) {
  const interval = 500;
  const attempts = Math.max(1, Math.ceil(milliseconds / interval));

  for (let index = 0; index < attempts; index += 1) {
    if (!(await isTransientFallbackPage(page))) {
      return false;
    }

    await page.waitForTimeout(interval);
  }

  return await isTransientFallbackPage(page);
}

async function settlePageAfterNavigation(page: Page) {
  await page.waitForLoadState("load", { timeout: 5000 }).catch(() => null);
}

async function waitForTargetUrl(page: Page, url: string) {
  const target = new URL(url, "http://localhost");
  await page
    .waitForURL((current) => {
      if (current.pathname !== target.pathname) {
        return false;
      }

      return !target.search || current.search === target.search;
    }, { timeout: 5000 })
    .catch(() => null);
}

export async function gotoWithRuntimeRecovery(page: Page, url: string, attempts = 4) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "commit" });
      await waitForTargetUrl(page, url);
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => null);
      await settlePageAfterNavigation(page);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retriable =
        message.includes("ERR_CONNECTION_REFUSED") ||
        message.includes("ERR_ABORTED") ||
        message.includes("NS_BINDING_ABORTED") ||
        message.includes("interrupted by another navigation");

      if (!retriable || attempt === attempts) {
        throw error;
      }

      await page.waitForTimeout(1000 * attempt);
      continue;
    }

    if (!(await waitForFallbackToSettle(page))) {
      return;
    }

    lastError = new Error(`Transient Next fallback page rendered for ${url}`);
    if (attempt < attempts) {
      await recoverTransientFallbackPage(page);
      await settlePageAfterNavigation(page);
      await page.waitForTimeout(1000 * attempt);
    }
  }

  throw lastError ?? new Error(`Unable to load ${url}`);
}
