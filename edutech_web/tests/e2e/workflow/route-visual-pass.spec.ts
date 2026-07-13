import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

import { type PlaywrightRole } from "../fixtures/env";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  type VisualPassEntry,
  visualPassManifest,
} from "../helpers/visual-pass-manifest";

const visualPassEnabled = process.env.PLAYWRIGHT_ENABLE_VISUAL_PASS === "1";
const roleFilter = (process.env.PLAYWRIGHT_VISUAL_PASS_ROLE ?? "").trim().toLowerCase();
const mobilePassEnabled = process.env.PLAYWRIGHT_VISUAL_PASS_MOBILE === "1";
const outputRoot = path.resolve(
  process.cwd(),
  "artifacts",
  mobilePassEnabled ? "visual-pass-mobile" : "visual-pass",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function filteredManifest() {
  if (!roleFilter) {
    return visualPassManifest;
  }
  return visualPassManifest.filter((entry) => entry.role === roleFilter);
}

function groupedManifest() {
  const groups = new Map<string, VisualPassEntry[]>();
  for (const entry of filteredManifest()) {
    const current = groups.get(entry.role) ?? [];
    current.push(entry);
    groups.set(entry.role, current);
  }
  return [...groups.entries()];
}

async function waitForVisualReady(page: Page, entry: VisualPassEntry) {
  const acceptedPaths = entry.acceptedPaths?.length ? entry.acceptedPaths : [entry.path];
  const acceptedPattern = acceptedPaths
    .map((candidate) => escapeRegExp(candidate))
    .join("|");
  await expect(page).toHaveURL(new RegExp(`^.*(?:${acceptedPattern})(?:\\?.*)?$`));
  await page.waitForLoadState("domcontentloaded");
  if (entry.readyHeading) {
    const heading = page.getByRole("heading", { name: entry.readyHeading }).first();
    if (await heading.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
  }
  if (entry.readyText) {
    const text = page.getByText(entry.readyText).first();
    if (await text.isVisible({ timeout: 5000 }).catch(() => false)) {
      return;
    }
  }
}

async function captureScreen(page: Page, entry: VisualPassEntry) {
  if (mobilePassEnabled) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  if (entry.role !== "anonymous") {
    await loginAsRole(page, entry.role as PlaywrightRole);
  }
  await page.goto(entry.path);
  await waitForVisualReady(page, entry);

  const roleDir = path.join(outputRoot, entry.role);
  await fs.mkdir(roleDir, { recursive: true });
  const filePath = path.join(roleDir, `${entry.id}.png`);
  await page.screenshot({
    fullPage: true,
    path: filePath,
  });
}

test.describe("Route visual pass", () => {
  test.skip(!visualPassEnabled, "Enable PLAYWRIGHT_ENABLE_VISUAL_PASS=1 to run visual screenshot capture.");

  for (const [role, entries] of groupedManifest()) {
    test(`captures ${role} screen inventory`, async ({ page }) => {
      test.setTimeout(180_000);
      if (role !== "anonymous") {
        test.skip(testRequiresRole(role as PlaywrightRole), `Playwright credentials for ${role} are not configured.`);
      }

      await fs.mkdir(outputRoot, { recursive: true });

      for (const entry of entries) {
        await test.step(`${entry.role}:${entry.id}`, async () => {
          await captureScreen(page, entry);
        });
      }
    });
  }
});
