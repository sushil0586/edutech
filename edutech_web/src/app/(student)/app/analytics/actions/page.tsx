import Link from "next/link";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  StudentAnalyticsDetailHero,
  StudentQuestionInsightList,
} from "@/components/ui/student-analytics-detail";
import { fetchStudentQuestionAnalytics, getStudentApiState } from "@/lib/api/student";
import {
  buildAnalyticsQuestionTypeHref,
  buildAnalyticsSubjectHref,
  buildAnalyticsTopicHref,
  buildQuestionAnalyticsHref,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import { percentageLabel, questionTypeLabel } from "@/lib/student/formatters";

export default async function StudentAnalyticsActionsPage() {
  const state = getStudentApiState();

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
    fetchStudentQuestionAnalytics().catch(() => null),
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

  const weakTopics = [...bundle.topicPerformance]
    .sort((a, b) => Number(a.percentage) - Number(b.percentage))
    .slice(0, 3);
  const weakestTopic = weakTopics[0] ?? null;
  const mostWrong = questionData.questions
    .filter((item) => item.your_result === "wrong")
    .slice(0, 4);
  const mostSkipped = questionData.questions
    .filter((item) => item.your_result === "skipped")
    .slice(0, 4);
  const slowestQuestions = [...questionData.questions]
    .sort((a, b) => b.your_time_spent_seconds - a.your_time_spent_seconds)
    .slice(0, 4);
  const weakestQuestionType = bundle.summary.weak_question_types[0] ?? null;

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
          weakestTopic?.topic_name
            ? `Recover ${weakestTopic.topic_name}`
            : "Turn analytics into a study move"
        }
        description={
          weakestTopic
            ? `${weakestTopic.topic_name} is your weakest tracked topic right now at ${percentageLabel(weakestTopic.percentage)}. Start with the weakest concept, then reinforce it with exact question review.`
            : "Your action center combines weak topics, risky question types, and costly question patterns so you can choose what to fix next."
        }
        badges={[
          weakestTopic?.subject_name ?? "Overall view",
          weakestQuestionType
            ? `${questionTypeLabel(weakestQuestionType.question_type)} risk`
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
            <Link className="button buttonPrimary" href={weakestTopic ? buildAnalyticsTopicHref({
              topicId: weakestTopic.topic ?? "untagged",
              subject: weakestTopic.subject_name,
              label: weakestTopic.topic_name,
            }) : "/app/practice"}>
              Open weakest topic
            </Link>
            <Link className="button buttonSecondary" href="/app/practice">
              Open Practice Lane
            </Link>
          </>
        }
      />

      <section className="analyticsActionGrid">
        {weakestTopic ? (
          <article className="contentCard analyticsActionCard">
            <span className="studentDashboardTagWarm">Topic recovery</span>
            <strong>{weakestTopic.topic_name ?? "Untagged topic"}</strong>
            <p>
              Focus your next study block on the topic with the lowest scored performance and then review the exact questions behind it.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={buildAnalyticsTopicHref({
                  topicId: weakestTopic.topic ?? "untagged",
                  subject: weakestTopic.subject_name,
                  label: weakestTopic.topic_name,
                })}
              >
                Topic deep dive
              </Link>
              <Link
                className="button buttonGhost"
                href={`/app/practice?subject=${encodeURIComponent(
                  weakestTopic.subject_name,
                )}&topic=${encodeURIComponent(weakestTopic.topic_name ?? "")}`}
              >
                Practice this topic
              </Link>
            </div>
          </article>
        ) : null}

        {weakestQuestionType ? (
          <article className="contentCard analyticsActionCard">
            <span className="studentDashboardTagWarm">Format repair</span>
            <strong>{questionTypeLabel(weakestQuestionType.question_type)}</strong>
            <p>
              You are losing the most marks in this format right now. Review the pattern before it compounds across more exams.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.question_type,
                })}
              >
                Open type lab
              </Link>
              <Link
                className="button buttonGhost"
                href={buildQuestionAnalyticsHref({
                  questionType: weakestQuestionType.question_type,
                })}
              >
                Open question table
              </Link>
            </div>
          </article>
        ) : null}

        <article className="contentCard analyticsActionCard">
          <span className="studentDashboardTagWarm">Subject focus</span>
          <strong>{weakestTopic?.subject_name ?? "Choose a subject"}</strong>
          <p>
            Subject pages combine your topic, difficulty, and question-type signals so you can decide what to revise in one place.
          </p>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonPrimary"
              href={
                weakestTopic?.subject_name
                  ? buildAnalyticsSubjectHref(weakestTopic.subject_name)
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
            <Link className="analyticsChecklistItem" href="/app/analytics/timeline">
              <strong>Check your timeline</strong>
              <span>Validate whether this is a trend or a one-off dip.</span>
            </Link>
            {weakestTopic?.subject_name ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsSubjectHref(weakestTopic.subject_name)}
              >
                <strong>Open subject deep dive</strong>
                <span>See whether the weakness is topic, format, or difficulty driven.</span>
              </Link>
            ) : null}
            {weakestQuestionType ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.question_type,
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
