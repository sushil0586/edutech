import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import { StudentReportFilters } from "@/components/ui/student-report-filters";
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
  buildWrongQuestionsHref,
  decodeAnalyticsParam,
  loadStudentAnalyticsBundle,
} from "@/lib/student/analytics";
import { percentageLabel, questionTypeLabel } from "@/lib/student/formatters";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  getStudentSourceOptions,
  getStudentSubjectOptions,
  resolveSelectedStudentSource,
  resolveSelectedStudentSourceTeacher,
  resolveSelectedStudentSubject,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

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
  const profile = await fetchCurrentAccountProfile();
  const registrationContext = profile?.registration_context ?? {};
  const subjectOptions = getStudentSubjectOptions(profile ?? registrationContext);
  const cookieStore = await cookies();
  const selectedSubject = resolveSelectedStudentSubject(
    subjectOptions,
    query.subject
      ? decodeAnalyticsParam(query.subject)
      : cookieStore.get(STUDENT_SUBJECT_CONTEXT_COOKIE)?.value ?? ALL_SUBJECTS_CONTEXT,
  );
  const selectedSource = resolveSelectedStudentSource(
    query.source
      ? decodeAnalyticsParam(query.source)
      : cookieStore.get(STUDENT_SOURCE_CONTEXT_COOKIE)?.value ?? ALL_SOURCES_CONTEXT,
  );

  if (!state.apiConfigured) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Setup required"
          title="Action center is not available yet"
          description="Sign in with your student account to load analytics and recommended next steps."
          bullets={["Student sign-in", "Analytics summary", "Practice inventory"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Sign in to continue"
        />
      </div>
    );
  }

  const [bundle, questionData] = await Promise.all([
    loadStudentAnalyticsBundle(),
    fetchStudentQuestionAnalytics({
      subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
      teacher: query.teacher ?? null,
    }).catch(() => null),
  ]);

  if (!bundle.summary) {
    return (
      <div className="studentPage studentDashboardModern">
        <StudentStatePanel
          eyebrow="Load issue"
          title="Action center could not be loaded"
          description="We couldn't load enough analytics data to recommend the next best move."
          bullets={["Analytics summary", "Question analytics", "Published results"]}
          ctaHref="/app/analytics"
          ctaLabel="Back to Analytics"
          statusLabel="Try again soon"
        />
      </div>
    );
  }

  const { teacherOptions } = getStudentSourceOptions([
    ...bundle.results,
    ...bundle.exams,
    ...(bundle.summary?.source_breakdown ?? []),
    ...(bundle.summary?.recent_exams ?? []),
  ]);
  const selectedTeacherId = resolveSelectedStudentSourceTeacher(
    teacherOptions,
    selectedSource,
    query.teacher ??
      cookieStore.get(STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE)?.value ??
      null,
  );

  const resolvedQuestionData = questionData ?? {
    overview: {
      question_count: 0,
      attempted_count: 0,
      correct_count: 0,
      wrong_count: 0,
      skipped_count: 0,
    },
    benchmark_overview: [],
    questions: [],
  };

  const weakTopics = aggregateQuestionsByTopic(resolvedQuestionData.questions).slice(0, 3);
  const weakestTopic = weakTopics[0] ?? null;
  const weakestTopicContext = readTopicContext(resolvedQuestionData.questions, weakestTopic?.key ?? null);
  const mostWrong = resolvedQuestionData.questions
    .filter((item) => item.your_result === "wrong")
    .slice(0, 4);
  const mostSkipped = resolvedQuestionData.questions
    .filter((item) => item.your_result === "skipped")
    .slice(0, 4);
  const slowestQuestions = [...resolvedQuestionData.questions]
    .sort((a, b) => b.your_time_spent_seconds - a.your_time_spent_seconds)
    .slice(0, 4);
  const weakestQuestionType = aggregateQuestionsByType(resolvedQuestionData.questions)[0] ?? null;
  const subjectFocusName =
    selectedSubject === ALL_SUBJECTS_CONTEXT
      ? weakestTopicContext?.subject_name ?? null
      : selectedSubject;

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        eyebrow="Analytics action center"
        title="Next Best Moves"
        description="Turn analytics into targeted practice and fast recovery actions."
        statusLabel={`${resolvedQuestionData.questions.length} questions evaluated`}
        statusTone="live"
        action={<Link className="button buttonGhost" href="/app/analytics">Back to Analytics</Link>}
      />

      <StudentReportFilters
        basePath="/app/analytics/actions"
        title="Action center filters"
        helper="Scope the recommended next moves before opening topic recovery, question repair, or practice follow-up routes."
        selectedSource={selectedSource}
        selectedSubject={selectedSubject}
        selectedTeacherId={selectedTeacherId}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
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
            ? `${weakestTopic.label} is your weakest tracked topic right now at ${percentageLabel(weakestTopic.accuracy)}. Start there, then reinforce it with question review.`
            : "Use weak topics, risky formats, and slow questions to choose the next fix."
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
                      subject:
                        weakestTopicContext.subject_name ??
                        (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
                      label: weakestTopicContext.topic_name,
                      source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                      teacher: selectedTeacherId,
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
              Start with the lowest-scoring topic, then review the exact questions behind it.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={
                  weakestTopicContext
                    ? buildAnalyticsTopicHref({
                        topicId: weakestTopicContext.topic_id ?? "untagged",
                        subject:
                          weakestTopicContext.subject_name ??
                          (selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject),
                        label: weakestTopicContext.topic_name,
                        source:
                          selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                        teacher: selectedTeacherId,
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
              You are losing the most marks in this format right now. Review it before it repeats.
            </p>
            <div className="studentInsightHeroActions">
              <Link
                className="button buttonPrimary"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.label,
                  subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
                Open type lab
              </Link>
              <Link
                className="button buttonGhost"
                href={buildWrongQuestionsHref({
                  questionType: weakestQuestionType.label,
                  subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
                Open wrong questions report
              </Link>
            </div>
          </article>
        ) : null}

        <article className="contentCard analyticsActionCard">
          <span className="studentDashboardTagWarm">Subject focus</span>
          <strong>{subjectFocusName ?? "Choose a subject"}</strong>
          <p>
            Subject pages combine topic, difficulty, and format signals in one place.
          </p>
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonPrimary"
              href={
                subjectFocusName
                  ? buildAnalyticsSubjectHref(subjectFocusName, {
                      source:
                        selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                      teacher: selectedTeacherId,
                    })
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
          <div className="studentInsightHeroActions">
            <Link
              className="button buttonSecondary"
              href={buildWrongQuestionsHref({
                subject:
                  selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              Open Wrong Questions Report
            </Link>
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
              href={buildAnalyticsTimelineHref({
                subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                teacher: selectedTeacherId,
              })}
            >
              <strong>Check your timeline</strong>
              <span>Check whether this is a trend or a one-off dip.</span>
            </Link>
            {subjectFocusName ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsSubjectHref(subjectFocusName, {
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
                <strong>Open subject deep dive</strong>
                <span>See whether the weakness comes from topic, format, or difficulty.</span>
              </Link>
            ) : null}
            {weakestQuestionType ? (
              <Link
                className="analyticsChecklistItem"
                href={buildAnalyticsQuestionTypeHref({
                  questionType: weakestQuestionType.label,
                  subject: selectedSubject === ALL_SUBJECTS_CONTEXT ? null : selectedSubject,
                  source: selectedSource === ALL_SOURCES_CONTEXT ? null : selectedSource,
                  teacher: selectedTeacherId,
                })}
              >
                <strong>Fix your riskiest format</strong>
                <span>Open the question-type view to review repeated mistakes.</span>
              </Link>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
