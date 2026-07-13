import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function laneSelect(page: Page) {
  return page.getByRole("combobox", { name: /focus lane/i });
}

function subjectSelect(page: Page) {
  return page.getByRole("combobox", { name: /^subject$/i });
}

function sortSelect(page: Page) {
  return page.getByRole("combobox", { name: /sort by/i });
}

async function openDashboard(page: Page, path = "/teacher/dashboard") {
  await gotoWithRuntimeRecovery(page, path);
  await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();
  await expect(page.getByText(/dashboard controls/i).first()).toBeVisible();
}

function metricCard(page: Page, label: RegExp) {
  return page.locator("article").filter({ has: page.getByText(label) }).first();
}

test.describe("Teacher dashboard workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can filter dashboard focus lanes and use workspace handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await openDashboard(page);

    await expect(metricCard(page, /^tracked exams$/i)).toBeVisible();
    await expect(metricCard(page, /^total attempts$/i)).toBeVisible();
    await expect(metricCard(page, /^pending reviews$/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /^new exam$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^new question$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^open exams$/i }).first()).toBeVisible();

    await expect(laneSelect(page)).toHaveValue("all");
    await expect(subjectSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");

    await laneSelect(page).selectOption("delivery");
    await sortSelect(page).selectOption("attempts_high");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/teacher\/dashboard\?[^#]*lane=delivery/);
    await expect(page).toHaveURL(/\/teacher\/dashboard\?[^#]*sort=attempts_high/);
    await expect(page.getByText(/lane: delivery/i).first()).toBeVisible();
    await expect(page.getByText(/sort: attempts high/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^weakest topics$/i }).click();
    await expect(page).toHaveURL(/lane=weak_topics/);
    await expect(page).toHaveURL(/sort=score_low/);
    await expect(page.getByText(/lane: .*weak topics/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^top students$/i }).click();
    await expect(page).toHaveURL(/lane=students/);
    await expect(page).toHaveURL(/sort=score_high/);
    await expect(page.getByText(/lane: students/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^wrong questions$/i }).click();
    await expect(page).toHaveURL(/lane=questions/);
    await expect(page).toHaveURL(/sort=wrong_high/);
    await expect(page.getByText(/lane: questions/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard(?:\?.*)?$/);

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/teacher\/dashboard$/);

    await page.getByRole("link", { name: /^open exams$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await openDashboard(page);
    await page.getByRole("navigation", { name: /teacher navigation/i }).getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^results$/i }).first()).toBeVisible();

    await openDashboard(page);
    await page.getByRole("navigation", { name: /teacher navigation/i }).getByRole("link", { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
  });
});
