import { type Page } from "@playwright/test";

const NEXT_FALLBACK_HEADING = /this page couldn[’']t load/i;

async function isTransientFallbackPage(page: Page) {
  return page.getByRole("heading", { name: NEXT_FALLBACK_HEADING }).first().isVisible().catch(() => false);
}

export async function gotoWithRuntimeRecovery(page: Page, url: string, attempts = 4) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retriable =
        message.includes("ERR_CONNECTION_REFUSED") ||
        message.includes("ERR_ABORTED");

      if (!retriable || attempt === attempts) {
        throw error;
      }

      await page.waitForTimeout(1500 * attempt);
      continue;
    }

    if (!(await isTransientFallbackPage(page))) {
      return;
    }

    lastError = new Error(`Transient Next fallback page rendered for ${url}`);
    if (attempt < attempts) {
      await page.waitForTimeout(500 * attempt);
    }
  }

  throw lastError ?? new Error(`Unable to load ${url}`);
}
