import { expect, Page } from "@playwright/test";

type RegistrationRole = "student" | "teacher";
type RegistrationOptions = {
  referralCode?: string;
  schoolName?: string;
};

function uniqueIdentity(role: RegistrationRole) {
  const token = `${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const compact = token.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const phoneSeed = String(Date.now()).slice(-8);

  return {
    firstName: role === "teacher" ? "PlaywrightTeacher" : "PlaywrightStudent",
    lastName: "Smoke",
    email: `${compact}@example.com`,
    phone: `98${phoneSeed}`,
    password: "Demo@12345",
  };
}

export async function registerBaseRole(page: Page, role: RegistrationRole, options?: RegistrationOptions) {
  const identity = uniqueIdentity(role);

  await page.goto(`/signup?role=${role}`);
  await expect(page.getByRole("heading", { name: /quick registration/i })).toBeVisible();

  if (options?.schoolName) {
    await page.getByLabel(/school\s*\/\s*institute/i).selectOption({ label: options.schoolName });
  }

  await page.getByLabel(/first name/i).fill(identity.firstName);
  await page.getByLabel(/last name/i).fill(identity.lastName);
  await page.getByLabel(/^email$/i).fill(identity.email);
  await page.getByPlaceholder("9876543210").fill(identity.phone);
  await page.getByLabel(/^password$/i).fill(identity.password);
  await page.getByLabel(/confirm password/i).fill(identity.password);
  if (options?.referralCode) {
    await page.getByLabel(/referral code/i).fill(options.referralCode);
  }

  await page.getByRole("button", { name: /create account/i }).click();
  return identity;
}

export async function completeStudentProfile(page: Page) {
  await expect(page).toHaveURL(/\/complete-profile/);
  await expect(page.getByRole("button", { name: /complete profile/i })).toBeVisible();

  const classField = page.locator('select[name="class_level"]');
  await classField.scrollIntoViewIfNeeded();
  await expect(classField).toBeVisible();
  await classField.selectOption("7");

  const boardField = page.locator('select[name="board"]');
  await boardField.selectOption({ label: "CBSE" });

  const examFocus = page.locator('select[name="exam_interest"]');
  if (await examFocus.isVisible().catch(() => false)) {
    const options = await examFocus.locator("option").allTextContents();
    const olympiadOption = options.find((option) => /olympiad/i.test(option));
    if (olympiadOption) {
      await examFocus.selectOption({ label: olympiadOption });
    }
  }

  const country = page.locator('select[name="country"]');
  await country.selectOption({ label: "India" });
  const state = page.locator('select[name="state"]');
  await expect(state).toBeEnabled();
  await state.selectOption({ label: "Delhi" });

  const city = page.locator('select[name="city"]');
  await expect(city).toBeEnabled();
  const cityOptions = await city.locator("option").allTextContents();
  const preferredCity = cityOptions.find((option) => option.trim() === "Delhi") ?? cityOptions.find(Boolean);
  if (preferredCity) {
    await city.selectOption({ label: preferredCity });
  }

  const pincode = page.locator('select[name="pincode"]');
  await expect(pincode).toBeEnabled();
  const pincodeOptions = await pincode.locator("option").allTextContents();
  const preferredPincode =
    pincodeOptions.find((option) => option.trim() === "110001") ?? pincodeOptions.find(Boolean);
  if (preferredPincode) {
    await pincode.selectOption({ label: preferredPincode });
  }

  const timezone = page.locator('input[name="timezone"]');
  await timezone.fill("Asia/Kolkata");

  await page.getByRole("button", { name: /complete profile/i }).click();
}
