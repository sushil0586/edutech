import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { completeStudentProfile, registerBaseRole } from "../helpers/registration";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";

const mutableStudentReferralOnboardingEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_REFERRAL_ONBOARDING",
);

type AdminReferralProgram = {
  id: string;
  institute: string;
  institute_name: string;
  name: string;
  referrer_stars: number;
  referee_stars: number;
  reward_side: string;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

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

  test("@workflow @mutable invalid referral code blocks student profile completion without partial onboarding", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const identity = await registerBaseRole(page, "student", {
      referralCode: "NOT-A-REAL-CODE",
    });

    await expect(page).toHaveURL(/\/complete-profile/);
    await completeStudentProfile(page);

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/referral code/i).first()).toBeVisible();
    await expect(page.getByText(/not valid/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /complete profile/i })).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
  });

  test("@workflow @mutable cross-institute referral code is rejected during student onboarding", async ({
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
    const currentInstituteName = (await instituteCard.locator("strong").textContent())?.trim() ?? "";

    if (!referralCode || /^not available$/i.test(referralCode)) {
      test.skip(true, "Configured student account does not currently expose a referral code.");
    }

    await page.context().clearCookies();
    await page.goto("/signup?role=student");
    await expect(page.getByRole("heading", { name: /quick registration/i })).toBeVisible();

    const schoolSelect = page.getByLabel(/school\s*\/\s*institute/i);
    const schoolOptions = await schoolSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );
    const alternateSchool =
      schoolOptions.find(
        (option) =>
          option.label.trim() &&
          option.label.trim() !== currentInstituteName.trim() &&
          !/select/i.test(option.label),
      ) ?? null;

    if (!alternateSchool) {
      test.skip(true, "No alternate public registration institute is currently available for cross-institute referral coverage.");
    }

    const identity = await registerBaseRole(page, "student", {
      referralCode,
      schoolName: alternateSchool.label,
    });

    await expect(page).toHaveURL(/\/complete-profile/);
    await completeStudentProfile(page);

    await expect(page).toHaveURL(/\/complete-profile/);
    await expect(page.getByText(/referral code/i).first()).toBeVisible();
    await expect(page.getByText(/does not belong to the selected institute/i).first()).toBeVisible();
    await expect(page.getByText(identity.email).first()).toBeVisible();
  });

  test("@workflow @mutable paused referral program blocks onboarding even with a valid referral code", async ({
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

    await loginAsRole(page, "admin");
    const programsResponse = await page.request.get("/api/admin/economy/referral-programs");
    expect(programsResponse.ok()).toBe(true);
    const programs = (await programsResponse.json()) as AdminReferralProgram[];
    const targetProgram =
      programs.find((program) => program.institute_name === instituteName && program.is_active) ?? null;

    if (!targetProgram) {
      test.skip(true, "No active referral program is currently available for the student's institute.");
    }

    try {
      const pauseResponse = await page.request.patch(`/api/admin/economy/referral-programs/${targetProgram.id}`, {
        data: {
          institute: targetProgram.institute,
          name: targetProgram.name,
          referrer_stars: targetProgram.referrer_stars,
          referee_stars: targetProgram.referee_stars,
          reward_side: targetProgram.reward_side,
          valid_from: targetProgram.valid_from,
          valid_until: targetProgram.valid_until,
          metadata: {},
          is_active: false,
        },
      });
      expect(pauseResponse.ok()).toBe(true);

      await page.context().clearCookies();
      const identity = await registerBaseRole(page, "student", {
        referralCode,
        schoolName: instituteName,
      });

      await expect(page).toHaveURL(/\/complete-profile/);
      await completeStudentProfile(page);

      await expect(page).toHaveURL(/\/complete-profile/);
      await expect(page.getByText(/referral program is not active/i).first()).toBeVisible();
      await expect(page.getByText(identity.email).first()).toBeVisible();
    } finally {
      await loginAsRole(page, "admin");
      await page.request.patch(`/api/admin/economy/referral-programs/${targetProgram.id}`, {
        data: {
          institute: targetProgram.institute,
          name: targetProgram.name,
          referrer_stars: targetProgram.referrer_stars,
          referee_stars: targetProgram.referee_stars,
          reward_side: targetProgram.reward_side,
          valid_from: targetProgram.valid_from,
          valid_until: targetProgram.valid_until,
          metadata: {},
          is_active: targetProgram.is_active,
        },
      });
    }
  });
});
