import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { completeStudentProfile, registerBaseRole } from "../helpers/registration";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableStudentReferralOnboardingEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING",
);

test.describe("Student referral onboarding mutable flow", () => {
  test.skip(
    testRequiresRole("student"),
    "Student Playwright credentials are not configured.",
  );

  test.skip(
    !mutableStudentReferralOnboardingEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING",
      "student referral onboarding coverage",
    ),
  );

  test("@workflow @mutable student referral signup completes onboarding and shows referral context in profile and wallet", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "student");
    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();

    const referralCodeCard = page.locator(".detailCard").filter({
      has: page.getByText(/^referral code$/i),
    }).first();
    await expect(referralCodeCard).toBeVisible();
    const referralCode = (await referralCodeCard.locator("strong").textContent())?.trim() ?? "";
    const instituteCard = page.locator(".detailCard").filter({
      has: page.getByText(/^institute$/i),
    }).first();
    await expect(instituteCard).toBeVisible();
    const instituteName = (await instituteCard.locator("strong").textContent())?.trim() ?? "";

    if (!referralCode || /^not available$/i.test(referralCode)) {
      test.skip(true, "Configured student account does not currently expose a referral code.");
    }
    if (!instituteName || /^institute not assigned$/i.test(instituteName)) {
      test.skip(true, "Configured student account does not currently expose an institute.");
    }

    await page.context().clearCookies();

    const identity = await registerBaseRole(page, "student", {
      referralCode,
      schoolName: instituteName,
    });

    await expect(page).toHaveURL(/\/complete-profile/);
    await completeStudentProfile(page);

    await expect
      .poll(() => /\/app(\/|$)/.test(new URL(page.url()).pathname), { timeout: 30000 })
      .toBe(true);

    await page.goto("/app/profile");
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(
      page.locator(".detailCard").filter({
        has: page.getByText(/^referral input$/i),
      }).first().getByText(referralCode, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".detailCard").filter({
        has: page.getByText(/^referral channel$/i),
      }).first().getByText(/^code$/i),
    ).toBeVisible();
    await expect(
      page.getByText(/the resulting reward credit, if any, is best verified from wallet after onboarding is complete/i).first(),
    ).toBeVisible();

    await page.goto("/app/wallet");
    await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/rewards and referral/i).first()).toBeVisible();

    const latestReferralCard = page.locator(".contentCard").filter({
      has: page.getByText(/rewards and referral/i),
    }).first();
    await expect(latestReferralCard.getByText(/latest referral reward/i).first()).toBeVisible();
    await expect(page.getByText(/^150$/).first()).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Referral reward for joining with code ${referralCode}`, "i")).first(),
    ).toBeVisible();
    await expect(page.getByText(/referral reward\s+.+\+50/i).first()).toBeVisible();

    await expect(page.getByText(identity.email).first()).toBeVisible();
  });
});
