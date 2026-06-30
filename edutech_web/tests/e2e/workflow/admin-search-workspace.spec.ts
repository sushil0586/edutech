import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

type AdminSearchSeed = {
  instituteQuery: string;
  instituteName: string;
  peopleQuery: string;
  peopleView: "students" | "teachers";
  personName: string;
} | null;

test.describe("Admin search workspace", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin can filter workspace search and use search handoffs", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/search?q=exam");

    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i })).toBeVisible();
    await expect(page.getByText(/search controls/i).first()).toBeVisible();
    await expect(page.getByText(/suggested pages|result/i).first()).toBeVisible();

    const queryInput = page.locator('input[name="q"]').first();
    const sectionSelect = page.locator('select[name="section"]').first();
    const sourceSelect = page.locator('select[name="source"]').first();
    const sortSelect = page.locator('select[name="sort"]').first();
    const groupSelect = page.locator('select[name="group"]').first();

    await expect(queryInput).toHaveValue("exam");
    await expect(sectionSelect).toBeVisible();
    await sourceSelect.selectOption("live");
    await sortSelect.selectOption("title");
    await groupSelect.selectOption("section");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/q=exam/);
    await expect(page).toHaveURL(/source=live/);
    await expect(page).toHaveURL(/sort=title/);
    await expect(page).toHaveURL(/group=section/);

    await page.getByRole("link", { name: /^live records$/i }).click();
    await expect(page).toHaveURL(/source=live/);

    const workspacePagesLink = page.getByRole("link", { name: /^workspace pages$/i });
    await expect(workspacePagesLink).toHaveAttribute("href", /source=catalog/);
    await workspacePagesLink.click();
    await expect(page).toHaveURL(/source=catalog/);

    await page.getByRole("link", { name: /group by section/i }).click();
    await expect(page).toHaveURL(/group=section/);

    await page.goto("/admin/search?q=exam&group=source");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: /^Live records$/i }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".sectionHeading strong").filter({ hasText: /^Workspace pages$/i }).first(),
    ).toBeVisible();
    await expect(page.locator('a[href="/admin/exams/new"]').first()).toBeVisible();
    await expect(
      page
        .locator('main a[href^="/admin/exams/"]')
        .filter({ hasNot: page.locator('a[href="/admin/exams/new"]') })
        .first(),
    ).toBeVisible();

    const firstResultLink = page.locator('main a[href^="/admin/"]').filter({
      hasNot: page.getByRole("link", { name: /back to workspace/i }),
    }).first();
    await expect(firstResultLink).toBeVisible();
    const firstHref = await firstResultLink.getAttribute("href");
    expect(firstHref).not.toBeNull();
    await firstResultLink.click();
    await expect(page).toHaveURL(new RegExp(firstHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    await page.goto("/admin/search?q=exam");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).toHaveURL(/\/admin\/search(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();

    const liveSearchSeed = await page.evaluate<Promise<AdminSearchSeed>>(async () => {
      async function load(path: string) {
        const response = await fetch(path, { credentials: "include" });
        if (!response.ok) {
          return [];
        }
        const payload = (await response.json()) as { results?: Array<Record<string, unknown>> };
        return Array.isArray(payload.results) ? payload.results : [];
      }

      const [institutes, students, teachers] = await Promise.all([
        load("/api/v1/institutes/?page_size=20"),
        load("/api/v1/students/?page_size=20"),
        load("/api/v1/teachers/?page_size=20"),
      ]);

      const institute = institutes.find((item) => typeof item.code === "string" || typeof item.name === "string");
      const student = students.find(
        (item) =>
          typeof item.admission_no === "string" ||
          typeof item.full_name === "string" ||
          typeof item.first_name === "string",
      );
      const teacher = teachers.find(
        (item) =>
          typeof item.employee_code === "string" ||
          typeof item.full_name === "string" ||
          typeof item.first_name === "string",
      );

      const instituteQuery =
        typeof institute?.code === "string" && institute.code.trim()
          ? institute.code.trim()
          : typeof institute?.name === "string"
            ? institute.name.trim()
            : "";
      const instituteName = typeof institute?.name === "string" ? institute.name.trim() : "";

      const studentQuery =
        typeof student?.admission_no === "string" && student.admission_no.trim()
          ? student.admission_no.trim()
          : typeof student?.full_name === "string" && student.full_name.trim()
            ? student.full_name.trim()
            : typeof student?.first_name === "string"
              ? student.first_name.trim()
              : "";
      const studentName =
        typeof student?.full_name === "string" && student.full_name.trim()
          ? student.full_name.trim()
          : [student?.first_name, student?.last_name]
              .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
              .join(" ")
              .trim();

      const teacherQuery =
        typeof teacher?.employee_code === "string" && teacher.employee_code.trim()
          ? teacher.employee_code.trim()
          : typeof teacher?.full_name === "string" && teacher.full_name.trim()
            ? teacher.full_name.trim()
            : typeof teacher?.first_name === "string"
              ? teacher.first_name.trim()
              : "";
      const teacherName =
        typeof teacher?.full_name === "string" && teacher.full_name.trim()
          ? teacher.full_name.trim()
          : [teacher?.first_name, teacher?.last_name]
              .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
              .join(" ")
              .trim();

      if (!instituteQuery) {
        return null;
      }

      if (studentQuery && studentName) {
        return {
          instituteQuery,
          instituteName,
          peopleQuery: studentQuery,
          peopleView: "students",
          personName: studentName,
        };
      }

      if (teacherQuery && teacherName) {
        return {
          instituteQuery,
          instituteName,
          peopleQuery: teacherQuery,
          peopleView: "teachers",
          personName: teacherName,
        };
      }

      return null;
    });

    if (liveSearchSeed) {
      await page.goto(`/admin/search?q=${encodeURIComponent(liveSearchSeed.instituteQuery)}&source=live&group=section`);
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await expect(page.getByText(/^source: live$/i).first()).toBeVisible();
      await expect(
        page.locator(".sectionHeading strong").filter({ hasText: /^Institutes$/i }).first(),
      ).toBeVisible();
      await expect(page.locator('a[href^="/admin/institutes?institute="]').first()).toBeVisible();
      if (liveSearchSeed.instituteName) {
        await expect(page.getByText(new RegExp(liveSearchSeed.instituteName, "i")).first()).toBeVisible();
      }

      await page.goto(`/admin/search?q=${encodeURIComponent(liveSearchSeed.peopleQuery)}&source=live&group=section`);
      await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
      await expect(page.getByText(/^source: live$/i).first()).toBeVisible();
      await expect(
        page
          .locator(".sectionHeading strong")
          .filter({
            hasText: new RegExp(`^${liveSearchSeed.peopleView === "students" ? "Students" : "Teachers"}$`, "i"),
          })
          .first(),
      ).toBeVisible();
      await expect(
        page.locator(`a[href="/admin/people?view=${liveSearchSeed.peopleView}"]`).first(),
      ).toBeVisible();
      await expect(page.getByText(new RegExp(liveSearchSeed.personName, "i")).first()).toBeVisible();
    }

    await page.goto("/admin/search?q=playwright-definitely-no-match-zzzz");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();
    await expect(
      page.getByText(/no pages or live records matched this search/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/try shorter terms like/i).first()).toBeVisible();

    await page.getByRole("link", { name: /back to workspace/i }).click();
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();
  });
});
