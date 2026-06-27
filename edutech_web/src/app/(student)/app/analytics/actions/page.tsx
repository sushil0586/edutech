import Link from "next/link";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentAnalyticsDetailHero,
  StudentQuestionInsightList,
} from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  aggregateQuestionsByTopic,
  aggregateQuestionsByType,
} from "@/lib/student/analytics-derivations";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTimelineHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import { percentageLabel, questionTypeLabel } from "@/lib/student/formatters";

function readTopicContext(
  questions: Awaited<ReturnType<typeof fetchStudentQuestionAnalytics>>["questions"],
  topicKey: string | null,
) {
  if (!topicKey) {
    return null;
  }

  return (
    questions.find(
      (item) => (item.topic_id ?? item.topic_name ?? "untagged") === topicKey,
    ) ?? null
  );
}

export default async function StudentAnalyticsActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; source?: string; teacher?: string }>;
}) {
  const query = await searchParams;
  const state = getStudentApiState();
  const subject = query.subject ? decodeAnalyticsParam(query.subject) : null;
  const source = query.source ? decodeAnalyticsParam(query.source) : null;
  const teacher = query.teacher ?? null;

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Action center is waiting for backend data"
          description="This page uses live analytics and question-level insights to recommend the next best study action."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Practice inventory"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Configuration required"
        />
      </div>
    );
  }

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({ subject, source, teacher }).catch(() => null),
  ]);

  if (!bundle.summary || !questionData) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Action center could not be loaded"
          description="We need both the analytics summary and question-level evidence to recommend the next best move."
          bullets={["Student analytics bundle", "Question analytics endpoint", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  const weakTopics = aggregateQuestionsByTopic(questionData.questions).slice(0, 3);
  const weakestTopic = weakTopics[0] ?? null;
  const weakestTopicContext = readTopicContext(questionData.questions, weakestTopic?.key ?? null);
  const mostWrong = questionData.questions
    .filter((item) => item.your_result === "wrong")
    .slice(0, 4);
  const mostSkipped = questionData.questions
    .filter((item) => item.your_result === "skipped")
    .slice(0, 4);
  const slowestQuestions = [...questionData.questions]
    .sort((a, b) => b.your_time_spent_seconds - a.your_time_spent_seconds)
    .slice(0, 4);
  const weakestQuestionType = aggregateQuestionsByType(questionData.questions)[0] ?? null;
  const subjectFocusName = subject ?? weakestTopicContext?.subject_name ?? null;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Analytics action center"
        title="Next Best Moves"
        description="Move from passive analytics into targeted practice, question review, and fast recovery actions."
        statusLabel={`${questionData.questions.length} questions evaluated`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentAnalyticsDetailHero
        eyebrow="Recommended now"
        title={
          weakestTopic?.label
            ? `Recover ${weakestTopic.label}`
            : "Turn analytics into a study move"
        }
        description={
          weakestTopic
            ? `${weakestTopic.label} is your weakest tracked topic right now at ${percentageLabel(weakestTopic.accuracy)}. Start with the weakest concept, then reinforce it with exact question review.`
            : "Your action center combines weak topics, risky question types, and costly question patterns so you can choose what to fix next."
        }
        badges={[
          subjectFocusName ?? "Overall view",
          weakestQuestionType
            ? `${questionTypeLabel(weakestQuestionType.label)} risk`
            : "Question patterns ready",
        ]}
        stats={[
          {
            label: "Weak topics",
            value: String(weakTopics.length),
          },
          {
            label: "Wrong questions",
            value: String(mostWrong.length),
          },
          {
            label: "Skipped questions",
            value: String(mostSkipped.length),
          },
          {
            label: "Slow questions",
            value: String(slowestQuestions.length),
          },
        ]}
        tone="warm"
        actions={
          <>
            <Link
              className="button buttonPrimary"
              href={
                weakestTopicContext
                  ? buildAnalyticsTopicHref({
                      topicId: weakestTopicContext.topic_id ?? "untagged",
                      subject: weakestTopicContext.subject_name ?? subject,
                      label: weakestTopicContext.topic_name,
                      source,
                      teacher,
                    })
                  : "/app/practice"
              }
            >
              Open weakest topic
            </Link>
            <Link
              className="button buttonSecondary"
              href={
                subjectFocusName
                  ? `/app/practice?subject=${encodeURIComponent(subjectFocusName)}`
                  : "/app/practice"
              }
            >
              Open Practice Lane
            </Link>
          </>
        }
      />

      <section className="analyticsActionGrid">
        {weakestTopic ? (
          <article className="contentCard analyticsActionCard">
            <span className="studentDashboardTagWarm">Topic recovery</span>
            <strong>{weakestTopic.label}</strong>
            <p>
              Focus your next study block on the topic with the lowest scored performance and then review the exact questions behind it.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={
                  weakestTopicContext
                    ? buildAnalyticsTopicHref({
                        topicId: weakestTopicContext.topic_id ?? "untagged",
                        subject: weakestTopicContext.subject_name ?? subject,
                        label: weakestTopicContext.topic_name,
                        source,
                        teacher,
                      })
                    : "/app/analytics"
                }
              >
                Topic deep dive
              </Link>
              <Link
                className="button buttonGhost"
                href={
                  weakestTopicContext?.subject_name
                    ? `/app/practice?subject=${encodeURIComponent(
                        weakestTopicContext.subject_name,
                      )}&topic=${encodeURIComponent(weakestTopicContext.topic_name ?? "")}`
                    : "/app/practice"
                }
              >
                Practice this topic
              </Link>
            </div>
          </article>
        ) : null}

        {weakestQuestionType ? (
          <article className="contentCard analyticsActionCard">
            <span className="studentDashboardTagWarm">Format repair</span>
            <strong>{questionTypeLabel(weakestQuestionType.label)}</strong>
            <p>
              You are losing the most marks in this format right now. Review the pattern before it compounds across more exams.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.label,
                  subject,
                  source,
                  teacher,
                })}
              >
                Open type lab
              </Link>
              <Link
                className="button buttonGhost"
                href={buildQuestionAnalyticsHref({
                  questionType: weakestQuestionType.label,
                  subject,
                  source,
                  teacher,
                })}
              >
                Open question table
              </Link>
            </div>
          </article>
        ) : null}

        <article className="contentCard analyticsActionCard">
          <span className="studentDashboardTagWarm">Subject focus</span>
          <strong>{subjectFocusName ?? "Choose a subject"}</strong>
          <p>
            Subject pages combine your topic, difficulty, and question-type signals so you can decide what to revise in one place.
          </p>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonPrimary"
              href={
                subjectFocusName
                  ? buildAnalyticsSubjectHref(subjectFocusName, { source, teacher })
                  : "/app/analytics"
              }
            >
              Open subject deep dive
            </Link>
          </div>
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Recover wrong answers</strong>
            <span>{mostWrong.length} priority questions</span>
          </div>
          <StudentQuestionInsightList
            questions={mostWrong}
            emptyMessage="No recent wrong questions were available."
          />
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Rescue skipped questions</strong>
            <span>{mostSkipped.length} review items</span>
          </div>
          <StudentQuestionInsightList
            questions={mostSkipped}
            emptyMessage="No skipped-question signals were available."
          />
        </article>
      </section>

      <section className="studentInsightsTwoColumn">
        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Slowest questions</strong>
            <span>{slowestQuestions.length} time-costly items</span>
          </div>
          <StudentQuestionInsightList
            questions={slowestQuestions}
            emptyMessage="No timing-heavy questions were available."
          />
        </article>

        <article className="contentCard">
          <div className="sectionHeading">
            <strong>Action shortlist</strong>
            <span>Three quick routes</span>
          </div>
          <div className="analyticsChecklist">
            <Link
              className="analyticsChecklistItem"
              href={buildAnalyticsTimelineHref({ subject, source, teacher })}
            >
              <strong>Check your timeline</strong>
              <span>Validate whether this is a trend or a one-off dip.</span>
            </Link>
            {subjectFocusName ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsSubjectHref(subjectFocusName, { source, teacher })}
              >
                <strong>Open subject deep dive</strong>
                <span>See whether the weakness is topic, format, or difficulty driven.</span>
              </Link>
            ) : null}
            {weakestQuestionType ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.label,
                  subject,
                  source,
                  teacher,
                })}
              >
                <strong>Fix your riskiest format</strong>
                <span>Use the question-type lab to review recurring answer behavior.</span>
              </Link>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
