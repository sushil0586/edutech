import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

type LifecycleIdentity = {
  examTitle: string;
  studentProfileId: string;
  studentDisplayName: string;
};

const evidencePath = process.env.PLAYWRIGHT_PHASE7_EVIDENCE_PATH?.trim() ?? "";

test.describe("Phase 7 connected lifecycle readback", () => {
  test.skip(testRequiresRole("parent"), "Parent Playwright credentials are required.");
  test.skip(!evidencePath, "PLAYWRIGHT_PHASE7_EVIDENCE_PATH is required.");

  test("parent can read the connected published result", async ({ page }) => {
    const identity = JSON.parse(readFileSync(evidencePath, "utf8")) as LifecycleIdentity;

    await loginAsRole(page, "parent");
    await page.goto(`/parent/progress?child_id=${identity.studentProfileId}`);

    await expect(page.getByRole("heading", { name: /academic progress/i })).toBeVisible();
    await expect(page.getByText(identity.studentDisplayName, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(identity.examTitle, { exact: false }).first()).toBeVisible();
  });
});
