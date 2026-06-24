import type { StudentExamExperienceProfile } from "@/features/dashboard/types";
import { titleCaseState } from "@/lib/student/formatters";

type StudentExamExperiencePanelProps = {
  profile: StudentExamExperienceProfile;
  compact?: boolean;
};

export function StudentExamExperiencePanel({
  profile,
  compact = false,
}: StudentExamExperiencePanelProps) {
  return (
    <section
      className={`studentExamExperiencePanel ${
        compact ? "studentExamExperiencePanelCompact" : ""
      }`}
      aria-label="Exam experience profile"
    >
      <div className="studentExamExperiencePanelHeader">
        <div>
          <span className="studentExamExperienceEyebrow">Exam experience profile</span>
          <strong>{profile.assessment_family_label}</strong>
          <p>{profile.learner_summary}</p>
        </div>
        <div className="questionBankTagRow">
          <span className="questionBankTagChip">{profile.experience_label}</span>
          <span className="questionBankTagChip">{profile.recommended_media_flow_label}</span>
          <span className="questionBankTagChip">
            {profile.runtime_alignment ? "Runtime aligned" : "Runtime customized"}
          </span>
        </div>
      </div>

      <div className="studentExamExperienceGrid">
        <article className="studentExamExperienceCard">
          <span>Suggested timing</span>
          <strong>{titleCaseState(profile.recommended_timer_mode)}</strong>
        </article>
        <article className="studentExamExperienceCard">
          <span>Suggested navigation</span>
          <strong>{titleCaseState(profile.recommended_navigation_mode)}</strong>
        </article>
        <article className="studentExamExperienceCard">
          <span>Section strategy</span>
          <strong>{profile.section_strategy_label}</strong>
        </article>
      </div>
    </section>
  );
}
