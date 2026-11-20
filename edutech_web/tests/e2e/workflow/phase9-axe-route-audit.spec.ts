import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

import { type PlaywrightRole } from "../fixtures/env";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { visualPassManifest } from "../helpers/visual-pass-manifest";

const axePath = path.resolve(process.cwd(), "node_modules", "axe-core", "axe.min.js");
const enabled = process.env.PLAYWRIGHT_ENABLE_PHASE9_AXE === "1";
const outputPath = path.resolve(process.cwd(), "artifacts", "phase9-axe-results.json");

type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[]; failureSummary?: string }>;
};

async function runAxe(page: Page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
    });
    return result.violations;
  }) as Promise<AxeViolation[]>;
}

test.describe("Phase 9 AXE route audit", () => {
  test.skip(!enabled, "Enable PLAYWRIGHT_ENABLE_PHASE9_AXE=1 for the route audit.");

  for (const role of ["anonymous", "admin", "institute", "teacher", "student", "parent"] as const) {
    test(`${role} primary routes have no serious or critical AXE violations`, async ({ page }) => {
      test.setTimeout(240_000);
      if (role !== "anonymous") {
        test.skip(testRequiresRole(role as PlaywrightRole), `Credentials for ${role} are required.`);
        await loginAsRole(page, role as PlaywrightRole);
      }

      const reports: Array<{ id: string; path: string; violations: AxeViolation[] }> = [];
      for (const entry of visualPassManifest.filter((candidate) => candidate.role === role)) {
        await page.goto(entry.path);
        await page.waitForLoadState("domcontentloaded");
        const violations = await runAxe(page);
        reports.push({ id: entry.id, path: entry.path, violations });
      }

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      const existing = await fs.readFile(outputPath, "utf8").then(JSON.parse).catch(() => []);
      await fs.writeFile(outputPath, `${JSON.stringify([...existing, ...reports], null, 2)}\n`, "utf8");

      const blockers = reports.flatMap((report) =>
        report.violations
          .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
          .map((violation) => ({ route: report.path, ...violation })),
      );
      expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
    });
  }
});

declare global {
  interface Window {
    axe: {
      run: (
        context: Document,
        options: { resultTypes: string[] },
      ) => Promise<{ violations: AxeViolation[] }>;
    };
  }
}
