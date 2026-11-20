import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import { getAdminAccessToken, uniqueOnboardingSeed } from "../helpers/onboarding";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const backendBaseUrl = resolveBackendBaseUrl();
const enabled = isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS");

type InstituteRecord = {
  id: string;
  name: string;
  code: string;
  updated_at: string;
};

async function createInstitute(page: Page, token: string, name: string, code: string) {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/institutes/`, {
    data: { name, code },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as InstituteRecord;
}

async function deleteInstitute(page: Page, token: string, id: string) {
  const response = await page.request.delete(`${backendBaseUrl}/api/v1/institutes/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 204, 404]).toContain(response.status());
}

test.describe("Platform institute directory integrity", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");
  test.skip(
    !enabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_INSTITUTE_ACTIONS",
      "institute directory concurrency and pagination",
    ),
  );

  test("@workflow @mutable rejects a stale edit without overwriting the authoritative value", async ({ page }) => {
    await loginAsRole(page, "admin");
    const token = await getAdminAccessToken(page);
    const seed = uniqueOnboardingSeed();
    const created = await createInstitute(page, token, `Concurrency ${seed}`, `PWC${seed.slice(-6)}`);

    try {
      await page.goto(`/admin/institutes?institute=${created.id}`);
      await page.getByRole("button", { name: /edit selected/i }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel(/institute name/i).fill(`Stale browser ${seed}`);

      const authoritativeName = `Authoritative ${seed}`;
      const external = await page.request.patch(`${backendBaseUrl}/api/v1/institutes/${created.id}/`, {
        data: { name: authoritativeName, expected_updated_at: created.updated_at },
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(external.ok(), await external.text()).toBe(true);

      const conflictPromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/institutes/${created.id}`) &&
          response.request().method() === "PATCH",
      );
      await dialog.getByRole("button", { name: /save institute/i }).click();
      const conflict = await conflictPromise;
      expect(conflict.status()).toBe(409);
      await expect(dialog.getByText(/changed after you opened it/i)).toBeVisible();

      const persisted = await page.request.get(`${backendBaseUrl}/api/v1/institutes/${created.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(persisted.ok()).toBe(true);
      expect(((await persisted.json()) as InstituteRecord).name).toBe(authoritativeName);
    } finally {
      await deleteInstitute(page, token, created.id);
    }
  });

  test("@workflow @mutable sorts every supported mode and paginates bounded directory results", async ({ page }) => {
    await loginAsRole(page, "admin");
    const token = await getAdminAccessToken(page);
    const seed = uniqueOnboardingSeed();
    const created: InstituteRecord[] = [];

    try {
      for (let index = 0; index < 7; index += 1) {
        created.push(
          await createInstitute(
            page,
            token,
            `PW Directory ${String.fromCharCode(65 + index)} ${seed}`,
            `PWD${index}${seed.slice(-5)}`,
          ),
        );
      }

      await page.goto("/admin/institutes");
      await page.getByRole("searchbox", { name: /search by name, code, city/i }).fill(seed);
      await page.getByLabel("Institutes per page").selectOption("5");
      await expect(page.getByRole("navigation", { name: /institute directory pagination/i })).toBeVisible();
      await expect(page.getByText("Page 1 of 2")).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(5);

      await page.getByRole("button", { name: "Next" }).click();
      await expect(page.getByText("Page 2 of 2")).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(2);
      await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

      await page.getByLabel("Sort institutes").selectOption("name_desc");
      await expect(page.getByText("Page 1 of 2")).toBeVisible();
      await expect(page.locator("tbody tr").first()).toContainText(`PW Directory G ${seed}`);

      await page.getByLabel("Sort institutes").selectOption("code");
      await expect(page.locator("tbody tr").first()).toContainText(`PWD0${seed.slice(-5)}`);

      await page.getByLabel("Sort institutes").selectOption("updated_desc");
      await expect(page.locator("tbody tr").first()).toContainText(`PW Directory G ${seed}`);

      await page.getByLabel("Sort institutes").selectOption("status_name");
      await expect(page.locator("tbody tr").first()).toContainText(`PW Directory A ${seed}`);
    } finally {
      for (const institute of created.reverse()) {
        await deleteInstitute(page, token, institute.id);
      }
    }
  });
});
