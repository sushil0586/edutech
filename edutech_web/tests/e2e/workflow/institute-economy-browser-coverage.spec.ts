import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function focusLaneSelect(page: Page) {
  return page.getByLabel(/institute economy focus lane/i);
}

function overviewRowsSelect(page: Page) {
  return page.getByLabel(/institute economy rows to show/i);
}

function requestWorkspaceView(page: Page) {
  return page.getByLabel(/institute subscription workspace view/i);
}

function requestStatusFilter(page: Page) {
  return page.getByLabel(/request status filter/i);
}

function requestRows(page: Page) {
  return page.getByLabel(/request rows to show/i);
}

function economyWorkspaceView(page: Page) {
  return page.getByLabel(/institute economy workspace view/i);
}

function studentStatusFilter(page: Page) {
  return page.getByLabel(/student status filter/i);
}

function supportView(page: Page) {
  return page.getByLabel(/support view/i);
}

function historyRows(page: Page) {
  return page.getByLabel(/visible history rows/i);
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

test.describe("Institute economy browser functionality coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute economy lane controls hydrated", async ({
    page,
  }) => {
    await page.goto("/institute/economy");

    await expect(page.getByRole("heading", { name: /economy oversight/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /review one economy lane at a time/i })).toBeVisible();

    await expectSelectHasOptions(focusLaneSelect(page));
    await expectSelectHasOptions(overviewRowsSelect(page));
    await expectSelectHasOptions(requestWorkspaceView(page));
    await expectSelectHasOptions(requestStatusFilter(page));
    await expectSelectHasOptions(requestRows(page));
    await expectSelectHasOptions(economyWorkspaceView(page));
    await expectSelectHasOptions(studentStatusFilter(page));
    await expectSelectHasOptions(supportView(page));
    await expectSelectHasOptions(historyRows(page));

    await expect(focusLaneSelect(page)).toHaveValue("all");
    await expect(overviewRowsSelect(page)).toHaveValue("4");
    await expect(requestWorkspaceView(page)).toHaveValue("request");
    await expect(requestStatusFilter(page)).toHaveValue("all");
    await expect(requestRows(page)).toHaveValue("4");
    await expect(economyWorkspaceView(page)).toHaveValue("all");
    await expect(studentStatusFilter(page)).toHaveValue("active");
    await expect(supportView(page)).toHaveValue("wallet");
    await expect(historyRows(page)).toHaveValue("4");
  });

  test("@workflow browser coverage proves overview lane switching changes the visible economy lens", async ({
    page,
  }) => {
    await page.goto("/institute/economy");

    await focusLaneSelect(page).selectOption("licensing");
    await expect(
      page.getByRole("heading", { name: /what is active, blocked, and approaching renewal/i }),
    ).toBeVisible();
    await expect(page.getByText(/visible lanes/i).first()).toBeVisible();

    await focusLaneSelect(page).selectOption("plans");
    await expect(
      page.getByRole("heading", { name: /which subscription plans back which package lanes/i }),
    ).toBeVisible();

    await focusLaneSelect(page).selectOption("packages");
    await expect(page.getByText(/licensed question bank access/i).first()).toBeVisible();

    await overviewRowsSelect(page).selectOption("8");
    await expect(overviewRowsSelect(page)).toHaveValue("8");
  });

  test("@workflow browser coverage proves institute request workspace views stay truthful", async ({
    page,
  }) => {
    await page.goto("/institute/economy");

    await requestWorkspaceView(page).selectOption("plans");
    await expect(page.getByText(/what this plan unlocks/i).first()).toBeVisible();
    await expect(page.getByText(/commercial lanes:/i).first()).toBeVisible();

    await requestWorkspaceView(page).selectOption("request");
    await expect(page.getByLabel(/institute requestable plan cycle/i)).toBeVisible();
    await expect(page.getByLabel(/institute subscription request notes/i)).toBeVisible();

    await requestWorkspaceView(page).selectOption("history");
    await expect(page.getByText(/track what was submitted, what was approved/i).first()).toBeVisible();

    await requestStatusFilter(page).selectOption("pending");
    await expect(requestStatusFilter(page)).toHaveValue("pending");
    await requestRows(page).selectOption("8");
    await expect(requestRows(page)).toHaveValue("8");

    await requestWorkspaceView(page).selectOption("all");
    await expect(page.getByRole("heading", { name: /request question-bank subscription activation/i })).toBeVisible();
  });

  test("@workflow browser coverage proves institute support workspace views stay truthful", async ({
    page,
  }) => {
    await page.goto("/institute/economy");

    await economyWorkspaceView(page).selectOption("actions");
    await expect(page.getByText(/support control center/i).first()).toBeVisible();
    await expect(page.getByLabel(/^student$/i)).toBeVisible();
    await expect(page.getByLabel(/stars to grant/i)).toBeVisible();

    await economyWorkspaceView(page).selectOption("wallet");
    await expect(page.getByText(/live wallet state/i).first()).toBeVisible();

    await economyWorkspaceView(page).selectOption("activity");
    await supportView(page).selectOption("all");
    await expect(page.getByText(/reward timeline/i).first()).toBeVisible();
    await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();

    await economyWorkspaceView(page).selectOption("orders");
    await expect(page.getByText(/pending order requests for the selected student/i).first()).toBeVisible();

    await studentStatusFilter(page).selectOption("all");
    await expect(studentStatusFilter(page)).toHaveValue("all");
    await historyRows(page).selectOption("6");
    await expect(historyRows(page)).toHaveValue("6");

    await economyWorkspaceView(page).selectOption("all");
    await expect(page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i })).toBeVisible();
  });
});
