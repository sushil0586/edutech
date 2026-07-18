import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function selectFirstNonEmptyOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      disabled: (node as HTMLOptionElement).disabled,
    })),
  );
  const option = options.find((entry) => entry.value.trim().length > 0 && !entry.disabled) ?? null;
  expect(option).not.toBeNull();
  await locator.selectOption(option!.value);
  return option!.value;
}

test.describe("Institute teacher-assignment create rejection", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute keeps teacher-assignment create rejection visible and retryable", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/teacher-assignments");
    await expect(page.getByRole("heading", { name: /teacher assignments/i }).first()).toBeVisible();

    const initialRowCount = await page.locator("table tbody tr").count();

    await page.route("**/api/admin/teacher-assignments", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "This teacher already owns the selected subject in the same academic scope.",
          teacher: ["Choose a different teacher or archive the existing assignment first."],
          subject: ["That subject is already assigned in this scope."],
        }),
      });
    });

    await page.getByRole("button", { name: /^add$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /add teacher assignment/i })).toBeVisible();

    await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^teacher$/i }));
    await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^academic year$/i }));
    await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^program$/i }));
    await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^subject$/i }));
    await dialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();

    await dialog.getByRole("button", { name: /create assignment/i }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/this teacher already owns the selected subject in the same academic scope\./i)).toBeVisible();
    await expect(dialog.getByText(/choose a different teacher or archive the existing assignment first\./i)).toBeVisible();
    await expect(dialog.getByText(/that subject is already assigned in this scope\./i)).toBeVisible();
    await expect(dialog.locator(".setupFieldInvalid")).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: /create assignment/i })).toBeEnabled();
    await expect(page.locator("table tbody tr")).toHaveCount(initialRowCount);
    await expect(page.getByText(/assignment created successfully/i)).toHaveCount(0);
  });
});
