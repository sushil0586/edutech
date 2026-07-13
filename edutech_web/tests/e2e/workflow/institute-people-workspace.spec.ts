import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function rosterHeading(page: Page, name: RegExp) {
  return page.getByRole("heading", { name }).first();
}

function rosterRows(page: Page) {
  return page.locator(".adminPeopleRosterTable tbody tr");
}

async function gotoInstitutePeople(page: Page, view: "students" | "teachers" = "students") {
  await gotoWithRuntimeRecovery(page, `/institute/people?view=${view}`);
  await expect(page.getByRole("heading", { name: /^people$/i }).first()).toBeVisible();
  await expect(
    page.getByText(/manage student and teacher records inside the current institute scope/i).first(),
  ).toBeVisible();
}

async function expectRosterSurface(page: Page, view: "students" | "teachers") {
  await expect(
    rosterHeading(page, view === "students" ? /student roster/i : /teacher roster/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await expect(page.getByLabel(/search roster/i)).toBeVisible();
  await expect(page.getByLabel(/filter login status/i)).toBeVisible();
  await expect(page.getByLabel(/sort by name/i)).toBeVisible();
}

async function countVisibleRows(rows: Locator) {
  const total = await rows.count();
  let visible = 0;
  for (let index = 0; index < total; index += 1) {
    if (await rows.nth(index).isVisible().catch(() => false)) {
      visible += 1;
    }
  }
  return visible;
}

test.describe("Institute people workspace", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute can switch roster views, use controls, and open create/import handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoInstitutePeople(page, "students");
    await expectRosterSurface(page, "students");
    await expect(page.getByRole("link", { name: /^students$/i }).first()).toHaveClass(/adminPeopleViewTabActive/);

    const initialRows = rosterRows(page);
    const initialVisibleCount = await countVisibleRows(initialRows);
    const initialMetaText = ((await page.locator(".rosterBrowserMeta").first().textContent()) ?? "").trim();
    expect(initialMetaText).toMatch(/\d+\s+shown/i);
    expect(initialMetaText).toMatch(/\d+\s+total/i);

    await page.getByLabel(/search roster/i).fill("__playwright_no_match__");
    await expect(page.getByText(/no roster records match the current view/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /clear search and filters/i })).toBeVisible();
    await page.getByRole("button", { name: /clear search and filters/i }).click();
    await expect(page.getByLabel(/search roster/i)).toHaveValue("");

    await page.getByRole("button", { name: /^login ready$/i }).click();
    await expect(page.getByRole("button", { name: /reset view/i })).toBeVisible();
    const loginReadyMeta = ((await page.locator(".rosterBrowserMeta").first().textContent()) ?? "").trim();
    expect(loginReadyMeta).toMatch(/\d+\s+shown/i);

    await page.getByRole("button", { name: /reset view/i }).click();
    await expect(page.getByLabel(/filter login status/i)).toHaveValue("all");
    await expect(page.getByLabel(/sort by name/i)).toHaveValue("name-asc");

    if (initialVisibleCount >= 2) {
      const ascNames = await page
        .locator(".adminPeopleRosterTable tbody tr td:first-child strong")
        .evaluateAll((items) => items.map((item) => item.textContent?.trim() ?? "").filter(Boolean));
      await page.getByLabel(/sort by name/i).selectOption("name-desc");
      const descNames = await page
        .locator(".adminPeopleRosterTable tbody tr td:first-child strong")
        .evaluateAll((items) => items.map((item) => item.textContent?.trim() ?? "").filter(Boolean));
      expect(descNames).toEqual([...ascNames].reverse());
      await page.getByRole("button", { name: /reset view/i }).click();
    }

    await page.getByRole("button", { name: /create student/i }).click();
    const studentDialog = page.getByRole("dialog");
    await expect(studentDialog.getByText(/new student profile/i).first()).toBeVisible();
    await expect(studentDialog.getByText(/add a student profile and optionally generate a login in one step/i).first()).toBeVisible();
    await studentDialog.getByRole("button", { name: /close/i }).click();
    await expect(studentDialog).toBeHidden();

    await page.getByRole("button", { name: /import students/i }).click();
    const importDialog = page.getByRole("dialog");
    await expect(importDialog.getByRole("heading", { name: /bulk import students/i })).toBeVisible();
    await expect(importDialog.getByText(/upload a csv to create student profiles/i).first()).toBeVisible();
    await importDialog.getByRole("button", { name: /close/i }).click();
    await expect(importDialog).toBeHidden();

    await page.getByRole("link", { name: /^teachers$/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/people\?view=teachers/);
    await expectRosterSurface(page, "teachers");
    await expect(page.getByRole("link", { name: /^teachers$/i }).first()).toHaveClass(/adminPeopleViewTabActive/);

    await page.getByLabel(/filter login status/i).selectOption("inactive");
    await expect(page.getByRole("button", { name: /reset view/i })).toBeVisible();
    await page.getByRole("button", { name: /reset view/i }).click();
    await expect(page.getByLabel(/filter login status/i)).toHaveValue("all");

    await page.getByRole("button", { name: /create teacher/i }).click();
    const teacherDialog = page.getByRole("dialog");
    await expect(teacherDialog.getByText(/new teacher profile/i).first()).toBeVisible();
    await expect(teacherDialog.getByText(/add a teacher profile and optionally generate a login in one step/i).first()).toBeVisible();
    await teacherDialog.getByRole("button", { name: /close/i }).click();
    await expect(teacherDialog).toBeHidden();

    await page.getByRole("button", { name: /import teachers/i }).click();
    await expect(importDialog.getByRole("heading", { name: /bulk import teachers/i })).toBeVisible();
    await expect(importDialog.getByText(/upload a csv to create teacher profiles/i).first()).toBeVisible();
    await importDialog.getByRole("button", { name: /close/i }).click();
    await expect(importDialog).toBeHidden();

    await page.getByRole("link", { name: /academic setup/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  });
});
