import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { expectStudentWorkspace } from "../helpers/navigation";

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveAttemptEntry(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/attempts");
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

  await gotoWithRuntimeRecovery(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/study queue|action queue/i).first()).toBeVisible();

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

test.describe("Student mobile attempt runtime", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student mobile viewport keeps the active or locked attempt runtime truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const attemptSource = await resolveAttemptEntry(page);
    if (!attemptSource) {
      await gotoWithRuntimeRecovery(page, "/app/attempts");
      await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
      await expect(
        await firstVisible([
          page.getByText(/attempt history|attempts loaded|evaluation pending|your attempt history is empty/i).first(),
          page.getByRole("link", { name: /open summary/i }).first(),
        ]),
      ).toBeVisible();
      await gotoWithRuntimeRecovery(page, "/app/dashboard");
      await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
      await expect(page.getByText(/study queue|action queue|recommended for you/i).first()).toBeVisible();
      return;
    }

    const attemptHref = attemptSource.href;
    expect(attemptHref).toMatch(/^\/app\/attempts\/[^/]+$/);

    await attemptSource.entry.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);

    await expect
      .poll(
        async () => {
          const activeVisible = await page
            .getByRole("button", { name: /^save answer$/i })
            .first()
            .isVisible()
            .catch(() => false);
          const lockedVisible = await page
            .getByRole("link", {
              name: /refresh attempt state|refresh mock state|view attempt summary|view mock summary/i,
            })
            .first()
            .isVisible()
            .catch(() => false);
          return activeVisible || lockedVisible;
        },
        {
          timeout: 10000,
        },
      )
      .toBe(true);

    const activeVisible = await page
      .getByRole("button", { name: /^save answer$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const lockedVisible = await page
      .getByRole("link", {
        name: /refresh attempt state|refresh mock state|view attempt summary|view mock summary/i,
      })
      .first()
      .isVisible()
      .catch(() => false);

    expect(activeVisible || lockedVisible).toBe(true);

    if (activeVisible) {
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /^save answer$/i })).toBeVisible();
      await expect(
        await firstVisible([
          page.getByRole("button", { name: /^submit test$/i }).first(),
          page.getByRole("button", { name: /^end test$/i }).first(),
        ]),
      ).toBeVisible();
      await expect(page.getByText(/question palette|questions/i).first()).toBeVisible();
      await expect(page.getByText(/test summary/i).first()).toBeVisible();
      await expect(page.getByText(/responses saved/i).first()).toBeVisible();
      await expect(page.getByText(/in this section/i).first()).toBeVisible();

      const activeQuestionCard = page.locator(".attemptQuestionCard").first();
      await expect(activeQuestionCard).toBeVisible();
      await expect(
        await firstVisible([
          activeQuestionCard.getByText(/save this answer before moving on/i).first(),
          page.getByText(/responses saved|saved/i).first(),
        ]),
      ).toBeVisible();
      await expect(
        await firstVisible([
          activeQuestionCard.getByText(/submit routes to the attempt summary first/i).first(),
          page.getByText(/review before submit|summary opens after submit/i).first(),
        ]),
      ).toBeVisible();

      const sectionAccessHeading = page.getByText(/section access/i).first();
      if (await sectionAccessHeading.isVisible().catch(() => false)) {
        await expect(sectionAccessHeading).toBeVisible();
        await expect(page.getByText(/section switching is navigation, not save/i).first()).toBeVisible();
      }
    }

    if (lockedVisible) {
      await expect(page.getByText(/this test is no longer editable|this attempt has expired/i).first()).toBeVisible();
      await expect(page.getByText(/saved/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /refresh attempt state|refresh mock state/i }).first()).toBeVisible();

      const summaryLink = page
        .getByRole("link", { name: /view attempt summary|view mock summary/i })
        .first();
      if (await summaryLink.isVisible().catch(() => false)) {
        await summaryLink.click();
        await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
        return;
      }

      const backToTests = await firstVisible([
        page.getByRole("link", { name: /back to tests|back to mock tests/i }).first(),
        page.locator('a[href="/app/exams"]').first(),
      ]);
      await backToTests.click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    }

    const backToTests = await firstVisible([
      page.getByRole("link", { name: /back to tests|back to mock tests/i }).first(),
      page.locator('a[href="/app/exams"]').first(),
    ]);
    await backToTests.click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  });
});
