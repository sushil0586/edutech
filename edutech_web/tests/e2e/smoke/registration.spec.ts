import { test, expect } from "@playwright/test";
import { registerBaseRole } from "../helpers/registration";

test.describe("Registration smoke journeys", () => {
  test("@smoke student registration can reach profile completion flow", async ({ page }) => {
    await registerBaseRole(page, "student");

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/complete profile|class level|exam interest/i).first()).toBeVisible();
  });

  test("@smoke teacher registration can reach profile completion flow", async ({ page }) => {
    await registerBaseRole(page, "teacher");

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/complete profile|teaching focus|teaching scope/i).first()).toBeVisible();
  });
});
