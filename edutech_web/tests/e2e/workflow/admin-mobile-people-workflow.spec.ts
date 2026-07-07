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

async function expectRosterOrEmptyState(page: Page, resource: "students" | "teachers") {
  const rosterRows = page.locator(".adminPeopleRosterTable tbody tr");
  const rowCount = await rosterRows.count();

  if (rowCount > 0) {
    await expect(rosterRows.first()).toBeVisible();
    return;
  }

  await expect(
    page.getByText(
      resource === "students"
        ? /no student records are available yet/i
        : /no teacher records are available yet/i,
    ),
  ).toBeVisible();
}

test.describe("Admin mobile people workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin"),
    "Admin Playwright credentials are not configured.",
  );

  test("@workflow admin mobile viewport supports people lane switching and roster empty-state recovery", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    const mobileNav = await openMobileAdminNav(page);
    await expect(mobileNav.getByRole("link", { name: /^people$/i })).toBeVisible();
    await mobileNav.getByRole("link", { name: /^people$/i }).click();

    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^people$/i }).first()).toBeVisible();
    await expect(page.getByText(/live roster/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /student roster and login management/i })).toBeVisible();

    await expect(page.getByRole("link", { name: /^students$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^teachers$/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /select institute/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^open$/i })).toBeVisible();

    await expect(page.getByRole("button", { name: /create student/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import students/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /filter login status/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /sort by name/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
    await expectRosterOrEmptyState(page, "students");

    const studentRosterRows = page.locator(".adminPeopleRosterTable tbody tr");
    const studentRowCount = await studentRosterRows.count();

    if (studentRowCount > 0) {
      await page.getByRole("textbox", { name: /search roster/i }).fill("playwright-no-admin-people-mobile-students-2041");
      await expect(page.getByText(/no roster records match the current view/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /clear search and filters/i })).toBeVisible();
      await page.getByRole("button", { name: /clear search and filters/i }).click();
      await expect(studentRosterRows.first()).toBeVisible();
    }

    await page.getByRole("link", { name: /^teachers$/i }).click();
    await expect(page).toHaveURL(/view=teachers/);
    await expect(page.getByRole("button", { name: /create teacher/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import teachers/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /teacher roster and login management/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search roster/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /filter login status/i })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /sort by name/i })).toBeVisible();
    await expectRosterOrEmptyState(page, "teachers");

    const teacherRosterRows = page.locator(".adminPeopleRosterTable tbody tr");
    const teacherRowCount = await teacherRosterRows.count();

    if (teacherRowCount > 0) {
      await page.getByRole("button", { name: /^no login$/i }).click();
      await expect(
        page.getByText(/pending access|no roster records match the current view/i).first(),
      ).toBeVisible();

      await page.getByRole("textbox", { name: /search roster/i }).fill("playwright-no-admin-people-mobile-teachers-2041");
      await expect(page.getByText(/no roster records match the current view/i)).toBeVisible();
      await page.getByRole("button", { name: /clear search and filters/i }).click();
      await expect(teacherRosterRows.first()).toBeVisible();
    }
  });
});
