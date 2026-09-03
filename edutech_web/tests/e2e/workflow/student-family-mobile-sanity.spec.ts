import { expect, test } from "@playwright/test";
import { expectStudentWorkspace } from "../helpers/navigation";
import {
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const neetStudentCredentials = {
  username: "demo-neet-student",
  password: "Demo@12345",
};

const jeeStudentCredentials = {
  username: "demo-jee-student",
  password: "Demo@12345",
};

const families = [
    {
      label: "NEET",
    credentials: neetStudentCredentials,
      examCode: "DMO-NEET-FULL-01",
      expectedSections: ["Physics Section", "Chemistry Section", "Biology Section"],
      expectedTags: [/competitive/i, /180 minutes/i],
  },
  {
    label: "JEE",
    credentials: jeeStudentCredentials,
    examCode: "DMO-JEE-FULL-01",
    expectedSections: ["Physics Objective", "Chemistry Objective", "Mathematics Objective"],
    expectedTags: [/competitive/i, /180 minutes/i, /hybrid/i],
  },
] as const;

test.describe("Student family mobile sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  for (const family of families) {
    test(`@workflow ${family.label} seeded exam detail stays reachable on a mobile-sized viewport`, async ({
      page,
    }) => {
      await loginStudentFamilyAccountOrSkip(page, family.credentials, family.label);
      await expectStudentWorkspace(page);

      const exam = await resolveStudentFamilyExamOrSkip(page, {
        familyLabel: `${family.label} mobile exam detail`,
        examCode: family.examCode,
      });
      if (!exam) {
        return;
      }

      await page.goto("/app/exams");
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();
      await expect(page.getByText(exam.title).first()).toBeVisible();
      await expect(page.getByText(exam.subject_summary.display_label).first()).toBeVisible();

      await page.goto(`/app/exams/${exam.id}`);
      await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: new RegExp(exam.title, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/primary action/i).first()).toBeVisible();
      await expect(page.getByText(/section overview/i).first()).toBeVisible();
      await expect(page.getByText(exam.subject_summary.display_label).first()).toBeVisible();

      for (const expectedTag of family.expectedTags) {
        await expect(page.getByText(expectedTag).first()).toBeVisible();
      }

      for (const sectionName of family.expectedSections) {
        await expect(page.getByText(sectionName).first()).toBeVisible();
      }

      await expect(page.getByRole("link", { name: /back to exams/i }).first()).toBeVisible();
    });
  }
});
