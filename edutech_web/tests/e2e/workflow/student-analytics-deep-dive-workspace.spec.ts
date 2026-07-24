import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

test.describe("Student analytics deep dive workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate subject, topic, and question-type deep dive surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/analytics");
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);

    const directTopicLinks = page.locator('a[href^="/app/analytics/topics/"]');
    if ((await directTopicLinks.count()) === 0) {
      const sourceLink = page.locator('a[href^="/app/analytics/sources/"]').first();
      await expect(sourceLink).toBeVisible();
      await sourceLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/sources\/[^/?#]+(?:\?.*)?$/);
    }

    const topicLink = page.locator('a[href^="/app/analytics/topics/"]').first();
    await expect(topicLink).toBeVisible();
    await topicLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/topics\/[^/?#]+(?:\?.*)?$/);
    const topicLoadIssue = page.getByText(/topic analytics could not be loaded/i).first();
    if (await topicLoadIssue.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /back to analytics/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/difficulty mix/i).first()).toBeVisible();
    await expect(page.getByText(/question format mix/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();

    const subjectLink = page.getByRole("link", { name: /back to subject/i }).first();
    if (await subjectLink.isVisible().catch(() => false)) {
      await subjectLink.click();
      await expect(page).toHaveURL(/\/app\/analytics\/subjects\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByText(/subject deep dive/i).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
      await expect(page.getByText(/weak topic hotspots/i).first()).toBeVisible();
      await expect(page.getByText(/benchmark view/i).first()).toBeVisible();
      await expect(page.getByText(/difficulty ladder/i).first()).toBeVisible();
      await expect(page.getByText(/question-type risk/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();

      const questionTypeFromSubjectLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
      if (await questionTypeFromSubjectLink.isVisible().catch(() => false)) {
        await questionTypeFromSubjectLink.click();
      } else {
        await gotoWithRuntimeRecovery(page, "/app/analytics");
        const fallbackQuestionTypeLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
        await expect(fallbackQuestionTypeLink).toBeVisible();
        await fallbackQuestionTypeLink.click();
      }
    } else {
      const questionTypeFromTopicLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
      if (await questionTypeFromTopicLink.isVisible().catch(() => false)) {
        await questionTypeFromTopicLink.click();
      } else {
        await gotoWithRuntimeRecovery(page, "/app/analytics");
        const fallbackQuestionTypeLink = page.locator('a[href^="/app/analytics/question-types/"]').first();
        await expect(fallbackQuestionTypeLink).toBeVisible();
        await fallbackQuestionTypeLink.click();
      }
    }

    await expect(page).toHaveURL(/\/app\/analytics\/question-types\/[^/?#]+(?:\?.*)?$/);
    const typeLoadIssue = page.getByText(/question-type analytics could not be loaded/i).first();
    if (await typeLoadIssue.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /back to analytics/i }).first()).toBeVisible();
      return;
    }
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/format behavior/i).first()).toBeVisible();
    await expect(page.getByText(/benchmark view/i).first()).toBeVisible();
    await expect(page.getByText(/difficulty view/i).first()).toBeVisible();
    await expect(page.getByText(/topic hotspots/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();
  });
});
