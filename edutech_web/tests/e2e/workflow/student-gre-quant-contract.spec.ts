import { expect, test, type Page } from "@playwright/test";
import {
  fetchStudentExamDetailCatalog,
  loginStudentFamilyAccountOrSkip,
  resolveStudentFamilyExamOrSkip,
} from "../helpers/student-family";

const greStudentCredentials = {
  username: "demo-gre-student",
  password: "Demo@12345",
};

const greExamCode = "DMO-GRE-QUANT-01";
const expectedSectionNames = ["Quant Section 1", "Quant Section 2"];

test.describe("Student GRE quant contract", () => {
  test("@workflow gre student sees the seeded GRE quant drill as a formal sectional competitive exam", async ({
    page,
  }) => {
    await loginStudentFamilyAccountOrSkip(page, greStudentCredentials, "gre");

    const greExam = await resolveStudentFamilyExamOrSkip(page, {
      familyLabel: "GRE quant",
      examCode: greExamCode,
    });
    if (!greExam) {
      return;
    }
    expect(greExam!.is_multi_subject).toBe(false);
    expect(greExam!.subject_summary.subject_count).toBe(1);

    const detail = await fetchStudentExamDetailCatalog(page, greExam!.id);
    expect(detail.code).toBe(greExamCode);
    expect(detail.is_multi_subject).toBe(false);
    expect(detail.subject_summary.subject_count).toBe(1);
    expect(detail.sections.map((section) => section.name)).toEqual(expectedSectionNames);
    expect(detail.experience_profile.assessment_family).toBe("competitive");
    expect(detail.experience_profile.actual_timer_mode).toBe("section");
    expect(detail.experience_profile.actual_navigation_mode).toBe("sequential");
    await page.goto("/app/exams");
    await expect(page.getByText(greExam!.title).first()).toBeVisible();

    await page.goto(`/app/exams/${greExam!.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(greExam!.title, "i") }).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/70 minutes/i).first()).toBeVisible();
    await expect(page.getByText(/competitive/i).first()).toBeVisible();
    for (const sectionName of expectedSectionNames) {
      await expect(page.getByText(sectionName).first()).toBeVisible();
    }
  });
});
