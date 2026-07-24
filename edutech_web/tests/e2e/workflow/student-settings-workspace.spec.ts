import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function followLinkTarget(page: Page, locator: Locator, expectedUrl: RegExp) {
  await expect(locator).toBeVisible();
  const href = await locator.getAttribute("href");
  expect(href).toBeTruthy();
  await gotoWithRuntimeRecovery(page, href!);
  await expect(page).toHaveURL(expectedUrl);
}

test.describe("Student settings workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate account state support guidance quick access and session controls", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await expect(page).toHaveURL(/\/app\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
    await expect(page.getByText(/account controls/i).first()).toBeVisible();
    await expect(page.getByText(/active student session|inactive student session/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open profile/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();

    await expect(page.getByText(/account status/i).first()).toBeVisible();
    await expect(page.getByText(/student access/i).first()).toBeVisible();
    await expect(page.getByText(/academic context/i).first()).toBeVisible();
    await expect(page.getByText(/program/i).first()).toBeVisible();
    await expect(page.getByText(/profile completion/i).first()).toBeVisible();

    await expect(page.getByText(/account overview/i).first()).toBeVisible();
    await expect(page.getByText(/workspace guidance/i).first()).toBeVisible();
    await expect(page.getByText(/what this page covers/i).first()).toBeVisible();
    await expect(page.getByText(/session and access/i).first()).toBeVisible();
    await expect(page.getByText(/support handoff/i).first()).toBeVisible();
    await expect(page.getByText(/quick access/i).first()).toBeVisible();
    await expect(page.getByText(/session controls/i).first()).toBeVisible();
    await expect(page.getByText(/notifications and help/i).first()).toBeVisible();

    await expect(
      page.getByText(/password resets, institute corrections, and identity changes still happen outside this learner shell/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/your access depends on the current browser session/i).first()).toBeVisible();
    await expect(page.getByText(/log out when you finish on a shared or public device/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /logout from this device/i }).first()).toBeVisible();

    await followLinkTarget(
      page,
      page.getByRole("link", { name: /verify profile context/i }).first(),
      /\/app\/profile(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /check notifications/i }).first(),
      /\/app\/notifications(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^dashboard$/i }).first(),
      /\/app\/dashboard(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^profile$/i }).first(),
      /\/app\/profile(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^notifications$/i }).first(),
      /\/app\/notifications(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^results$/i }).first(),
      /\/app\/results(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^analytics$/i }).first(),
      /\/app\/analytics(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^wallet$/i }).first(),
      /\/app\/wallet(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /open notifications/i }).first(),
      /\/app\/notifications(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/settings");
    await followLinkTarget(
      page,
      page.getByRole("link", { name: /^back to dashboard$/i }).last(),
      /\/app\/dashboard(?:\?.*)?$/,
    );
  });
});
