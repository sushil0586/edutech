import { expect, Page } from "@playwright/test";

type RegistrationRole = "student" | "teacher";

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

export async function registerBaseRole(page: Page, role: RegistrationRole) {
  const identity = uniqueIdentity(role);

  await page.goto(`/signup?role=${role}`);
  await expect(page.getByRole("heading", { name: /quick registration/i })).toBeVisible();

  await page.getByLabel(/first name/i).fill(identity.firstName);
  await page.getByLabel(/last name/i).fill(identity.lastName);
  await page.getByLabel(/^email$/i).fill(identity.email);
  await page.getByPlaceholder("9876543210").fill(identity.phone);
  await page.getByLabel(/^password$/i).fill(identity.password);
  await page.getByLabel(/confirm password/i).fill(identity.password);

  await page.getByRole("button", { name: /create account/i }).click();
}
