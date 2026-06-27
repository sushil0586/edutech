import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteExamsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await expect(page.getByText(/exam controls/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /quick create/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /advanced builder/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /preset library/i }).first()).toBeVisible();
}

test.describe("Institute exams workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter exams and use workspace handoffs", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expectInstituteExamsWorkspace(page);

    const teacherSelect = page.locator('select[name="teacher"]').first();
    const statusSelect = page.locator('select[name="exam_status"]').first();
    const sortSelect = page.locator('select[name="exam_sort"]').first();
    const groupSelect = page.locator('select[name="exam_group"]').first();
    const pageSizeSelect = page.locator('select[name="exam_page_size"]').first();

    await expect(teacherSelect).toBeVisible();
    await expect(statusSelect).toBeVisible();
    await expect(sortSelect).toBeVisible();
    await expect(groupSelect).toBeVisible();
    await expect(pageSizeSelect).toBeVisible();

    const teacherOptions = await teacherSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: option.textContent?.trim() ?? "",
        }))
        .filter((option) => option.value),
    );

    if (teacherOptions.length > 0) {
      const scopedTeacher = teacherOptions[0];
      const scopedTeacherName = scopedTeacher.label.replace(/\s+\([^)]+\)\s*$/, "");

      await teacherSelect.selectOption(scopedTeacher.value);
      await page.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(new RegExp(`teacher=${scopedTeacher.value}`));
      await expect(
        page.getByText(new RegExp(`^teacher: ${scopedTeacherName}$`, "i")).first(),
      ).toBeVisible();

      const scopedCards = page.locator(".examCard");
      const scopedEmptyState = page.getByRole("heading", {
        name: /no institute exams match these controls/i,
      });
      if (await scopedCards.first().isVisible().catch(() => false)) {
        await expect(scopedCards.first()).toBeVisible();
      } else {
        await expect(scopedEmptyState).toBeVisible();
      }

      await page.goto("/institute/exams");
      await expectInstituteExamsWorkspace(page);
      await expect(page.getByText(/^teacher: all teachers$/i).first()).toBeVisible();
    }

    await statusSelect.selectOption("live");
    await sortSelect.selectOption("start_soon");
    await groupSelect.selectOption("subject");
    await pageSizeSelect.selectOption("18");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/exam_status=live/);
    await expect(page).toHaveURL(/exam_sort=start_soon/);
    await expect(page).toHaveURL(/exam_group=subject/);
    await expect(page).toHaveURL(/exam_page_size=18/);
    await expect(page.getByText(/^status: live$/i).first()).toBeVisible();
    await expect(page.getByText(/^sort: start soon$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: subject$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /^scheduled$/i }).click();
    await expect(page).toHaveURL(/exam_status=scheduled/);
    await expect(page.getByText(/^status: scheduled$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /highest marks/i }).click();
    await expect(page).toHaveURL(/exam_sort=marks_high/);
    await expect(page.getByText(/^sort: marks high$/i).first()).toBeVisible();

    await page.getByRole("link", { name: /group by subject/i }).click();
    await expect(page).toHaveURL(/exam_group=subject/);

    const filteredExamCards = page.locator(".examCard");
    const filteredEmptyState = page.getByRole("heading", {
      name: /no institute exams match these controls/i,
    });
    if (await filteredExamCards.first().isVisible().catch(() => false)) {
      const firstFilteredCard = filteredExamCards.first();
      const firstTitle =
        (await firstFilteredCard.locator(".examCardTop strong").first().textContent())?.trim() ?? "";
      const firstSubtitle =
        (await firstFilteredCard.locator(".examCardTop span").first().textContent())?.trim() ?? "";
      const firstStatus =
        (
          await firstFilteredCard.locator(".examCardTop .statusPill").first().textContent()
        )?.trim() ?? "";
      const firstSubject = firstSubtitle.includes("·")
        ? firstSubtitle.split("·").slice(1).join("·").trim()
        : "";

      expect(firstTitle).not.toBe("");
      expect(firstStatus.toLowerCase()).toBe("scheduled");

      if (firstSubject) {
        await expect(
          page
            .locator(".sectionHeading strong")
            .filter({ hasText: new RegExp(`^${firstSubject}$`, "i") })
            .first(),
        ).toBeVisible();
      }

      await statusSelect.selectOption("all");
      await sortSelect.selectOption("marks_high");
      await groupSelect.selectOption("status");
      await page.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(/exam_sort=marks_high/);
      await expect(page).toHaveURL(/exam_group=status/);
      await expect(page.getByText(/^status: all$/i).first()).toBeVisible();
      await expect(page.getByText(/^group: status$/i).first()).toBeVisible();
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({ hasText: new RegExp(`^${firstStatus}$`, "i") })
          .first(),
      ).toBeVisible();
      await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();
    } else {
      await expect(filteredEmptyState).toBeVisible();
    }

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expectInstituteExamsWorkspace(page);
    await expect(page.getByText(/^status: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^sort: recommended$/i).first()).toBeVisible();
    await expect(page.getByText(/^group: none$/i).first()).toBeVisible();

    const examCards = page.locator(".examCard");
    await expect(examCards.first()).toBeVisible();

    const firstCard = examCards.first();
    const firstTitle =
      (await firstCard.locator(".examCardTop strong").first().textContent())?.trim() ?? "";
    const firstSubtitle =
      (await firstCard.locator(".examCardTop span").first().textContent())?.trim() ?? "";
    const firstStatus =
      (await firstCard.locator(".examCardTop .statusPill").first().textContent())?.trim() ?? "";
    const firstType =
      (await firstCard.locator(".questionBankTagChip").first().textContent())?.trim() ?? "";
    const firstSubject = firstSubtitle.includes("·")
      ? firstSubtitle.split("·").slice(1).join("·").trim()
      : "";

    expect(firstTitle).not.toBe("");
    expect(["live", "scheduled", "draft"]).toContain(firstStatus.toLowerCase());

    if (firstType) {
      await groupSelect.selectOption("type");
      await page.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(/exam_group=type/);
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({ hasText: new RegExp(`^${firstType}$`, "i") })
          .first(),
      ).toBeVisible();
      await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();
    }

    if (firstSubject) {
      await groupSelect.selectOption("subject");
      await page.getByRole("button", { name: /apply filters/i }).click();

      await expect(page).toHaveURL(/exam_group=subject/);
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({ hasText: new RegExp(`^${firstSubject}$`, "i") })
          .first(),
      ).toBeVisible();
      await expect(page.locator(".examCard").filter({ hasText: firstTitle }).first()).toBeVisible();
    }

    await sortSelect.selectOption("title");
    await groupSelect.selectOption("none");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/exam_sort=title/);

    const visibleTitles = await page
      .locator(".examCard .examCardTop strong")
      .evaluateAll((elements) => elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean));
    if (visibleTitles.length >= 2) {
      expect(visibleTitles).toEqual([...visibleTitles].sort((left, right) => left.localeCompare(right)));
    }

    await page.getByRole("link", { name: /^all$/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    await expect(page.getByText(/^status: all$/i).first()).toBeVisible();

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open builder/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/institute/exams");
    await expectInstituteExamsWorkspace(page);

    await page.locator('a[href="/institute/exams/preset-packs"]').first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/preset-packs(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /preset pack library/i }).first()).toBeVisible();

    await page.goto("/institute/exams");
    await expectInstituteExamsWorkspace(page);

    await page.getByRole("link", { name: /advanced builder/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/advanced(?:\?.*)?$/);
    await expect(page.getByText(/advanced exam builder/i).first()).toBeVisible();

    await page.goto("/institute/exams");
    await expectInstituteExamsWorkspace(page);

    await page.getByRole("link", { name: /quick create/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/new(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

    await page.goto("/institute/exams");
    await expectInstituteExamsWorkspace(page);

    await page.locator('a[href="/institute/question-bank"]').first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
  });
});
