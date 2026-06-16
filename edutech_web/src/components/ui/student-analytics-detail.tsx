import Link from "next/link";
import type { StudentQuestionAnalyticsItem } from "@/features/dashboard/types";
import { StudentAttachmentPreviewTrigger } from "@/components/ui/student-attachment-preview-trigger";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
} from "@/lib/student/analytics";
import {
  percentageLabel,
  questionTypeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

const STUDENT_API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

function benchmarkLabel(value: {
  participant_count: number;
  correct_percentage: string;
} | null) {
  if (!value) {
    return "No peer responses yet";
  }
  return `${percentageLabel(value.correct_percentage)} correct · ${value.participant_count} scoped ${value.participant_count === 1 ? "response" : "responses"}`;
}

function headlineBenchmarkLabel(value: {
  participant_count: number;
  correct_percentage: string;
} | null) {
  if (!value) {
    return "No school peer data yet";
  }
  return `${percentageLabel(value.correct_percentage)} school peer accuracy · ${value.participant_count} ${value.participant_count === 1 ? "response" : "responses"}`;
}

function shortQuestionId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function resolveAttachmentHref(fileUrl: string) {
  if (!fileUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  if (!STUDENT_API_BASE_URL) {
    return fileUrl;
  }

  return `${STUDENT_API_BASE_URL}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
}

function previewAttachmentKind(fileUrl: string, attachmentType: string) {
  const normalizedUrl = fileUrl.toLowerCase();
  const normalizedType = attachmentType.toLowerCase();

  if (
    normalizedType === "image" ||
    normalizedType === "diagram" ||
    /\.(svg|png|jpe?g|gif|webp|bmp)$/i.test(normalizedUrl)
  ) {
    return "image";
  }

  if (normalizedType === "pdf" || /\.pdf$/i.test(normalizedUrl)) {
    return "pdf";
  }

  return "other";
}

type StudentAnalyticsDetailHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  stats?: Array<{
    label: string;
    value: string;
  }>;
  actions?: React.ReactNode;
  tone?: "default" | "warm";
};

export function StudentAnalyticsDetailHero({
  eyebrow,
  title,
  description,
  badges = [],
  stats = [],
  actions,
  tone = "default",
}: StudentAnalyticsDetailHeroProps) {
  return (
    <section
      className={[
        "analyticsDetailHero",
        tone === "warm" ? "analyticsDetailHeroWarm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="analyticsDetailHeroCopy">
        <span className="studentDashboardTag">{eyebrow}</span>
        <strong>{title}</strong>
        <p>{description}</p>
        {badges.length ? (
          <div className="studentInsightHeroActions">
            {badges.map((badge) => (
              <span className="studentDashboardMiniBadge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="analyticsDetailHeroRail">
        {stats.length ? (
          <div className="analyticsSignalGrid">
            {stats.map((stat) => (
              <div className="analyticsSignalCard" key={`${stat.label}-${stat.value}`}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {actions ? <div className="studentInsightHeroActions">{actions}</div> : null}
      </div>
    </section>
  );
}

type StudentQuestionInsightListProps = {
  questions: StudentQuestionAnalyticsItem[];
  subject?: string | null;
  source?: string | null;
  teacher?: string | null;
  currentView?: "subject" | "topic" | "question-type" | "questions" | "source" | "actions";
  currentTopicId?: string | null;
  currentQuestionType?: string | null;
  emptyMessage?: string;
};

export function StudentQuestionInsightList({
  questions,
  subject,
  source,
  teacher,
  currentView,
  currentTopicId,
  currentQuestionType,
  emptyMessage = "No question-level records matched the current filters.",
}: StudentQuestionInsightListProps) {
  if (!questions.length) {
    return <p className="emptyText">{emptyMessage}</p>;
  }

  return (
    <div className="studentTopicStack">
      {questions.map((item) => (
        <details className="analyticsQuestionSurface" key={item.question_id}>
            <summary className="analyticsQuestionSummary">
              <div className="analyticsQuestionHeadline">
                <div className="studentInsightHeroActions">
                  <span className="studentDashboardTag">
                    {questionTypeLabel(item.question_type)}
                  </span>
                  <span className="studentDashboardTag">
                    {titleCaseState(item.difficulty_level.replace(/_/g, " "))}
                  </span>
                  <span className="studentDashboardTag">{item.category_label}</span>
                  {item.has_image ? (
                    <span className="studentDashboardTag">Image</span>
                  ) : null}
                  <span className="studentDashboardTag">
                    Q-{shortQuestionId(item.question_id)}
                  </span>
                </div>
                <strong>{item.question_text_summary}</strong>
                <span>
                  {item.subject_name ?? "Unknown subject"}
                  {item.topic_name ? ` · ${item.topic_name}` : ""}
                  {item.attempted_by_you ? ` · You ${item.your_result}` : " · You skipped this question"}
                  {item.your_time_spent_seconds
                    ? ` · ${item.your_time_spent_seconds}s spent`
                    : ""}
                </span>
                <div className="analyticsQuestionEvidenceRow">
                  <div className="analyticsQuestionEvidencePill">
                    <strong>{item.attachments.length}</strong>
                    <span>{item.attachments.length === 1 ? "attachment" : "attachments"}</span>
                  </div>
                  <div className="analyticsQuestionEvidencePill">
                    <strong>{item.tag_labels.length}</strong>
                    <span>{item.tag_labels.length === 1 ? "skill tag" : "skill tags"}</span>
                  </div>
                  <div className="analyticsQuestionEvidencePill">
                    <strong>{item.attempted_by_you ? "Attempted" : "Skipped"}</strong>
                    <span>your submission state</span>
                  </div>
                </div>
              </div>
              <div className="studentTopicRowMeta analyticsQuestionOutcomeMeta">
                <strong className={`analyticsQuestionOutcome analyticsQuestionOutcome${titleCaseState(item.your_result)}`}>
                  {titleCaseState(item.your_result)}
                </strong>
                <span>{headlineBenchmarkLabel(item.school_benchmark)}</span>
              </div>
            </summary>

            <div className="analyticsQuestionDetail">
              <div className="analyticsQuestionDetailMain">
                <div className="analyticsQuestionNarrative analyticsQuestionStoryCard">
                  <div>
                    <strong>Full question</strong>
                    <p>{item.question_text}</p>
                  </div>
                  {item.explanation ? (
                    <div>
                      <strong>Explanation</strong>
                      <p>{item.explanation}</p>
                    </div>
                  ) : null}
                </div>

                <div className="analyticsQuestionAside">
                  <div className="contentCard analyticsQuestionMiniCard">
                    <div className="sectionHeading">
                      <strong>Attempt signal</strong>
                      <span>Personal evidence</span>
                    </div>
                    <div className="analyticsQuestionMiniStats">
                      <div className="analyticsQuestionMiniStat">
                        <span>Result</span>
                        <strong>{titleCaseState(item.your_result)}</strong>
                      </div>
                      <div className="analyticsQuestionMiniStat">
                        <span>Marks</span>
                        <strong>{item.your_marks_awarded}</strong>
                      </div>
                      <div className="analyticsQuestionMiniStat">
                        <span>Time</span>
                        <strong>
                          {item.your_time_spent_seconds
                            ? `${item.your_time_spent_seconds}s`
                            : "N/A"}
                        </strong>
                      </div>
                      {item.your_negative_marks !== "0.00" ? (
                        <div className="analyticsQuestionMiniStat">
                          <span>Negative</span>
                          <strong>{item.your_negative_marks}</strong>
                        </div>
                      ) : null}
                    </div>
                    {item.tag_labels.length ? (
                      <div className="studentInsightHeroActions">
                        {item.tag_labels.map((tag) => (
                          <span
                            className="studentDashboardMiniBadge"
                            key={`${item.question_id}-${tag}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {item.attachments.length ? (
                    <div className="contentCard analyticsQuestionMiniCard">
                      <div className="sectionHeading">
                        <strong>Attachments</strong>
                        <span>{item.attachments.length} linked</span>
                      </div>
                      <div className="studentTopicStack">
                        {item.attachments.map((attachment) => {
                          const href = resolveAttachmentHref(attachment.file_url);
                          const kind = previewAttachmentKind(href, attachment.attachment_type);
                          return (
                            <div className="studentTopicRow" key={attachment.id}>
                              <div>
                                <strong>
                                  {attachment.title ||
                                    titleCaseState(attachment.attachment_type)}
                                </strong>
                                <span>{attachment.alt_text || "Question visual reference"}</span>
                              </div>
                              <div className="studentTopicRowMeta">
                                {attachment.file_url ? (
                                  <StudentAttachmentPreviewTrigger
                                    title={
                                      attachment.title ||
                                      titleCaseState(attachment.attachment_type)
                                    }
                                    href={href}
                                    kind={kind}
                                    altText={
                                      attachment.alt_text || "Question visual reference"
                                    }
                                  />
                                ) : (
                                  <span>No link</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="studentInsightsTwoColumn analyticsQuestionSupportGrid">
              <div className="contentCard analyticsQuestionSupportCard">
                <div className="sectionHeading">
                  <strong>Anonymous Benchmarks</strong>
                  <span>Only scoped response accuracy is shown</span>
                </div>
                <div className="studentTopicStack">
                  <div className="studentTopicRow">
                    <div>
                      <strong>School</strong>
                      <span>Same-school scoped responses</span>
                    </div>
                    <div className="studentTopicRowMeta">
                      <strong>{benchmarkLabel(item.school_benchmark)}</strong>
                    </div>
                  </div>
                  <div className="studentTopicRow">
                    <div>
                      <strong>City</strong>
                      <span>Same-city scoped responses</span>
                    </div>
                    <div className="studentTopicRowMeta">
                      <strong>{benchmarkLabel(item.city_benchmark)}</strong>
                    </div>
                  </div>
                  <div className="studentTopicRow">
                    <div>
                      <strong>State</strong>
                      <span>Same-state scoped responses</span>
                    </div>
                    <div className="studentTopicRowMeta">
                      <strong>{benchmarkLabel(item.state_benchmark)}</strong>
                    </div>
                  </div>
                  <div className="studentTopicRow">
                    <div>
                      <strong>Class level</strong>
                      <span>Same-program scoped responses</span>
                    </div>
                    <div className="studentTopicRowMeta">
                      <strong>{benchmarkLabel(item.program_benchmark)}</strong>
                    </div>
                  </div>
                </div>
              </div>

                <div className="contentCard analyticsQuestionSupportCard analyticsQuestionActionCard">
                <div className="sectionHeading">
                  <strong>Open related drill-downs</strong>
                  <span>Only links that change the current slice are shown</span>
                </div>
                <div className="analyticsQuestionActionGrid">
                  {item.subject_name &&
                  !(currentView === "subject" && subject === item.subject_name) ? (
                    <Link
                      className="button buttonGhost analyticsQuestionActionButton"
                      href={buildAnalyticsSubjectHref(item.subject_name, {
                        source,
                        teacher,
                      })}
                    >
                      Subject view
                    </Link>
                  ) : null}
                  {item.topic_id &&
                  !(currentView === "topic" && currentTopicId === item.topic_id) ? (
                    <Link
                      className="button buttonGhost analyticsQuestionActionButton"
                      href={buildAnalyticsTopicHref({
                        topicId: item.topic_id,
                        subject: item.subject_name ?? subject ?? null,
                        label: item.topic_name ?? null,
                        source,
                        teacher,
                      })}
                    >
                      Topic view
                    </Link>
                  ) : null}
                  {!(currentView === "question-type" &&
                  currentQuestionType === item.question_type) ? (
                    <Link
                      className="button buttonGhost analyticsQuestionActionButton"
                      href={buildAnalyticsQuestionTypeHref({
                        questionType: item.question_type,
                        subject: item.subject_name ?? subject ?? null,
                        source,
                        teacher,
                      })}
                    >
                      Type view
                    </Link>
                  ) : null}
                  {currentView !== "questions" ? (
                    <Link
                      className="button buttonGhost analyticsQuestionActionButton"
                      href={buildQuestionAnalyticsHref({
                        subject: item.subject_name ?? subject ?? null,
                        topic: item.topic_id,
                        questionType: item.question_type,
                        source,
                        teacher,
                      })}
                    >
                      Question table
                    </Link>
                  ) : null}
              </div>
                </div>
              </div>
            </div>
        </details>
      ))}
    </div>
  );
}
