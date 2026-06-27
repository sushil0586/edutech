import { test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAssessmentRegistryContracts,
  fetchAssessmentRegistry,
} from "../helpers/assessment-family";

test.describe("Teacher assessment family registry", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can read competitive, certification, and language assessment-family contracts", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");

    const registry = await fetchAssessmentRegistry(page);
    expectAssessmentRegistryContracts(registry);
  });
});
