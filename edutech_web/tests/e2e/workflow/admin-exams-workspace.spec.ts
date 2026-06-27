import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin exams workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can filter exams and use detail and builder handoffs", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/exams");

    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByText(/exam controls/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();

    const instituteSelect = page.locator('select[name="institute"]').first();
    const statusSelect = page.locator('select[name="exam_status"]').first();
    const sourceSelect = page.locator('select[name="exam_source"]').first();
    const sortSelect = page.locator('select[name="exam_sort"]').first();
    const groupSelect = page.locator('select[name="exam_group"]').first();

    await expect(instituteSelect).toBeVisible();

    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: option.textContent?.trim() ?? "",
        }))
        .filter((option) => option.value),
    );

    if (instituteOptions.length > 0) {
      const scopedInstitute = instituteOptions[0];
      const scopedInstituteCodeMatch = scopedInstitute.label.match(/\(([^)]+)\)\s*$/);
      const scopedInstituteCode = scopedInstituteCodeMatch?.[1] ?? scopedInstitute.label;
      await instituteSelect.selectOption(scopedInstitute.value);
      await page.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(new RegExp(`institute=${scopedInstitute.value}`));
      await expect(
        page.getByText(new RegExp(`^institute: ${scopedInstituteCode}$`, "i")).first(),
      ).toBeVisible();

      const scopedCards = page.locator(".examCard");
      const scopedEmptyState = page.getByRole("heading", { name: /no exams match these platform controls/i });
      if (await scopedCards.first().isVisible().catch(() => false)) {
        await expect(scopedCards.first()).toBeVisible();
      } else {
        await expect(scopedEmptyState).toBeVisible();
      }

      await page.goto("/admin/exams");
      await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      await expect(page.getByText(/^institute: all$/i).first()).toBeVisible();
    }

    await statusSelect.selectOption("live");
    await sourceSelect.selectOption("teacher");
    await sortSelect.selectOption("start_soon");
    await groupSelect.selectOption("source");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/exam_status=live/);
    await expect(page).toHaveURL(/exam_source=teacher/);
    await expect(page).toHaveURL(/exam_sort=start_soon/);
    await expect(page).toHaveURL(/exam_group=source/);

    await page.getByRole("link", { name: /^platform$/i }).click();
    await expect(page).toHaveURL(/exam_source=platform/);

    await page.getByRole("link", { name: /^live$/i }).click();
    await expect(page).toHaveURL(/exam_status=live/);

    await page.getByRole("link", { name: /group by source/i }).click();
    await expect(page).toHaveURL(/exam_group=source/);
    await expect(page.getByRole("heading", { name: /no exams match these platform controls/i })).toBeVisible();

    await page.getByRole("link", { name: /reset exam filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByText(/^status: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^source: all$/i).first()).toBeVisible();

    const examCards = page.locator(".examCard");
    await expect(examCards.first()).toBeVisible();

    const firstCard = examCards.first();
    const firstTitle = (await firstCard.locator(".examCardTop strong").first().textContent())?.trim() ?? "";
    const firstSubtitle = (await firstCard.locator(".examCardTop span").first().textContent())?.trim() ?? "";
    const firstStatusLabel =
      (await firstCard.locator(".examCardTop .statusPill").first().textContent())?.trim().toLowerCase() ?? "";
    const firstSourceLabel =
      (await firstCard.locator(".examMetaGrid div strong").nth(0).textContent())
        ?.trim()
        .toLowerCase() ?? "";
    const firstTypeLabel =
      (await firstCard.locator(".examStateSummary strong").first().textContent())?.trim() ?? "";
    const firstSubjectLabel = firstSubtitle.includes("·")
      ? firstSubtitle.split("·").slice(1).join("·").trim()
      : "";

    expect(firstTitle).not.toBe("");
    expect(["live", "scheduled", "draft"]).toContain(firstStatusLabel);
    expect(["platform", "institute", "teacher"]).toContain(firstSourceLabel);

    await page.goto(
      `/admin/exams?exam_status=${encodeURIComponent(firstStatusLabel)}&exam_source=${encodeURIComponent(firstSourceLabel)}&exam_group=status`,
    );

    await expect(page).toHaveURL(new RegExp(`exam_status=${firstStatusLabel}`));
    await expect(page).toHaveURL(new RegExp(`exam_source=${firstSourceLabel}`));
    await expect(page).toHaveURL(/exam_group=status/);
    await expect(page.getByText(new RegExp(`^status: ${firstStatusLabel}$`, "i")).first()).toBeVisible();
    await expect(page.getByText(new RegExp(`^source: ${firstSourceLabel}$`, "i")).first()).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: new RegExp(`^${firstStatusLabel}$`, "i") }).first(),
    ).toBeVisible();
    await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();

    await page.goto(
      `/admin/exams?exam_source=${encodeURIComponent(firstSourceLabel)}&exam_group=source`,
    );

    await expect(page).toHaveURL(new RegExp(`exam_source=${firstSourceLabel}`));
    await expect(page).toHaveURL(/exam_group=source/);
    await expect(page.getByText(new RegExp(`^source: ${firstSourceLabel}$`, "i")).first()).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: new RegExp(`^${firstSourceLabel}$`, "i") }).first(),
    ).toBeVisible();
    await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();

    if (firstSubjectLabel) {
      await page.goto(
        `/admin/exams?exam_source=${encodeURIComponent(firstSourceLabel)}&exam_group=subject`,
      );

      await expect(page).toHaveURL(/exam_group=subject/);
      await expect(page.getByText(new RegExp(`^source: ${firstSourceLabel}$`, "i")).first()).toBeVisible();
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({ hasText: new RegExp(`^${escapeRegExp(firstSubjectLabel)}$`, "i") })
          .first(),
      ).toBeVisible();
      await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();
    }

    if (firstTypeLabel) {
      await page.goto(
        `/admin/exams?exam_source=${encodeURIComponent(firstSourceLabel)}&exam_group=type`,
      );

      await expect(page).toHaveURL(/exam_group=type/);
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({ hasText: new RegExp(`^${escapeRegExp(firstTypeLabel)}$`, "i") })
          .first(),
      ).toBeVisible();
      await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();
    }

    await page.goto(`/admin/exams?exam_source=${encodeURIComponent(firstSourceLabel)}&exam_sort=title`);
    await expect(page).toHaveURL(/exam_sort=title/);

    const visibleTitles = await page.locator(".examCard .examCardTop strong").evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean),
    );
    if (visibleTitles.length >= 2) {
      expect(visibleTitles).toEqual([...visibleTitles].sort((left, right) => left.localeCompare(right)));
    }

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+$/);

    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open builder/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/admin/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/exams/preset-packs"]').first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/preset-packs(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();

    await page.goto("/admin/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.locator('a[href="/admin/academic-setup"]').first().click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await page.goto("/admin/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/exams\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  });
});
