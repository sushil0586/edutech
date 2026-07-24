import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectOneOfVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveExamDetailHref(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/exams");
  await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

  const emptyState = page.getByText(/your mock-test workspace is empty right now/i);
  if (!(await emptyState.isVisible().catch(() => false))) {
    const detailLink = await expectOneOfVisible([
      page.getByRole("link", { name: /view details/i }).first(),
      page.getByRole("link", { name: /view full detail/i }).first(),
      page.getByRole("link", { name: /^detail$/i }).first(),
    ]);
    return await detailLink.getAttribute("href");
  }

  await gotoWithRuntimeRecovery(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/next best step|recommended for you/i).first()).toBeVisible();

  const dashboardLink = page.getByRole("link", { name: /view details/i }).first();
  await expect(dashboardLink).toBeVisible();
  return await dashboardLink.getAttribute("href");
}

async function resolveAttemptRuntimeHref(page: Page) {
  await gotoWithRuntimeRecovery(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const resumeFromAttempts = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromAttempts.isVisible().catch(() => false)) {
    return await resumeFromAttempts.getAttribute("href");
  }

  await gotoWithRuntimeRecovery(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/study queue|action queue/i).first()).toBeVisible();

  const resumeFromDashboard = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromDashboard.isVisible().catch(() => false)) {
    return await resumeFromDashboard.getAttribute("href");
  }

  return null;
}

async function resolveRuntimeState(page: Page) {
  const activeVisible = await expectOneOfVisible([
    page.getByRole("button", { name: /^save answer$/i }).first(),
    page.getByRole("button", { name: /^save & next$/i }).first(),
    page.getByRole("button", { name: /^submit test$/i }).first(),
    page.getByText(/test in progress|attempt progress|question palette/i).first(),
  ])
    .then(() => true)
    .catch(() => false);

  const lockedVisible = await expectOneOfVisible([
    page.getByRole("link", {
      name: /refresh attempt state|refresh mock state|view attempt summary|view mock summary/i,
    }).first(),
    page.getByText(/this test is no longer editable|this attempt has expired/i).first(),
  ])
    .then(() => true)
    .catch(() => false);

  return {
    activeVisible,
    lockedVisible,
  };
}

test.describe("Student cross-browser exam detail and runtime sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can open exam detail and conditional runtime routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const detailHref = await resolveExamDetailHref(page);
    expect(detailHref).toMatch(/^\/app\/exams\/[^/]+$/);

    await gotoWithRuntimeRecovery(page, detailHref!);
    await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
    await expect(page.getByText(/availability and runtime/i).first()).toBeVisible();
    await expect(page.getByText(/primary action/i).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/question blueprint/i).first()).toBeVisible();

    const backToExams = page.getByRole("link", { name: /back to exams/i }).first();
    await expect(backToExams).toBeVisible();
    await backToExams.click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);

    const attemptHref = await resolveAttemptRuntimeHref(page);
    if (!attemptHref) {
      await gotoWithRuntimeRecovery(page, "/app/attempts");
      await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
      await expect(
        page.getByText(/attempt history|attempts loaded|evaluation pending|your attempt history is empty/i).first(),
      ).toBeVisible();
      return;
    }

    expect(attemptHref).toMatch(/^\/app\/attempts\/[^/]+$/);
    await gotoWithRuntimeRecovery(page, attemptHref);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);

    await expect
      .poll(
        async () => {
          const runtimeState = await resolveRuntimeState(page);
          return runtimeState.activeVisible || runtimeState.lockedVisible;
        },
        {
          timeout: 10000,
        },
      )
      .toBe(true);

    const { activeVisible, lockedVisible } = await resolveRuntimeState(page);

    expect(activeVisible || lockedVisible).toBe(true);

    if (activeVisible) {
      await expect(page.getByText(/progress/i).first()).toBeVisible();
      await expect(
        page.getByText(/last confirmed backend response|last saved answer/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/question palette|questions/i).first()).toBeVisible();
    }

    if (lockedVisible) {
      await expect(
        page.getByText(/this test is no longer editable|this attempt has expired/i).first(),
      ).toBeVisible();
    }
  });
});
