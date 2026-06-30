import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveAttemptEntry(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const resumeFromAttempts = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromAttempts.isVisible().catch(() => false)) {
    return {
      origin: "attempts" as const,
      entry: resumeFromAttempts,
      href: await resumeFromAttempts.getAttribute("href"),
    };
  }

  await gotoWithRetry(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/action queue/i).first()).toBeVisible();

  const resumeFromDashboard = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromDashboard.isVisible().catch(() => false)) {
    return {
      origin: "dashboard" as const,
      entry: resumeFromDashboard,
      href: await resumeFromDashboard.getAttribute("href"),
    };
  }

  return null;
}

test.describe("Student attempt runtime workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate active or locked attempt runtime surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const attemptSource = await resolveAttemptEntry(page);
    if (!attemptSource) {
      test.skip(true, "Student seeded account does not currently expose an active attempt runtime route.");
      return;
    }
    const attemptHref = attemptSource.href;
    expect(attemptHref).toMatch(/^\/app\/attempts\/[^/]+$/);

    await attemptSource.entry.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);

    const activeVisible = await page
      .getByRole("button", { name: /^save answer$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const lockedVisible = await page
      .getByRole("link", { name: /refresh attempt state|refresh mock state|view attempt summary|view mock summary/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(activeVisible || lockedVisible).toBe(true);

    if (activeVisible) {
      const saveConfidenceCard = page
        .locator(".examStateSummary")
        .filter({
          has: page.getByText(/save confidence|checkpoint confidence/i),
        })
        .first();
      await expect(page.getByText(/attempt progress/i).first()).toBeVisible();
      await expect(page.getByText(/section progress/i).first()).toBeVisible();
      await expect(saveConfidenceCard).toBeVisible();
      await expect(page.getByText(/overall progress/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed save/i).first()).toBeVisible();
      await expect(page.getByText(/summary opens after submit|summary opens after final submit/i).first()).toBeVisible();
      await expect(page.getByText(/test summary/i).first()).toBeVisible();
      await expect(page.getByText(/question palette/i).first()).toBeVisible();
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /^save answer$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^submit test$/i })).toBeVisible();

      const activeQuestionCard = page.locator(".attemptQuestionCard").first();
      await expect(activeQuestionCard).toBeVisible();
      await expect(
        activeQuestionCard.getByText(/save this answer before moving on/i).first(),
      ).toBeVisible();
      await expect(
        activeQuestionCard.getByText(/submit routes to the attempt summary first/i).first(),
      ).toBeVisible();
      await expect(
        activeQuestionCard.getByText(/palette jumps and section switches do not auto-save edits/i).first(),
      ).toBeVisible();

      const sectionAccessHeading = page.getByText(/section access/i).first();
      if (await sectionAccessHeading.isVisible().catch(() => false)) {
        await expect(sectionAccessHeading).toBeVisible();
        await expect(
          page.getByText(/section switching is navigation, not save/i).first(),
        ).toBeVisible();
      }
    }

    if (lockedVisible) {
      await expect(
        page.getByText(/this test is no longer editable|this attempt has expired/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/saved/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /refresh attempt state|refresh mock state/i }).first()).toBeVisible();

      const summaryLink = page.getByRole("link", { name: /view attempt summary|view mock summary/i }).first();
      if (await summaryLink.isVisible().catch(() => false)) {
        await summaryLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
        return;
      }

      await page.getByRole("link", { name: /back to tests|back to mock tests/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      return;
    }

    const backToTests = await firstVisible([
      page.getByRole("link", { name: /back to tests|back to mock tests/i }).first(),
      page.locator('a[href="/app/exams"]').first(),
    ]);
    await backToTests.click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  });
});
