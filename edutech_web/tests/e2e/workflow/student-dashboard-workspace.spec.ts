import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
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

test.describe("Student dashboard workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate dashboard context controls and action handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/recommended for you/i).first()).toBeVisible();
    await expect(page.getByText(/action queue/i).first()).toBeVisible();
    await expect(page.getByText(/treat this as your strongest immediate action/i).first()).toBeVisible();
    await expect(page.getByText(/do this now:/i).first()).toBeVisible();
    await expect(page.getByText(/then next:/i).first()).toBeVisible();
    await expect(page.getByText(/premium and locked items stay separate below/i).first()).toBeVisible();
    await expect(page.getByText(/available for you/i).first()).toBeVisible();
    await expect(page.getByText(/locked content and premium access/i).first()).toBeVisible();
    await expect(page.getByText(/later or optional/i).first()).toBeVisible();

    const sourceSelect = page.getByLabel("Dashboard source context");
    await expect(sourceSelect).toBeVisible();
    const sourceOptions = await sourceSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: option.textContent?.trim() ?? "",
      })),
    );
    expect(sourceOptions.length).toBeGreaterThan(0);

    const teacherSource = sourceOptions.find((option) => option.value === "teacher") ?? null;
    const platformSource = sourceOptions.find((option) => option.value === "platform") ?? null;
    const nonDefaultSource = teacherSource ?? platformSource;

    if (nonDefaultSource) {
      await sourceSelect.selectOption(nonDefaultSource.value);
      await expect(sourceSelect).toHaveValue(nonDefaultSource.value);

      if (nonDefaultSource.value === "teacher") {
        const teacherSelect = page.getByLabel("Teacher source context");
        await expect(teacherSelect).toBeVisible();
        const teacherOptions = await teacherSelect.locator("option").evaluateAll((options) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        if (teacherOptions.length > 0) {
          await teacherSelect.selectOption(teacherOptions[0]!.value);
          await expect(teacherSelect).toHaveValue(teacherOptions[0]!.value);
        }
      }

      await expect(page.locator(".studentDashboardWelcomeCopy small").first()).toContainText(
        /filter is active/i,
      );

      await sourceSelect.selectOption("all");
      await expect(sourceSelect).toHaveValue("all");
    }

    const subjectSelect = page.getByLabel("Dashboard subject context");
    await expect(subjectSelect).toBeVisible();
    const subjectOptions = await subjectSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: option.textContent?.trim() ?? "",
        }))
        .filter((option) => option.value.trim().length > 0),
    );
    expect(subjectOptions.length).toBeGreaterThan(0);

    const focusedSubject =
      subjectOptions.find(
        (option) => option.value !== "all" && option.value !== "overall",
      ) ?? null;

    if (focusedSubject) {
      await subjectSelect.selectOption(focusedSubject.value);
      await expect(subjectSelect).toHaveValue(focusedSubject.value);
      await subjectSelect.selectOption("overall");
      await expect(subjectSelect).toHaveValue("overall");
    }

    const attemptTimelineLink = page.getByRole("link", { name: /open attempt timeline/i }).first();
    await expect(attemptTimelineLink).toBeVisible();
    await attemptTimelineLink.click();
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/action queue/i).first()).toBeVisible();

    const walletLink = page.getByRole("link", { name: /open wallet/i }).first();
    await expect(walletLink).toBeVisible();
    await walletLink.click();
    await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/recommended for you/i).first()).toBeVisible();

    const primaryRecommendationAction = page
      .locator(".studentDashboardRecommendation")
      .getByRole("link")
      .first();
    await expect(primaryRecommendationAction).toBeVisible();
    await primaryRecommendationAction.click();
    await expect(page).toHaveURL(
      /\/app\/(attempts\/[^/?#]+(?:\/summary)?|results|exams\/[^/?#]+)(?:\?.*)?$/,
    );

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/available for you/i).first()).toBeVisible();
    await page.getByRole("link", { name: /view all/i }).first().click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/your progress/i).first()).toBeVisible();
    await page.getByRole("link", { name: /view detailed report/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByText(/latest activity/i).first()).toBeVisible();
    await page.getByRole("link", { name: /^view all$/i }).last().click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
  });
});
