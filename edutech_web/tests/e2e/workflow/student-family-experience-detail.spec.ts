import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import {
  fetchStudentAvailableExamsForFamily,
  fetchStudentExamDetailForFamily,
} from "../helpers/student-family";
import { expectStudentWorkspace } from "../helpers/navigation";

function titleCaseState(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

test.describe("Student family experience detail", () => {
  const scenarios = [
    {
      family: "competitive",
      username: process.env.PLAYWRIGHT_COMPETITIVE_STUDENT_USERNAME ?? "demo-competitive-student",
      password: process.env.PLAYWRIGHT_COMPETITIVE_STUDENT_PASSWORD ?? "Demo@12345",
    },
    {
      family: "certification",
      username: process.env.PLAYWRIGHT_CERTIFICATION_STUDENT_USERNAME ?? "demo-certification-student",
      password: process.env.PLAYWRIGHT_CERTIFICATION_STUDENT_PASSWORD ?? "Demo@12345",
    },
    {
      family: "language_proficiency",
      username: process.env.PLAYWRIGHT_LANGUAGE_STUDENT_USERNAME ?? "demo-language-student",
      password: process.env.PLAYWRIGHT_LANGUAGE_STUDENT_PASSWORD ?? "Demo@12345",
    },
  ] as const;

  for (const scenario of scenarios) {
    test(`@workflow student exam detail renders family-aware experience panel for ${scenario.family} lane`, async ({
      page,
    }) => {
      await loginWithCredentials(
        page,
        {
          username: scenario.username,
          password: scenario.password,
        },
        "student",
      );
      await expectStudentWorkspace(page);

      const availableExams = await fetchStudentAvailableExamsForFamily(page);
      const exam = availableExams.find(
        (record) => record.experience_profile?.assessment_family === scenario.family,
      );
      expect(exam).toBeTruthy();

      const detail = await fetchStudentExamDetailForFamily(page, exam!.id);
      await page.goto(`/app/exams/${exam!.id}`);
      await expect(page.getByRole("heading", { name: new RegExp(detail.title, "i") }).first()).toBeVisible();

      const experiencePanel = page.locator('[aria-label="Exam experience profile"]').first();
      await expect(experiencePanel).toBeVisible();
      await expect(experiencePanel.getByText(detail.experience_profile.assessment_family_label).first()).toBeVisible();
      await expect(experiencePanel.getByText(detail.experience_profile.learner_summary).first()).toBeVisible();
      await expect(experiencePanel.getByText(detail.experience_profile.experience_label).first()).toBeVisible();
      await expect(
        experiencePanel.getByText(detail.experience_profile.recommended_media_flow_label).first(),
      ).toBeVisible();
      await expect(
        experiencePanel.getByText(
          detail.experience_profile.runtime_alignment ? /runtime aligned/i : /runtime customized/i,
        ).first(),
      ).toBeVisible();
      await expect(
        experiencePanel.getByText(titleCaseState(detail.experience_profile.recommended_timer_mode)).first(),
      ).toBeVisible();
      await expect(
        experiencePanel.getByText(titleCaseState(detail.experience_profile.recommended_navigation_mode)).first(),
      ).toBeVisible();
      await expect(
        experiencePanel.getByText(detail.experience_profile.section_strategy_label).first(),
      ).toBeVisible();

      if (scenario.family === "competitive") {
        await expect(page.getByText(/sequential sections|section switching allowed/i).first()).toBeVisible();
      }

      if (scenario.family === "certification") {
        await expect(page.getByText(/review availability/i).first()).toBeVisible();
      }

      if (scenario.family === "language_proficiency") {
        await expect(page.getByText(/section strategy|media flow|review availability/i).first()).toBeVisible();
        expect(detail.experience_profile.learner_summary).toMatch(/structured language simulation/i);
        expect(detail.experience_profile.learner_summary).toMatch(/rubric-guided/i);
        expect(detail.experience_profile.learner_summary).not.toMatch(/speaking/i);
      }
    });
  }
});
