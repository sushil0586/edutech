import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string | null) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function extractTrailingCount(value: string | null) {
  const match = value?.match(/·\s*(\d+)\s*$/);
  return match?.[1] ? Number(match[1]) : null;
}

function activeSectionPanel(page: import("@playwright/test").Page) {
  return page.locator(".dashboardPanel.academicSectionPanel").first();
}

function activeSectionAction(page: import("@playwright/test").Page) {
  return activeSectionPanel(page).getByRole("button", { name: /^new$/i });
}

function activeSectionEditAction(page: import("@playwright/test").Page) {
  return activeSectionPanel(page).getByRole("button", { name: /^edit$/i }).first();
}

function sectionLink(page: import("@playwright/test").Page, section: string) {
  return page.locator(`a[href*="/admin/academic-setup?"][href*="section=${section}"]`).first();
}

test.describe("Admin academic setup workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can switch academic setup sections and inspect defaults safely", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/academic-setup");

    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
    await expect(sectionLink(page, "academic-years")).toBeVisible();
    await expect(sectionLink(page, "programs")).toBeVisible();
    await expect(sectionLink(page, "cohorts")).toBeVisible();
    await expect(sectionLink(page, "subjects")).toBeVisible();
    await expect(sectionLink(page, "topics")).toBeVisible();
    await expect(sectionLink(page, "teacher-assignments")).toBeVisible();
    await expect(sectionLink(page, "exam-defaults")).toBeVisible();

    const instituteSelect = page.locator('select[aria-label="Select institute"]').first();
    await expect(instituteSelect).toBeVisible();
    await page.getByRole("button", { name: /^open$/i }).click();
    await expect(page).toHaveURL(/\/admin\/academic-setup\?/);

    await sectionLink(page, "programs").click();
    await expect(page).toHaveURL(/section=programs/);
    await expect(page.getByText(/^programs$/i).first()).toBeVisible();
    const showArchivedPrograms = page.getByRole("checkbox", { name: /show archived/i });
    await expect(showArchivedPrograms).toBeVisible();
    await showArchivedPrograms.check();
    await expect(showArchivedPrograms).toBeChecked();

    const sectionSummary = page.locator(".adminPeopleActionBarCopy > span").last();
    const visibleBadge = page.locator(".academicSectionHeader .setupFieldMeta").first();
    const sectionSummaryCount = extractTrailingCount(await sectionSummary.textContent());
    const visibleBadgeCount = extractLeadingNumber(await visibleBadge.textContent());
    expect(sectionSummaryCount).not.toBeNull();
    expect(visibleBadgeCount).not.toBeNull();

    await expect(activeSectionAction(page)).toBeVisible();
    await expect(activeSectionEditAction(page)).toBeVisible();
    await expect(activeSectionAction(page)).toBeVisible();

    await sectionLink(page, "subjects").click();
    await expect(page).toHaveURL(/section=subjects/);
    await expect(page.getByText(/^subjects$/i).first()).toBeVisible();
    await expect(activeSectionAction(page)).toBeVisible();
    await expect(activeSectionEditAction(page)).toBeVisible();
    await expect(activeSectionAction(page)).toBeVisible();

    await sectionLink(page, "topics").click();
    await expect(page).toHaveURL(/section=topics/);
    await expect(page.getByText(/^topics$/i).first()).toBeVisible();
    await expect(activeSectionAction(page)).toBeVisible();
    await expect(activeSectionEditAction(page)).toBeVisible();

    await sectionLink(page, "exam-defaults").click();
    await expect(page).toHaveURL(/section=exam-defaults/);
    await expect(page.getByText(/duration minutes/i).first()).toBeVisible();
    await expect(page.getByText(/max attempts/i).first()).toBeVisible();
    await expect(page.getByText(/timer mode/i).first()).toBeVisible();
    await expect(page.getByText(/navigation mode/i).first()).toBeVisible();
    await expect(page.getByText(/attempt policy/i).first()).toBeVisible();
    await expect(page.getByText(/security mode/i).first()).toBeVisible();
    await expect(page.getByText(/instructions/i).first()).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /allow resume/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save defaults/i })).toBeVisible();
  });
});
