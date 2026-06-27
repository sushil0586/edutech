import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import {
  expectFamilyPresetPackContracts,
  fetchPresetPacks,
} from "../helpers/preset-packs";

const familySearchExpectations = [
  { query: "NEET", label: /neet mock/i },
  { query: "JEE", label: /jee mains math/i },
  { query: "GRE", label: /gre quant/i },
  { query: "AWS", label: /aws practitioner/i },
];

test.describe("Admin family preset packs", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can verify NEET, JEE, GRE, and AWS preset-pack defaults", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const payload = await fetchPresetPacks(page);
    expect(payload.count).toBeGreaterThanOrEqual(4);
    expectFamilyPresetPackContracts(payload.results);

    await page.goto("/admin/exams/preset-packs");
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();

    const searchInput = page.getByLabel(/search preset packs/i).first();
    for (const family of familySearchExpectations) {
      await searchInput.fill(family.query);
      await expect(searchInput).toHaveValue(family.query);
      await expect(page.getByText(family.label).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open in builder/i }).first()).toBeVisible();
    }
  });
});
