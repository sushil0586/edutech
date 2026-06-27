import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import { InstitutePageHeader } from "@/components/ui/institute-page-header";
import { LiveMonitorRefresh } from "@/components/ui/live-monitor-refresh";
import {
  getStudentQuestionPromptTitle,
  StudentQuestionPrompt,
} from "@/components/ui/student-question-prompt";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { TeacherRubricReviewFields } from "@/components/ui/teacher-rubric-review-fields";
import { TeacherPageHeader } from "@/components/ui/teacher-page-header";
import type {
  ReadinessIssue,
  TeacherQuestionAnalysisPage,
  TeacherResultSummary,
} from "@/features/dashboard/types";
import { buildQuestionTypePresentationProfile } from "@/lib/assessment/question-type-presentation";
import {
  calculateTeacherExamRanks,
  createTeacherAttemptInterventionNote,
  fetchTeacherAttemptInterventions,
  fetchTeacherAttemptQuestionAnalysis,
  fetchTeacherExamAttemptPage,
  fetchTeacherExamPublishReadiness,
  fetchTeacherExamLeaderboard,
  fetchTeacherExams,
  fetchTeacherLiveExamMonitor,
  fetchTeacherQuestionAnalysis,
  fetchTeacherResultPublishReadiness,
  fetchTeacherResultSummary,
  fetchTeacherTopicPerformance,
  forceSubmitTeacherAttempt,
  generateTeacherResultsForExam,
  manualReviewTeacherAnswer,
  publishTeacherExamResults,
  runTeacherExamAction,
  submitTeacherReviewTask,
} from "@/lib/api/teacher";
import { moderatePortalReviewTask } from "@/lib/api/portal";
import { requireInstituteAdminSession, requireTeacherSession } from "@/lib/auth/session";
import { buildFilterHref, formatFilterValue } from "@/lib/workspace/filter-utils";
import {
  type AttemptHealth,
  attemptHealth,
  attemptHealthLabel as healthLabel,
  attemptHealthPriorityScore as healthPriorityScore,
  attemptHealthReason as healthReason,
  attemptHealthTone as healthTone,
  latestIntegrityLabel,
} from "@/lib/workspace/attempt-risk";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type HeaderComponent = typeof InstitutePageHeader | typeof TeacherPageHeader;
type ResultsWorkspaceRole = "institute" | "teacher";
type ResultsWorkspaceView = "overview" | "live" | "attempts" | "leaderboard" | "analysis";

type ResultsExamCard = Awaited<ReturnType<typeof fetchTeacherExams>>[number];
type ResultsAttempt = Awaited<ReturnType<typeof fetchTeacherExamAttemptPage>>["results"][number];
type ResultsLeaderboardRow = Awaited<ReturnType<typeof fetchTeacherExamLeaderboard>>["results"][number];
type ResultsTopicRow = Awaited<ReturnType<typeof fetchTeacherTopicPerformance>>["results"][number];
type ResultsQuestionRow = Awaited<ReturnType<typeof fetchTeacherQuestionAnalysis>>["results"][number];

type ResultExamFilter =
  | "all"
  | "published"
  | "ready"
  | "review_blocked"
  | "high_risk"
  | "medium_risk"
  | "live"
  | "draft";
type ResultExamSort = "latest" | "attempts" | "average" | "release_risk" | "title";
type ResultExamGroup = "none" | "publication" | "status" | "release_risk";
type AttemptReviewFilter =
  | "all"
  | "low_performers"
  | "skipped_heavy"
  | "critical"
  | "watch"
  | "in_progress"
  | "auto_submitted";
type AttemptSort = "latest" | "score_low" | "warnings_high" | "time_long";
type AttemptGroup = "none" | "health" | "status";
type StudentQuestionFilter = "all" | "correct" | "wrong" | "skipped" | "marked" | "slow";
type WorkflowTone = "statusLive" | "statusDemo" | "statusWarning";

type FamilyInsightCard = {
  title: string;
  value: string;
  detail: string;
  tone: WorkflowTone;
};

type FamilyDeepDivePanel = {
  title: string;
  summary: string;
  tone: WorkflowTone;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  callouts: string[];
  actions: string[];
};

type ResultsQuestionAnalysisSummary = NonNullable<TeacherQuestionAnalysisPage["summary"]>;

type FamilyPortfolioCard = {
  familyCode: string;
  familyLabel: string;
  examCount: number;
  trackedExamCount: number;
  averagePercentage: number;
  highRiskCount: number;
  pendingReviewTasks: number;
  weakestExamTitle: string | null;
  weakestExamPercentage: number | null;
  strongestExamTitle: string | null;
  strongestExamPercentage: number | null;
  primaryConcern: string;
  tone: WorkflowTone;
};

type ResultWorkflowStep = {
  id: "lifecycle" | "generate" | "ranks" | "publish";
  title: string;
  statusLabel: string;
  tone: WorkflowTone;
  detail: string;
  helper: string;
  action:
    | {
        kind: "form";
        label: string;
        actionName: "mark-completed" | "generate" | "calculate_ranks" | "publish";
        variant: "buttonPrimary" | "buttonSecondary" | "buttonGhost";
        formAction:
          | typeof runResultsSummaryAction
          | typeof runResultsExamLifecycleAction;
      }
    | {
        kind: "link";
        label: string;
        href: string;
        variant: "buttonPrimary" | "buttonSecondary" | "buttonGhost";
      }
    | null;
  completed: boolean;
  blocked: boolean;
};

type ResultReadinessSnapshot = {
  headline: string;
  summary: string;
  blockers: string[];
  pendingDependencies: string[];
  readySignals: string[];
};

type ReadinessPanel = {
  title: string;
  summary: string;
  ready: boolean;
  blockerCount: number;
  warningCount: number;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  stats: string[];
};

type ResultsWorkspaceConfig = {
  role: ResultsWorkspaceRole;
  basePath: string;
  examBasePath: string;
  reviewsBasePath: string;
  questionBankPath: string;
  dashboardPath: string;
  workspaceName: string;
  roleNoun: string;
  roleNounLower: string;
  header: HeaderComponent;
};

const workspaceConfigs: Record<ResultsWorkspaceRole, ResultsWorkspaceConfig> = {
  institute: {
    role: "institute",
    basePath: "/institute/results",
    examBasePath: "/institute/exams",
    reviewsBasePath: "/institute/reviews",
    questionBankPath: "/institute/question-bank",
    dashboardPath: "/institute/dashboard",
    workspaceName: "Institute results workspace",
    roleNoun: "Institute",
    roleNounLower: "institute",
    header: InstitutePageHeader,
  },
  teacher: {
    role: "teacher",
    basePath: "/teacher/results",
    examBasePath: "/teacher/exams",
    reviewsBasePath: "/teacher/reviews",
    questionBankPath: "/teacher/question-bank",
    dashboardPath: "/teacher/dashboard",
    workspaceName: "Teacher results workspace",
    roleNoun: "Teacher",
    roleNounLower: "teacher",
    header: TeacherPageHeader,
  },
};

function getWorkspaceConfig(role: ResultsWorkspaceRole) {
  return workspaceConfigs[role];
}

async function requireResultsSession(role: ResultsWorkspaceRole) {
  if (role === "institute") {
    await requireInstituteAdminSession();
    return;
  }

  await requireTeacherSession();
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentage(value: string | number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "0%";
}

function reviewOptionText(value: string) {
  return value.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatDuration(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) {
    return "N/A";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatCompactSeconds(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "0s";
  }
  if (value < 60) {
    return `${Math.round(value)}s`;
  }
  return formatDuration(Math.round(value));
}

function formatHoursCompact(hours: number | null | undefined) {
  if (!hours || hours <= 0) {
    return "0h";
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function reviewRiskTone(level: TeacherResultSummary["review_release_risk"]["level"] | undefined): WorkflowTone {
  if (level === "high" || level === "medium") return "statusWarning";
  if (level === "low") return "statusDemo";
  return "statusLive";
}

function reviewRiskPriority(level: TeacherResultSummary["review_release_risk"]["level"] | undefined) {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function questionQualityTone(signal: ResultsQuestionRow["quality_signal"]) {
  if (signal === "skip_risk" || signal === "hard") return "statusWarning";
  if (signal === "ambiguous" || signal === "revision_candidate") return "statusDemo";
  if (signal === "healthy") return "statusLive";
  return "statusDemo";
}

function distractorTone(
  signal:
    | "validated_key"
    | "key_review"
    | "untested_distractor"
    | "weak_distractor"
    | "strong_distractor"
    | "working_distractor"
    | "light_distractor",
) {
  if (signal === "key_review" || signal === "weak_distractor") return "statusWarning";
  if (signal === "strong_distractor" || signal === "working_distractor") return "statusLive";
  if (signal === "validated_key") return "statusLive";
  return "statusDemo";
}

function assessmentFamilyTone(assessmentFamily: string | null | undefined) {
  if (assessmentFamily === "competitive") return "statusWarning";
  if (assessmentFamily === "certification") return "statusLive";
  if (assessmentFamily === "language_proficiency") return "statusDemo";
  return "statusLive";
}

function normalizeLabel(value: string | null | undefined) {
  return value?.replaceAll("_", " ") ?? "";
}

function resolveAssessmentAnalyticsLens(exam: ResultsExamCard) {
  const profile = exam.experience_profile;
  const familyCode = profile?.assessment_family ?? "general";
  const familyLabel = profile?.assessment_family_label ?? "General";
  const focusMap: Record<
    string,
    {
      summary: string;
      bankGuidance: string;
      focusAreas: [string, string, string];
    }
  > = {
    school: {
      summary:
        "Read the results for concept mastery, chapter coverage, and which learners need teacher intervention before the next classroom cycle.",
      bankGuidance:
        "Rewrite unclear classroom questions, rebalance chapter coverage, and use weak-topic clusters to plan remediation worksheets or reteaching sessions.",
      focusAreas: ["concept mastery", "topic coverage", "intervention groups"],
    },
    competitive: {
      summary:
        "Interpret the exam through speed, accuracy, negative-marking risk, and rank separation so coaching teams can improve strategy under pressure.",
      bankGuidance:
        "Tighten distractors, remove ambiguous stems, and focus on skip-versus-attempt behavior to improve speed-accuracy decision making.",
      focusAreas: ["speed vs accuracy", "rank spread", "negative-marking pressure"],
    },
    certification: {
      summary:
        "Use the results as a readiness signal for domain confidence, applied correctness, and whether the question bank mirrors certification-style judgment calls.",
      bankGuidance:
        "Strengthen domain scenario realism, review frequently missed distractors, and watch whether learners understand service selection rather than memorizing facts.",
      focusAreas: ["domain readiness", "scenario judgment", "distractor quality"],
    },
    language_proficiency: {
      summary:
        "Review outcomes as a skill-band lens across comprehension, response quality, and media-backed delivery expectations rather than only objective score totals.",
      bankGuidance:
        "Separate language-skill weaknesses, inspect rubric-backed responses carefully, and tune prompts, passages, and media flow for authentic proficiency practice.",
      focusAreas: ["skill bands", "rubric evidence", "media delivery readiness"],
    },
    general: {
      summary:
        "Use the results to compare learner accuracy, topic mastery, and question-level risk while keeping exam flow and review blockers in view.",
      bankGuidance:
        "Use hard-question patterns and skipped clusters to refine bank quality, clarify wording, and balance the next version of the exam.",
      focusAreas: ["accuracy", "topic mastery", "question risk"],
    },
  };
  const focus = focusMap[familyCode] ?? focusMap.general;
  return {
    familyCode,
    familyLabel,
    summary: focus.summary,
    bankGuidance: focus.bankGuidance,
    focusAreas: focus.focusAreas,
    deliveryModeLabel: normalizeLabel(profile?.delivery_mode) || normalizeLabel(exam.delivery_mode) || "standard",
    timerModeLabel: normalizeLabel(profile?.actual_timer_mode) || normalizeLabel(exam.timer_mode) || "standard",
    navigationModeLabel:
      normalizeLabel(profile?.actual_navigation_mode) || normalizeLabel(exam.navigation_mode) || "standard",
    creatorSummary: profile?.creator_summary ?? "",
    learnerSummary: profile?.learner_summary ?? "",
    deliveryEmphasis: normalizeLabel(profile?.delivery_emphasis) || "balanced delivery",
  };
}

function formatRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "0/0";
  }
  return `${numerator}/${denominator}`;
}

function buildAssessmentFamilyInsights(args: {
  familyCode: string;
  examAccuracy: number;
  examSkipRate: number;
  strongTopics: number;
  weakTopics: number;
  lowPerformers: number;
  skippedHeavyStudents: number;
  totalTopics: number;
  questionQualitySummary?: {
    revision_candidates: number;
    urgent_revision_candidates: number;
    high_skip_questions: number;
    hard_questions: number;
    healthy_questions: number;
    watch_questions: number;
    ambiguous_questions: number;
    emerging_questions: number;
  };
  examRubricSummary?: {
    reviewed_responses: number;
    weakest_criteria: Array<{
      criterion_label: string;
      average_percentage: number;
    }>;
  };
}): FamilyInsightCard[] {
  const {
    familyCode,
    examAccuracy,
    examSkipRate,
    strongTopics,
    weakTopics,
    lowPerformers,
    skippedHeavyStudents,
    totalTopics,
    questionQualitySummary,
    examRubricSummary,
  } = args;
  const quality = questionQualitySummary;
  const weakestCriterion = examRubricSummary?.weakest_criteria?.[0] ?? null;

  if (familyCode === "school") {
    return [
      {
        title: "Chapter mastery",
        value: formatRatio(strongTopics, totalTopics),
        detail: "Topics already performing at a stable mastery level in this exam window.",
        tone: strongTopics >= Math.max(totalTopics - weakTopics, 1) ? "statusLive" : "statusDemo",
      },
      {
        title: "Intervention group",
        value: String(lowPerformers),
        detail: "Learners currently sitting in the immediate teacher support lane.",
        tone: lowPerformers > 0 ? "statusWarning" : "statusLive",
      },
      {
        title: "Reteach pressure",
        value: String(weakTopics),
        detail: "Weak topics that likely need reteaching, worksheets, or revision homework.",
        tone: weakTopics > 0 ? "statusWarning" : "statusLive",
      },
    ];
  }

  if (familyCode === "competitive") {
    return [
      {
        title: "Accuracy under pressure",
        value: `${examAccuracy}%`,
        detail: "Use this with rank and negative-marking pressure to judge exam strategy quality.",
        tone: examAccuracy >= 65 ? "statusLive" : examAccuracy >= 45 ? "statusDemo" : "statusWarning",
      },
      {
        title: "Skip pressure",
        value: `${examSkipRate}%`,
        detail: "Higher skip rates often indicate time pressure, confidence gaps, or poor selection strategy.",
        tone: examSkipRate >= 30 ? "statusWarning" : examSkipRate >= 15 ? "statusDemo" : "statusLive",
      },
      {
        title: "Risk load",
        value: String((quality?.urgent_revision_candidates ?? 0) + (quality?.high_skip_questions ?? 0)),
        detail: "Urgent or skip-heavy questions that may distort readiness signals for rank-style practice.",
        tone: (quality?.urgent_revision_candidates ?? 0) + (quality?.high_skip_questions ?? 0) > 0 ? "statusWarning" : "statusLive",
      },
    ];
  }

  if (familyCode === "certification") {
    return [
      {
        title: "Domain readiness",
        value: formatRatio(strongTopics, totalTopics),
        detail: "Topic rows currently showing stronger domain mastery across the cohort.",
        tone: strongTopics >= Math.max(totalTopics - weakTopics, 1) ? "statusLive" : "statusDemo",
      },
      {
        title: "Scenario risk",
        value: String((quality?.hard_questions ?? 0) + (quality?.ambiguous_questions ?? 0)),
        detail: "Underperforming questions that may need clearer scenario framing or better distractor design.",
        tone: (quality?.hard_questions ?? 0) + (quality?.ambiguous_questions ?? 0) > 0 ? "statusWarning" : "statusLive",
      },
      {
        title: "Bank stability",
        value: formatRatio(quality?.healthy_questions ?? 0, Math.max((quality?.revision_candidates ?? 0) + (quality?.watch_questions ?? 0), 1)),
        detail: "Healthy questions versus revision or watch-list items in the current exam evidence.",
        tone: (quality?.healthy_questions ?? 0) >= (quality?.revision_candidates ?? 0) ? "statusLive" : "statusDemo",
      },
    ];
  }

  if (familyCode === "language_proficiency") {
    return [
      {
        title: "Rubric evidence",
        value: String(examRubricSummary?.reviewed_responses ?? 0),
        detail: "Reviewed responses contributing real criterion-level evidence to this exam.",
        tone: (examRubricSummary?.reviewed_responses ?? 0) > 0 ? "statusLive" : "statusDemo",
      },
      {
        title: "Weakest skill band",
        value: weakestCriterion ? `${weakestCriterion.criterion_label} ${weakestCriterion.average_percentage}%` : "Pending",
        detail: "Lowest rubric criterion or skill band currently visible in reviewed responses.",
        tone: weakestCriterion && weakestCriterion.average_percentage < 60 ? "statusWarning" : "statusDemo",
      },
      {
        title: "Response strain",
        value: String(skippedHeavyStudents),
        detail: "Students showing skip or completion strain that may reflect response burden or delivery friction.",
        tone: skippedHeavyStudents > 0 ? "statusWarning" : "statusLive",
      },
    ];
  }

  return [
    {
      title: "Accuracy",
      value: `${examAccuracy}%`,
      detail: "Overall correctness signal across the visible answer evidence.",
      tone: examAccuracy >= 65 ? "statusLive" : examAccuracy >= 45 ? "statusDemo" : "statusWarning",
    },
    {
      title: "Weak topics",
      value: String(weakTopics),
      detail: "Topics currently needing attention in the next teaching or builder cycle.",
      tone: weakTopics > 0 ? "statusWarning" : "statusLive",
    },
    {
      title: "Revision queue",
      value: String(questionQualitySummary?.revision_candidates ?? 0),
      detail: "Questions already showing enough evidence to justify editorial review.",
      tone: (questionQualitySummary?.revision_candidates ?? 0) > 0 ? "statusDemo" : "statusLive",
    },
  ];
}

function buildAssessmentFamilyDeepDive(args: {
  familyCode: string;
  selectedSummary: TeacherResultSummary | null;
  leaderboardRows: ResultsLeaderboardRow[];
  studentRows: ResultsAttempt[];
  topicRows: ResultsTopicRow[];
  questionQualitySummary?: ResultsQuestionAnalysisSummary["question_quality"];
  distractorQualitySummary?: ResultsQuestionAnalysisSummary["distractor_quality"];
  examRubricSummary?: ResultsQuestionAnalysisSummary["rubric"];
}): FamilyDeepDivePanel[] {
  const {
    familyCode,
    selectedSummary,
    leaderboardRows,
    studentRows,
    topicRows,
    questionQualitySummary,
    distractorQualitySummary,
    examRubricSummary,
  } = args;

  const scoreDistribution = selectedSummary?.score_distribution ?? [];
  const lowBandCount = scoreDistribution
    .filter((bucket) => bucket.max_percentage <= 40)
    .reduce((sum, bucket) => sum + bucket.count, 0);
  const strongBandCount = scoreDistribution
    .filter((bucket) => bucket.min_percentage >= 70)
    .reduce((sum, bucket) => sum + bucket.count, 0);
  const weakestSection =
    selectedSummary?.section_performance?.reduce((lowest, section) => {
      if (!lowest || section.accuracy_percentage < lowest.accuracy_percentage) {
        return section;
      }
      return lowest;
    }, null as TeacherResultSummary["section_performance"][number] | null) ?? null;
  const strongestTopic =
    topicRows.reduce((best, row) => {
      if (!best || Number(row.percentage) > Number(best.percentage)) {
        return row;
      }
      return best;
    }, null as ResultsTopicRow | null) ?? null;
  const weakestTopic =
    topicRows.reduce((worst, row) => {
      if (!worst || Number(row.percentage) < Number(worst.percentage)) {
        return row;
      }
      return worst;
    }, null as ResultsTopicRow | null) ?? null;
  const timedAttempts = studentRows.filter((attempt) => (attempt.time_taken_seconds ?? 0) > 0);
  const averageTimeTaken =
    timedAttempts.length > 0
      ? timedAttempts.reduce((sum, attempt) => sum + (attempt.time_taken_seconds ?? 0), 0) / timedAttempts.length
      : 0;
  const slowButAccurateCount = timedAttempts.filter(
    (attempt) =>
      Number(attempt.percentage) >= 60 && (attempt.time_taken_seconds ?? 0) > averageTimeTaken,
  ).length;
  const fastButErrorProneCount = timedAttempts.filter(
    (attempt) =>
      Number(attempt.percentage) < 50 && (attempt.time_taken_seconds ?? 0) > 0 && (attempt.time_taken_seconds ?? 0) < averageTimeTaken,
  ).length;
  const topRank = leaderboardRows[0] ?? null;
  const thirdRank = leaderboardRows[2] ?? leaderboardRows[leaderboardRows.length - 1] ?? null;
  const topRankGap =
    topRank && thirdRank
      ? Math.max(Number(topRank.percentage) - Number(thirdRank.percentage), 0)
      : 0;
  const strongestDistractor = distractorQualitySummary?.top_strong_distractors?.[0] ?? null;
  const weakestCriterion = examRubricSummary?.weakest_criteria?.[0] ?? null;

  if (familyCode === "school") {
    return [
      {
        title: "Chapter mastery spread",
        summary:
          "Use topic and section evidence to decide which chapters can move forward and which need reteaching before the next class cycle.",
        tone: lowBandCount > 0 || Number(weakestTopic?.percentage ?? 0) < 45 ? "statusWarning" : "statusLive",
        metrics: [
          { label: "Strong score bands", value: String(strongBandCount) },
          { label: "Intervention score bands", value: String(lowBandCount) },
          { label: "Weakest chapter", value: weakestTopic ? `${weakestTopic.topic_name || "Unmapped"} ${Math.round(Number(weakestTopic.percentage))}%` : "Pending" },
        ],
        callouts: [
          weakestSection
            ? `${weakestSection.section_name} is the weakest section at ${Math.round(weakestSection.accuracy_percentage)}% accuracy.`
            : "Section performance evidence will appear once attempt volume exists.",
          weakestTopic
            ? `${weakestTopic.topic_name || "Unmapped topic"} is the current reteach hotspot.`
            : "Topic-level mastery is still building.",
        ],
        actions: [
          "Create reteach worksheets for the weakest chapter before the next classroom cycle.",
          "Check whether weak sections reflect coverage gaps or only question wording issues.",
        ],
      },
      {
        title: "Intervention grouping",
        summary:
          "Separate the cohort into stable, watch, and urgent support lanes so teachers can act without reading every student individually.",
        tone: lowBandCount > 0 ? "statusWarning" : "statusDemo",
        metrics: [
          { label: "Low performers", value: String(studentRows.filter((attempt) => Number(attempt.percentage) < 40).length) },
          { label: "Skipped-heavy learners", value: String(studentRows.filter((attempt) => attempt.skipped_questions >= 2).length) },
          { label: "Cohort in view", value: String(studentRows.length) },
        ],
        callouts: [
          "Low-performing learners should move into teacher intervention or revision-homework lanes.",
          "Skipped-heavy learners often need confidence-building, pacing help, or simpler first-step prompts.",
        ],
        actions: [
          "Use the student explorer to isolate low performers and inspect question-wise evidence.",
          "Map skipped-heavy learners against the weakest topics before assigning remediation.",
        ],
      },
    ];
  }

  if (familyCode === "competitive") {
    return [
      {
        title: "Rank readiness",
        summary:
          "Judge whether the cohort is separating cleanly enough for rank-style practice and whether the top lane is truly outperforming the rest.",
        tone: topRankGap >= 10 ? "statusLive" : topRankGap >= 5 ? "statusDemo" : "statusWarning",
        metrics: [
          { label: "Top rank gap", value: `${Math.round(topRankGap)} pts` },
          { label: "Urgent revision items", value: String(questionQualitySummary?.urgent_revision_candidates ?? 0) },
          { label: "Skip-risk questions", value: String(questionQualitySummary?.high_skip_questions ?? 0) },
        ],
        callouts: [
          topRank
            ? `${topRank.student_name} is leading at ${Math.round(Number(topRank.percentage))}% in the visible leaderboard.`
            : "Leaderboard evidence will appear once ranked results exist.",
          "Weak rank separation often means the paper is not differentiating strategy and execution strongly enough.",
        ],
        actions: [
          "Review urgent and skip-risk questions before using this paper as a benchmark mock.",
          "Inspect whether top-rank separation is being blurred by ambiguous or overly easy items.",
        ],
      },
      {
        title: "Speed-pressure lane",
        summary:
          "Read time alongside accuracy to separate strategy issues from knowledge issues under test pressure.",
        tone: fastButErrorProneCount > 0 || (questionQualitySummary?.high_skip_questions ?? 0) > 0 ? "statusWarning" : "statusDemo",
        metrics: [
          { label: "Slow but accurate", value: String(slowButAccurateCount) },
          { label: "Fast but error-prone", value: String(fastButErrorProneCount) },
          { label: "Average completion time", value: formatCompactSeconds(averageTimeTaken) },
        ],
        callouts: [
          "Slow-but-accurate learners usually need pacing drills, not only concept revision.",
          "Fast-but-error-prone learners often need attempt selection discipline and negative-marking awareness.",
        ],
        actions: [
          "Use the student explorer to compare wrong-question patterns for fast-but-error-prone attempts.",
          "Retune paper order or distractor quality if skip pressure remains high across the cohort.",
        ],
      },
    ];
  }

  if (familyCode === "certification") {
    return [
      {
        title: "Domain confidence",
        summary:
          "Treat topic rows as domain-readiness signals and check whether the exam is surfacing true service-selection judgment instead of recall-only performance.",
        tone:
          weakestTopic && Number(weakestTopic.percentage) < 50 ? "statusWarning" : "statusLive",
        metrics: [
          { label: "Strongest domain", value: strongestTopic ? `${strongestTopic.topic_name || "Unmapped"} ${Math.round(Number(strongestTopic.percentage))}%` : "Pending" },
          { label: "Weakest domain", value: weakestTopic ? `${weakestTopic.topic_name || "Unmapped"} ${Math.round(Number(weakestTopic.percentage))}%` : "Pending" },
          { label: "Healthy bank items", value: String(questionQualitySummary?.healthy_questions ?? 0) },
        ],
        callouts: [
          strongestTopic
            ? `${strongestTopic.topic_name || "Unmapped topic"} currently shows the best readiness signal.`
            : "Topic evidence will strengthen once more attempts arrive.",
          weakestTopic
            ? `${weakestTopic.topic_name || "Unmapped topic"} needs domain reinforcement or clearer scenario framing.`
            : "Weak-domain evidence is still emerging.",
        ],
        actions: [
          "Use weak-domain topics to build follow-up labs, flashcards, or targeted practice sets.",
          "Review whether scenario wording is matching real certification-style tradeoff decisions.",
        ],
      },
      {
        title: "Scenario trap analysis",
        summary:
          "Strong distractors are useful only when they expose real misconceptions, not when they overshadow the keyed answer unfairly.",
        tone:
          (distractorQualitySummary?.strong_distractors ?? 0) > 0 ||
          (questionQualitySummary?.ambiguous_questions ?? 0) > 0
            ? "statusWarning"
            : "statusLive",
        metrics: [
          { label: "Strong distractors", value: String(distractorQualitySummary?.strong_distractors ?? 0) },
          { label: "Key-review options", value: String(distractorQualitySummary?.key_review_options ?? 0) },
          { label: "Ambiguous questions", value: String(questionQualitySummary?.ambiguous_questions ?? 0) },
        ],
        callouts: [
          strongestDistractor
            ? `Top misconception trap: ${strongestDistractor.option_text_summary}.`
            : "No strong distractor hotspot is standing out yet.",
          "Certification practice should reward judgment clarity, not confusion caused by weak answer-key separation.",
        ],
        actions: [
          "Open the bank and revise high-pressure distractors that are trapping too many learners.",
          "Recheck keyed answers on any question flagged for key review or ambiguity.",
        ],
      },
    ];
  }

  if (familyCode === "language_proficiency") {
    return [
      {
        title: "Skill-band evidence",
        summary:
          "Interpret performance through rubric-backed skill bands first, then use objective accuracy as supporting evidence rather than the whole story.",
        tone:
          weakestCriterion && weakestCriterion.average_percentage < 60 ? "statusWarning" : "statusDemo",
        metrics: [
          { label: "Reviewed responses", value: String(examRubricSummary?.reviewed_responses ?? 0) },
          { label: "Tracked criteria", value: String(examRubricSummary?.criteria_count ?? 0) },
          { label: "Weakest skill band", value: weakestCriterion ? `${weakestCriterion.criterion_label} ${weakestCriterion.average_percentage}%` : "Pending" },
        ],
        callouts: [
          weakestCriterion
            ? `${weakestCriterion.criterion_label} is the weakest visible criterion in reviewed responses.`
            : "Rubric-backed evidence will appear once manual evaluation data accumulates.",
          "Language outcomes should be read as evidence quality, not only answer correctness totals.",
        ],
        actions: [
          "Inspect rubric-scored responses before drawing conclusions from objective sections alone.",
          "Use the weakest criterion to plan speaking, writing, or reading-feedback interventions.",
        ],
      },
      {
        title: "Response burden and review flow",
        summary:
          "Check whether learners are straining against prompt load or whether the review pipeline is still too shallow to support confident proficiency reporting.",
        tone:
          (selectedSummary?.pending_review_tasks_count ?? 0) > 0 ||
          studentRows.filter((attempt) => attempt.skipped_questions >= 2).length > 0
            ? "statusWarning"
            : "statusDemo",
        metrics: [
          { label: "Pending review tasks", value: String(selectedSummary?.pending_review_tasks_count ?? 0) },
          { label: "Recheck tasks", value: String(selectedSummary?.recheck_review_tasks_count ?? 0) },
          { label: "Skipped-heavy learners", value: String(studentRows.filter((attempt) => attempt.skipped_questions >= 2).length) },
        ],
        callouts: [
          "Pending or recheck-heavy review queues weaken confidence in language proficiency reporting.",
          "Skipped-heavy learners may be facing response fatigue, prompt overload, or delivery friction.",
        ],
        actions: [
          "Review response formats, passage load, and manual-evaluation turnaround together.",
          "Prioritize rubric completion before using the exam as a strong proficiency benchmark.",
        ],
      },
    ];
  }

  return [
    {
      title: "Performance shape",
      summary:
        "Use the shared analytics lens to compare score distribution, topic pressure, and question risk before deciding what to fix first.",
      tone: lowBandCount > 0 ? "statusDemo" : "statusLive",
      metrics: [
        { label: "Strong score bands", value: String(strongBandCount) },
        { label: "Low score bands", value: String(lowBandCount) },
        { label: "Weakest topic", value: weakestTopic ? weakestTopic.topic_name || "Unmapped" : "Pending" },
      ],
      callouts: [
        weakestSection
          ? `${weakestSection.section_name} is the weakest section right now.`
          : "Section evidence is still building.",
        "Use question risk, topic weakness, and student explorer together before revising the exam.",
      ],
      actions: [
        "Start with high-risk questions and then validate whether the same topic weakness repeats at learner level.",
        "Use the bank action queue to decide whether the next step is revision, reteaching, or monitoring.",
      ],
    },
  ];
}

function buildFamilyPortfolioCards(
  resultExamCards: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>,
): FamilyPortfolioCard[] {
  const familyMap = new Map<
    string,
    {
      familyCode: string;
      familyLabel: string;
      examCount: number;
      trackedExamCount: number;
      averagePercentageTotal: number;
      highRiskCount: number;
      pendingReviewTasks: number;
      weakestExamTitle: string | null;
      weakestExamPercentage: number | null;
      strongestExamTitle: string | null;
      strongestExamPercentage: number | null;
    }
  >();

  for (const item of resultExamCards) {
    const familyCode = item.exam.experience_profile?.assessment_family ?? "general";
    const familyLabel = item.exam.experience_profile?.assessment_family_label ?? "General";
    const current =
      familyMap.get(familyCode) ??
      {
        familyCode,
        familyLabel,
        examCount: 0,
        trackedExamCount: 0,
        averagePercentageTotal: 0,
        highRiskCount: 0,
        pendingReviewTasks: 0,
        weakestExamTitle: null,
        weakestExamPercentage: null,
        strongestExamTitle: null,
        strongestExamPercentage: null,
      };

    current.examCount += 1;
    if (item.summary) {
      const averagePercentage = Number(item.summary.average_percentage);
      current.trackedExamCount += 1;
      current.averagePercentageTotal += Number.isFinite(averagePercentage) ? averagePercentage : 0;
      current.pendingReviewTasks += item.summary.pending_review_tasks_count ?? 0;
      if (item.summary.review_release_risk?.level === "high") {
        current.highRiskCount += 1;
      }
      if (
        current.weakestExamPercentage === null ||
        averagePercentage < current.weakestExamPercentage
      ) {
        current.weakestExamTitle = item.exam.title;
        current.weakestExamPercentage = averagePercentage;
      }
      if (
        current.strongestExamPercentage === null ||
        averagePercentage > current.strongestExamPercentage
      ) {
        current.strongestExamTitle = item.exam.title;
        current.strongestExamPercentage = averagePercentage;
      }
    }

    familyMap.set(familyCode, current);
  }

  return Array.from(familyMap.values())
    .map((item) => {
      const averagePercentage =
        item.trackedExamCount > 0 ? Math.round(item.averagePercentageTotal / item.trackedExamCount) : 0;
      const tone: WorkflowTone =
        item.highRiskCount > 0
          ? "statusWarning"
          : averagePercentage >= 65
            ? "statusLive"
            : averagePercentage >= 45
              ? "statusDemo"
              : "statusWarning";
      const primaryConcern =
        item.highRiskCount > 0
          ? `${item.highRiskCount} high-risk exam${item.highRiskCount === 1 ? "" : "s"} in this family need release attention.`
          : item.pendingReviewTasks > 0
            ? `${item.pendingReviewTasks} pending review task${item.pendingReviewTasks === 1 ? "" : "s"} are still open in this family.`
            : item.weakestExamTitle
              ? `${item.weakestExamTitle} is the weakest visible exam in this family.`
              : "Live summary coverage is still building for this family.";

      return {
        familyCode: item.familyCode,
        familyLabel: item.familyLabel,
        examCount: item.examCount,
        trackedExamCount: item.trackedExamCount,
        averagePercentage,
        highRiskCount: item.highRiskCount,
        pendingReviewTasks: item.pendingReviewTasks,
        weakestExamTitle: item.weakestExamTitle,
        weakestExamPercentage: item.weakestExamPercentage,
        strongestExamTitle: item.strongestExamTitle,
        strongestExamPercentage: item.strongestExamPercentage,
        primaryConcern,
        tone,
      };
    })
    .sort((left, right) => {
      if (right.highRiskCount !== left.highRiskCount) {
        return right.highRiskCount - left.highRiskCount;
      }
      if (left.averagePercentage !== right.averagePercentage) {
        return left.averagePercentage - right.averagePercentage;
      }
      return left.familyLabel.localeCompare(right.familyLabel);
    });
}

function isManualReviewRow(row: {
  evaluation_status: string;
  question_type: string;
}) {
  return (
    row.evaluation_status === "manual_pending" ||
    row.evaluation_status === "manual_reviewed" ||
    row.question_type === "essay_manual_review"
  );
}

function manualReviewStatusLabel(status: string) {
  if (status === "manual_reviewed") return "Manually reviewed";
  if (status === "manual_pending") return "Manual review pending";
  return "Awaiting manual review";
}

function manualReviewStatusTone(status: string) {
  if (status === "manual_reviewed") return "statusLive";
  if (status === "manual_pending") return "statusWarning";
  return "statusDemo";
}

function attemptTone(alertSeverity: string | undefined) {
  if (alertSeverity === "high") return "statusWarning";
  if (alertSeverity === "medium") return "statusDemo";
  return "statusLive";
}

function recommendedAction(
  attempt: {
    status: string;
    can_force_submit: boolean;
    is_auto_submitted: boolean;
    integrity_summary: {
      threshold_reached: boolean;
      violation_count: number;
      remaining_before_action: number | null;
    };
    alerts: Array<{ severity: string }>;
  },
  roleNounLower: string,
) {
  if (attempt.is_auto_submitted) {
    return "Review the auto-submitted attempt and record whether the integrity action was expected.";
  }
  if (attempt.integrity_summary.threshold_reached) {
    return attempt.can_force_submit
      ? "Inspect immediately and decide whether to force-submit before the student continues."
      : "Inspect immediately and review why the attempt is still active despite threshold pressure.";
  }
  if (attempt.alerts.some((alert) => alert.severity === "high")) {
    return attempt.can_force_submit
      ? "Contact or inspect the student now. Force-submit is available if the exam policy must be enforced."
      : "Inspect the attempt now and verify whether the student can continue safely.";
  }
  if (attempt.integrity_summary.violation_count > 0) {
    return `Monitor closely. ${
      attempt.integrity_summary.remaining_before_action ?? 0
    } warning slots remain before automatic action.`;
  }
  if (attempt.status === "in_progress") {
    return "Keep this attempt visible in routine monitoring until it is submitted.";
  }
  return `No urgent ${roleNounLower} action is suggested from the current live signals.`;
}

function followUpLabel(attempt: {
  can_force_submit: boolean;
  is_auto_submitted: boolean;
  integrity_summary: { threshold_reached: boolean };
}) {
  if (attempt.is_auto_submitted) return "Post-event review";
  if (attempt.integrity_summary.threshold_reached) return "Immediate intervention";
  if (attempt.can_force_submit) return "Force-submit available";
  return "Observe and document";
}

function accommodationLabel(attempt: {
  accommodation_snapshot: {
    has_accommodations: boolean;
    applied_extra_time_minutes: number;
    additional_violation_allowance: number;
    simplified_warning_copy: boolean;
    alternative_instructions: string;
  };
}) {
  if (!attempt.accommodation_snapshot.has_accommodations) return "Standard rules";
  if (attempt.accommodation_snapshot.applied_extra_time_minutes > 0) {
    return `+${attempt.accommodation_snapshot.applied_extra_time_minutes} min support`;
  }
  if (attempt.accommodation_snapshot.additional_violation_allowance > 0) {
    return `+${attempt.accommodation_snapshot.additional_violation_allowance} warning allowance`;
  }
  if (attempt.accommodation_snapshot.simplified_warning_copy) return "Simplified warning copy";
  if (attempt.accommodation_snapshot.alternative_instructions) return "Alternative instructions";
  return "Accommodation active";
}

function evaluatedCount(totalPassed: number, totalFailed: number) {
  return totalPassed + totalFailed;
}

function pendingCount(totalAttempted: number, totalPassed: number, totalFailed: number) {
  return Math.max(totalAttempted - evaluatedCount(totalPassed, totalFailed), 0);
}

function resultReadinessState(args: {
  selectedSummary: TeacherResultSummary | null;
  resultsPublished: boolean;
  canPublishResults: boolean;
}) {
  if (!args.selectedSummary) {
    return {
      label: "No summary",
      note: "Generate results after learner submissions exist.",
      tone: "statusDemo",
    };
  }

  if (args.resultsPublished) {
    return {
      label: "Published",
      note: "Student-visible result state is already active.",
      tone: "statusLive",
    };
  }

  if ((args.selectedSummary.pending_review_tasks_count ?? 0) > 0) {
    const pendingCount = args.selectedSummary.pending_review_tasks_count ?? 0;
    const reviewRisk = args.selectedSummary.review_release_risk;
    return {
      label:
        reviewRisk?.level === "high"
          ? "High release risk"
          : reviewRisk?.level === "medium"
            ? "Medium release risk"
            : "Blocked by review queue",
      note: reviewRisk?.summary
        ? `${reviewRisk.summary} ${pendingCount} manual review task${pendingCount === 1 ? "" : "s"} remain unresolved.`
        : `${pendingCount} manual review task${pendingCount === 1 ? "" : "s"} must be resolved before results can be published.`,
      tone: reviewRiskTone(reviewRisk?.level),
    };
  }

  if (!args.canPublishResults) {
    return {
      label: "Awaiting exam completion",
      note: "Summary exists, but the exam lifecycle must be completed before publication.",
      tone: "statusWarning",
    };
  }

  return {
    label: "Ready to publish",
    note: "Summary and lifecycle state are aligned for publication.",
    tone: "statusLive",
  };
}

function buildResultReadinessSnapshot(args: {
  selectedSummary: TeacherResultSummary | null;
  resultsPublished: boolean;
  canPublishResults: boolean;
  attemptsCount: number;
  evaluatedResults: number;
  rankedLeaderboardReady: boolean;
  selectedPendingCount: number;
}) {
  const {
    selectedSummary,
    resultsPublished,
    canPublishResults,
    attemptsCount,
    evaluatedResults,
    rankedLeaderboardReady,
    selectedPendingCount,
  } = args;
  const blockers: string[] = [];
  const pendingDependencies: string[] = [];
  const readySignals: string[] = [];

  if (attemptsCount > 0) {
    readySignals.push(`${attemptsCount} submitted attempt${attemptsCount === 1 ? "" : "s"} found.`);
  } else {
    blockers.push("No submitted attempts are available yet.");
  }

  if (selectedSummary) {
    readySignals.push("Result summary already exists for this exam.");
  } else {
    blockers.push("Result summary has not been generated yet.");
  }

  if (evaluatedResults > 0) {
    readySignals.push(`${evaluatedResults} evaluated result${evaluatedResults === 1 ? "" : "s"} available.`);
  } else if (selectedSummary) {
    pendingDependencies.push("Summary exists, but evaluated results are still not visible.");
  }

  if (rankedLeaderboardReady) {
    readySignals.push("Leaderboard ranks are already calculated.");
  } else if (selectedSummary) {
    pendingDependencies.push("Ranks have not been calculated yet.");
  }

  const pendingReviewTasks = selectedSummary?.pending_review_tasks_count ?? 0;
  const recheckReviewTasks = selectedSummary?.recheck_review_tasks_count ?? 0;
  const reviewRisk = selectedSummary?.review_release_risk;
  if (pendingReviewTasks > 0) {
    blockers.push(
      `${pendingReviewTasks} manual review task${pendingReviewTasks === 1 ? "" : "s"} still block publication.`,
    );
    if (reviewRisk?.level && reviewRisk.level !== "none") {
      pendingDependencies.push(
        `${reviewRisk.label} · oldest unresolved work is ${formatHoursCompact(reviewRisk.oldest_open_hours)} old.`,
      );
    }
  } else if (selectedSummary) {
    readySignals.push("No manual review tasks are blocking publication.");
  }

  if (recheckReviewTasks > 0) {
    pendingDependencies.push(
      `${recheckReviewTasks} recheck task${recheckReviewTasks === 1 ? "" : "s"} still need closure.`,
    );
  }

  if (canPublishResults) {
    readySignals.push("Exam lifecycle is already completed.");
  } else {
    blockers.push("Exam lifecycle is not completed yet.");
  }

  if (selectedPendingCount > 0) {
    pendingDependencies.push(
      `${selectedPendingCount} submission${selectedPendingCount === 1 ? "" : "s"} still sit outside passed or failed outcomes.`,
    );
  }

  if (resultsPublished) {
    readySignals.push("Student-visible publication is already active.");
  }

  let headline = "Blocked";
  let summary = "Resolve the blockers below before publishing results.";

  if (resultsPublished) {
    headline = "Published";
    summary = "This exam has already crossed the publication line and is visible to students.";
  } else if (blockers.length === 0 && pendingDependencies.length === 0) {
    headline = "Ready to publish";
    summary = "Lifecycle, summary, evaluation, and review states are aligned for publication.";
  } else if (blockers.length === 0) {
    headline = "Almost ready";
    summary = "No hard blocker remains, but a few operational steps are still worth finishing first.";
  }

  return {
    headline,
    summary,
    blockers,
    pendingDependencies,
    readySignals,
  };
}

function buildReadinessPanel(args: {
  title: string;
  ready: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  summary: string;
  stats?: string[];
}): ReadinessPanel {
  return {
    title: args.title,
    summary: args.summary,
    ready: args.ready,
    blockerCount: args.blockers.length,
    warningCount: args.warnings.length,
    blockers: args.blockers,
    warnings: args.warnings,
    stats: args.stats ?? [],
  };
}

function examPublicationState(summary: TeacherResultSummary | null) {
  if (!summary) return { label: "No summary", tone: "statusWarning" };
  if (summary.results_published) return { label: "Published", tone: "statusLive" };
  if (summary.review_blocked) return { label: "Review blocked", tone: "statusWarning" };
  if (summary.published_results_count > 0) return { label: "Partially published", tone: "statusDemo" };
  return { label: "Summary ready", tone: "statusDemo" };
}

function resolveExamFilter(value?: string): ResultExamFilter {
  switch (value) {
    case "published":
    case "ready":
    case "review_blocked":
    case "high_risk":
    case "medium_risk":
    case "live":
    case "draft":
      return value;
    default:
      return "all";
  }
}

function resolveExamSort(value?: string): ResultExamSort {
  switch (value) {
    case "attempts":
    case "average":
    case "release_risk":
    case "title":
      return value;
    default:
      return "latest";
  }
}

function resolveExamGroup(value?: string): ResultExamGroup {
  switch (value) {
    case "publication":
    case "release_risk":
    case "status":
      return value;
    default:
      return "none";
  }
}

function resolveAttemptFilter(value?: string): AttemptReviewFilter {
  switch (value) {
    case "low_performers":
    case "skipped_heavy":
    case "critical":
    case "watch":
    case "in_progress":
    case "auto_submitted":
      return value;
    default:
      return "all";
  }
}

function resolveAttemptSort(value?: string): AttemptSort {
  switch (value) {
    case "score_low":
    case "warnings_high":
    case "time_long":
      return value;
    default:
      return "latest";
  }
}

function resolveAttemptGroup(value?: string): AttemptGroup {
  switch (value) {
    case "health":
    case "status":
      return value;
    default:
      return "none";
  }
}

function resolveStudentQuestionFilter(value?: string): StudentQuestionFilter {
  switch (value) {
    case "correct":
    case "wrong":
    case "skipped":
    case "marked":
    case "slow":
      return value;
    default:
      return "all";
  }
}

function resultsViewPath(basePath: string, view: ResultsWorkspaceView) {
  if (view === "overview") return basePath;
  return `${basePath}/${view}`;
}

function buildResultsHref(
  path: string,
  args: {
    examId?: string;
    attemptId?: string | null;
    attemptFilter?: AttemptReviewFilter;
    attemptSort?: AttemptSort;
    attemptGroup?: AttemptGroup;
    attemptPage?: number;
    attemptPageSize?: number;
    questionFilter?: string;
    examListFilter?: ResultExamFilter;
    examListSort?: ResultExamSort;
    examListGroup?: ResultExamGroup;
    examPage?: number;
    examPageSize?: number;
    leaderboardPage?: number;
    leaderboardPageSize?: number;
    topicPage?: number;
    topicPageSize?: number;
    questionPage?: number;
    questionPageSize?: number;
    studentQuestionFilter?: StudentQuestionFilter;
    studentQuestionSearch?: string;
    error?: string;
    message?: string;
  },
) {
  return buildFilterHref(path, [
    ["exam", args.examId],
    ["attempt", args.attemptId ?? undefined],
    ["attempt_filter", args.attemptFilter, "all"],
    ["attempt_sort", args.attemptSort, "latest"],
    ["attempt_group", args.attemptGroup, "none"],
    ["attempt_page", args.attemptPage ? String(args.attemptPage) : undefined, "1"],
    ["attempt_page_size", args.attemptPageSize ? String(args.attemptPageSize) : undefined, "12"],
    ["question_filter", args.questionFilter, "all"],
    ["exam_list_filter", args.examListFilter, "all"],
    ["exam_list_sort", args.examListSort, "latest"],
    ["exam_list_group", args.examListGroup, "none"],
    ["exam_page", args.examPage ? String(args.examPage) : undefined, "1"],
    ["exam_page_size", args.examPageSize ? String(args.examPageSize) : undefined, "10"],
    ["leaderboard_page", args.leaderboardPage ? String(args.leaderboardPage) : undefined, "1"],
    ["leaderboard_page_size", args.leaderboardPageSize ? String(args.leaderboardPageSize) : undefined, "6"],
    ["topic_page", args.topicPage ? String(args.topicPage) : undefined, "1"],
    ["topic_page_size", args.topicPageSize ? String(args.topicPageSize) : undefined, "6"],
    ["question_page", args.questionPage ? String(args.questionPage) : undefined, "1"],
    ["question_page_size", args.questionPageSize ? String(args.questionPageSize) : undefined, "6"],
    ["student_question_filter", args.studentQuestionFilter, "all"],
    ["student_question_search", args.studentQuestionSearch],
    ["error", args.error],
    ["message", args.message],
  ]);
}

function filterResultExamCards(
  cards: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>,
  filter: ResultExamFilter,
) {
  return cards.filter(({ exam, summary }) => {
    switch (filter) {
      case "published":
        return Boolean(summary?.results_published);
      case "ready":
        return Boolean(summary) && summary?.results_published !== true;
      case "review_blocked":
        return Boolean(summary?.review_blocked);
      case "high_risk":
        return summary?.review_release_risk?.level === "high";
      case "medium_risk":
        return summary?.review_release_risk?.level === "medium";
      case "live":
        return exam.status === "live";
      case "draft":
        return exam.status === "draft";
      default:
        return true;
    }
  });
}

function sortResultExamCards(
  cards: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>,
  sortBy: ResultExamSort,
) {
  const sortable = [...cards];
  sortable.sort((left, right) => {
    switch (sortBy) {
      case "attempts":
        return (right.summary?.total_attempted ?? 0) - (left.summary?.total_attempted ?? 0);
      case "average":
        return Number(right.summary?.average_percentage ?? 0) - Number(left.summary?.average_percentage ?? 0);
      case "release_risk": {
        const riskDelta =
          reviewRiskPriority(right.summary?.review_release_risk?.level) -
          reviewRiskPriority(left.summary?.review_release_risk?.level);
        if (riskDelta !== 0) return riskDelta;
        return (right.summary?.pending_review_tasks_count ?? 0) - (left.summary?.pending_review_tasks_count ?? 0);
      }
      case "title":
        return left.exam.title.localeCompare(right.exam.title);
      case "latest":
      default: {
        const leftTime = Date.parse(left.summary?.last_calculated_at ?? left.exam.updated_at);
        const rightTime = Date.parse(right.summary?.last_calculated_at ?? right.exam.updated_at);
        return rightTime - leftTime;
      }
    }
  });
  return sortable;
}

function buildResultExamGroupLabel(
  card: { exam: ResultsExamCard; summary: TeacherResultSummary | null },
  groupBy: ResultExamGroup,
) {
  if (groupBy === "publication") return examPublicationState(card.summary).label;
  if (groupBy === "release_risk") return card.summary?.review_release_risk?.label ?? "No review risk";
  if (groupBy === "status") return card.exam.status.replaceAll("_", " ");
  return "Exams";
}

function groupResultExamCards(
  cards: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>,
  groupBy: ResultExamGroup,
) {
  if (groupBy === "none") return [{ label: "All exams", items: cards }];
  const buckets = new Map<string, Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>>();
  for (const card of cards) {
    const label = buildResultExamGroupLabel(card, groupBy);
    buckets.set(label, [...(buckets.get(label) ?? []), card]);
  }
  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function groupAttempts(attempts: ResultsAttempt[], groupBy: AttemptGroup) {
  if (groupBy === "none") return [{ label: "All attempts", items: attempts }];
  const buckets = new Map<string, ResultsAttempt[]>();
  for (const attempt of attempts) {
    const label =
      groupBy === "health" ? healthLabel(attemptHealth(attempt)) : attempt.status.replaceAll("_", " ");
    buckets.set(label, [...(buckets.get(label) ?? []), attempt]);
  }
  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

function buildResultWorkflow(args: {
  selectedExamId: string;
  selectedSummary: TeacherResultSummary | null;
  examLifecycleStatus: string;
  canMarkCompleted: boolean;
  canPublishResults: boolean;
  resultsPublished: boolean;
  attemptsCount: number;
  evaluatedResults: number;
  rankedLeaderboardReady: boolean;
  examBasePath: string;
  reviewsBasePath: string;
}) {
  const {
    selectedExamId,
    selectedSummary,
    examLifecycleStatus,
    canMarkCompleted,
    canPublishResults,
    resultsPublished,
    attemptsCount,
    evaluatedResults,
    rankedLeaderboardReady,
    examBasePath,
    reviewsBasePath,
  } = args;

  const examHref = `${examBasePath}/${selectedExamId}`;
  const pendingReviewTasks = selectedSummary?.pending_review_tasks_count ?? 0;
  const recheckReviewTasks = selectedSummary?.recheck_review_tasks_count ?? 0;
  const reviewRisk = selectedSummary?.review_release_risk;

  const lifecycleStep: ResultWorkflowStep = canPublishResults
    ? {
        id: "lifecycle",
        title: "Finish exam lifecycle",
        statusLabel: "Completed",
        tone: "statusLive",
        detail: "The exam is already in completed state, so publication rules can proceed from this screen.",
        helper: "No lifecycle blocker remains for result publishing.",
        action: null,
        completed: true,
        blocked: false,
      }
    : canMarkCompleted
      ? {
          id: "lifecycle",
          title: "Finish exam lifecycle",
          statusLabel: "Ready now",
          tone: "statusWarning",
          detail: `The exam is currently ${examLifecycleStatus.replaceAll("_", " ")}. Mark it completed once learner activity is finished.`,
          helper: "Publication will stay blocked until this step is done.",
          action: {
            kind: "form",
            label: "Mark Exam Completed",
            actionName: "mark-completed",
            variant: "buttonPrimary",
            formAction: runResultsExamLifecycleAction,
          },
          completed: false,
          blocked: false,
        }
      : {
          id: "lifecycle",
          title: "Finish exam lifecycle",
          statusLabel: "Review in exam page",
          tone: "statusDemo",
          detail: `The exam is currently ${examLifecycleStatus.replaceAll("_", " ")}. Move the lifecycle forward from the exam workspace before publishing results.`,
          helper: "This screen cannot complete the lifecycle from the current state.",
          action: {
            kind: "link",
            label: "Open Exam Lifecycle",
            href: examHref,
            variant: "buttonSecondary",
          },
          completed: false,
          blocked: true,
        };

  const generateStep: ResultWorkflowStep = selectedSummary
    ? {
        id: "generate",
        title: "Generate result summary",
        statusLabel: "Summary ready",
        tone: "statusLive",
        detail: "A result summary already exists for this exam and is powering the metrics on this page.",
        helper: "Run generation again only when new submissions or score changes need a refresh.",
        action: {
          kind: "form",
          label: "Regenerate Summary",
          actionName: "generate",
          variant: "buttonGhost",
          formAction: runResultsSummaryAction,
        },
        completed: true,
        blocked: false,
      }
    : attemptsCount > 0
      ? {
          id: "generate",
          title: "Generate result summary",
          statusLabel: "Ready now",
          tone: "statusWarning",
          detail: `${attemptsCount} submitted attempt${attemptsCount === 1 ? "" : "s"} found. Generate the summary to populate result metrics and downstream actions.`,
          helper: "This is the first required result step once submissions exist.",
          action: {
            kind: "form",
            label: "Generate Results",
            actionName: "generate",
            variant: "buttonPrimary",
            formAction: runResultsSummaryAction,
          },
          completed: false,
          blocked: false,
        }
      : {
          id: "generate",
          title: "Generate result summary",
          statusLabel: "Waiting for submissions",
          tone: "statusDemo",
          detail: "No attempt records were returned for this exam yet, so there is nothing meaningful to summarize.",
          helper: "Ask learners to submit attempts first, then return here to generate results.",
          action: {
            kind: "link",
            label: "Open Exam",
            href: examHref,
            variant: "buttonSecondary",
          },
          completed: false,
          blocked: true,
        };

  const ranksStep: ResultWorkflowStep = !selectedSummary
    ? {
        id: "ranks",
        title: "Calculate ranks",
        statusLabel: "Blocked",
        tone: "statusDemo",
        detail: "Ranks depend on the result summary. Generate results first so ranked comparisons have source data.",
        helper: "This step unlocks after summary generation.",
        action: null,
        completed: false,
        blocked: true,
      }
    : rankedLeaderboardReady
      ? {
          id: "ranks",
          title: "Calculate ranks",
          statusLabel: "Ranks ready",
          tone: "statusLive",
          detail: "Leaderboard rows already contain rank values for the current exam scope.",
          helper: "Recalculate only after new summary data or score updates are introduced.",
          action: {
            kind: "form",
            label: "Recalculate Ranks",
            actionName: "calculate_ranks",
            variant: "buttonGhost",
            formAction: runResultsSummaryAction,
          },
          completed: true,
          blocked: false,
        }
      : evaluatedResults > 0
        ? {
            id: "ranks",
            title: "Calculate ranks",
            statusLabel: "Ready now",
            tone: "statusWarning",
            detail: `${evaluatedResults} evaluated result${evaluatedResults === 1 ? "" : "s"} available. Calculate ranks to prepare leaderboard ordering before publication.`,
            helper: "Do this after summary generation and before final publication.",
            action: {
              kind: "form",
              label: "Calculate Ranks",
              actionName: "calculate_ranks",
              variant: "buttonSecondary",
              formAction: runResultsSummaryAction,
            },
            completed: false,
            blocked: false,
          }
        : {
            id: "ranks",
            title: "Calculate ranks",
            statusLabel: "Waiting for evaluated results",
            tone: "statusDemo",
            detail: "A summary exists, but no evaluated results are visible yet for reliable ranking output.",
            helper: "Review summary generation or student attempt state before ranking.",
            action: null,
            completed: false,
            blocked: true,
          };

  const publishStep: ResultWorkflowStep = resultsPublished
    ? {
        id: "publish",
        title: "Publish results",
        statusLabel: "Published",
        tone: "statusLive",
        detail: "Results are already student-visible for this exam.",
        helper: "Use refresh or regeneration only if post-publication correction workflows are required.",
        action: null,
        completed: true,
        blocked: false,
      }
    : !selectedSummary
      ? {
          id: "publish",
          title: "Publish results",
          statusLabel: "Blocked",
          tone: "statusDemo",
          detail: "Publication is unavailable because no result summary exists yet.",
          helper: "Generate the result summary first.",
          action: null,
          completed: false,
          blocked: true,
        }
      : pendingReviewTasks > 0
        ? {
            id: "publish",
            title: "Publish results",
            statusLabel:
              reviewRisk?.level === "high"
                ? "High release risk"
                : recheckReviewTasks > 0
                  ? "Blocked by recheck"
                  : "Blocked by review queue",
            tone: reviewRiskTone(reviewRisk?.level),
            detail: `${pendingReviewTasks} unresolved manual review task${
              pendingReviewTasks === 1 ? "" : "s"
            } still protect this exam from publication.${recheckReviewTasks > 0 ? ` ${recheckReviewTasks} task${recheckReviewTasks === 1 ? " is" : "s are"} waiting on recheck.` : ""}${
              reviewRisk && reviewRisk.level !== "none"
                ? ` ${reviewRisk.summary} Oldest unresolved work is ${formatHoursCompact(reviewRisk.oldest_open_hours)} old.`
                : ""
            }`,
            helper:
              reviewRisk?.level === "high"
                ? "Clear the oldest or recheck-heavy review tasks first, then return here to publish confidently."
                : "Resolve review tasks in the review queue first, then return here to publish confidently.",
            action: {
              kind: "link",
              label: "Open Review Queue",
              href: reviewsBasePath,
              variant: "buttonSecondary",
            },
            completed: false,
            blocked: true,
          }
      : !canPublishResults
        ? {
            id: "publish",
            title: "Publish results",
            statusLabel: "Blocked by lifecycle",
            tone: "statusWarning",
            detail: "The summary exists, but the exam itself is not completed yet, so publication remains intentionally locked.",
            helper: "Finish the exam lifecycle first, then publish from this screen.",
            action: {
              kind: "link",
              label: "Finish Lifecycle",
              href: examHref,
              variant: "buttonSecondary",
            },
            completed: false,
            blocked: true,
          }
        : evaluatedResults > 0
          ? {
              id: "publish",
              title: "Publish results",
              statusLabel: "Ready now",
              tone: "statusWarning",
              detail: "Summary data and completed lifecycle state are aligned. You can now publish student-visible results.",
              helper: "Make this the final step after checking summary and ranking readiness.",
              action: {
                kind: "form",
                label: "Publish Results",
                actionName: "publish",
                variant: "buttonPrimary",
                formAction: runResultsSummaryAction,
              },
              completed: false,
              blocked: false,
            }
          : {
              id: "publish",
              title: "Publish results",
              statusLabel: "Waiting for evaluated results",
              tone: "statusDemo",
              detail: "The exam is completed, but there are still no evaluated results visible for publication.",
              helper: "Check summary generation and attempt readiness before publishing.",
              action: null,
              completed: false,
              blocked: true,
            };

  return [lifecycleStep, generateStep, ranksStep, publishStep];
}

function nextWorkflowStep(steps: ResultWorkflowStep[]) {
  return steps.find((step) => !step.completed && !step.blocked) ?? steps.find((step) => !step.completed) ?? null;
}

function resolveReturnPath(formData: FormData, role: ResultsWorkspaceRole) {
  const fallback = getWorkspaceConfig(role).basePath;
  const value = String(formData.get("return_path") ?? "").trim();
  return value || fallback;
}

async function runResultsSummaryAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "").trim() as ResultsWorkspaceRole;
  const examId = String(formData.get("exam_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const safeRole = role === "teacher" ? "teacher" : "institute";
  const returnPath = resolveReturnPath(formData, safeRole);

  await requireResultsSession(safeRole);

  if (!examId || !action) {
    redirect(`${returnPath}?error=Exam%20action%20context%20is%20missing.`);
  }

  try {
    if (action === "generate") {
      await generateTeacherResultsForExam(examId);
    } else if (action === "calculate_ranks") {
      await calculateTeacherExamRanks(examId);
    } else if (action === "publish") {
      await publishTeacherExamResults(examId);
    }
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error && error.message
      ? error.message
      : `Unable to complete the selected ${safeRole} results action.`;
    redirect(`${returnPath}?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  const successMessage =
    action === "generate"
      ? "Results generated successfully."
      : action === "calculate_ranks"
        ? "Ranks calculated successfully."
        : "Results published successfully.";

  redirect(`${returnPath}?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(successMessage)}`);
}

async function runResultsForceSubmitAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "").trim() as ResultsWorkspaceRole;
  const examId = String(formData.get("exam_id") ?? "").trim();
  const attemptId = String(formData.get("attempt_id") ?? "").trim();
  const safeRole = role === "teacher" ? "teacher" : "institute";
  const returnPath = resolveReturnPath(formData, safeRole);

  await requireResultsSession(safeRole);

  if (!examId || !attemptId) {
    redirect(`${returnPath}?error=Attempt%20action%20context%20is%20missing.`);
  }

  try {
    await forceSubmitTeacherAttempt(attemptId);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to force-submit the selected attempt.";
    redirect(`${returnPath}?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `${returnPath}?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(
      "Attempt force-submitted successfully.",
    )}`,
  );
}

async function runResultsAttemptInterventionNoteAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "").trim() as ResultsWorkspaceRole;
  const examId = String(formData.get("exam_id") ?? "").trim();
  const attemptId = String(formData.get("attempt_id") ?? "").trim();
  const attemptFilter = String(formData.get("attempt_filter") ?? "all").trim();
  const questionFilter = String(formData.get("question_filter") ?? "all").trim();
  const note = String(formData.get("note") ?? "").trim();
  const followUp = String(formData.get("follow_up") ?? "monitoring").trim() as
    | "monitoring"
    | "contacted"
    | "force_submit_considered"
    | "resolved";
  const safeRole = role === "teacher" ? "teacher" : "institute";
  const returnPath = resolveReturnPath(formData, safeRole);

  await requireResultsSession(safeRole);

  if (!examId || !attemptId || !note) {
    redirect(
      `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
        questionFilter,
      )}&error=${encodeURIComponent("Attempt note context is missing.")}`,
    );
  }

  try {
    await createTeacherAttemptInterventionNote({
      attempt: attemptId,
      note,
      follow_up: followUp,
    });
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error && error.message ? error.message : "Unable to save the intervention note.";
    redirect(
      `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
        questionFilter,
      )}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
      attemptId,
    )}&attempt_filter=${encodeURIComponent(attemptFilter)}&question_filter=${encodeURIComponent(
      questionFilter,
    )}&message=${encodeURIComponent("Intervention note saved successfully.")}`,
  );
}

async function runResultsManualReviewAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "").trim() as ResultsWorkspaceRole;
  const examId = String(formData.get("exam_id") ?? "").trim();
  const attemptId = String(formData.get("attempt_id") ?? "").trim();
  const answerId = String(formData.get("answer_id") ?? "").trim();
  const reviewTaskId = String(formData.get("review_task_id") ?? "").trim();
  const marksAwarded = String(formData.get("marks_awarded") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const rubricScoresRaw = String(formData.get("rubric_scores_json") ?? "").trim();
  const attemptFilter = String(formData.get("attempt_filter") ?? "all").trim();
  const attemptSort = String(formData.get("attempt_sort") ?? "latest").trim();
  const questionFilter = String(formData.get("question_filter") ?? "all").trim();
  const studentQuestionFilter = String(formData.get("student_question_filter") ?? "all").trim();
  const studentQuestionSearch = String(formData.get("student_question_search") ?? "").trim();
  const safeRole = role === "teacher" ? "teacher" : "institute";
  const returnPath = resolveReturnPath(formData, safeRole);

  await requireResultsSession(safeRole);

  if (!examId || !attemptId || !answerId || !marksAwarded) {
    redirect(
      `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&attempt_sort=${encodeURIComponent(
        attemptSort,
      )}&question_filter=${encodeURIComponent(questionFilter)}&student_question_filter=${encodeURIComponent(
        studentQuestionFilter,
      )}&student_question_search=${encodeURIComponent(studentQuestionSearch)}&error=${encodeURIComponent(
        "Manual review context is missing.",
      )}`,
    );
  }

  let rubricScores:
    | Array<{
        criterion_key: string;
        awarded_score: string;
        note?: string;
      }>
    | undefined;

  if (rubricScoresRaw) {
    try {
      const parsed = JSON.parse(rubricScoresRaw) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed)) {
        rubricScores = parsed.map((item) => ({
          criterion_key: String(item.criterion_key ?? "").trim(),
          awarded_score: String(item.awarded_score ?? "").trim(),
          note: String(item.note ?? "").trim(),
        }));
      }
    } catch {
      redirect(
        `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
          attemptId,
        )}&attempt_filter=${encodeURIComponent(attemptFilter)}&attempt_sort=${encodeURIComponent(
          attemptSort,
        )}&question_filter=${encodeURIComponent(questionFilter)}&student_question_filter=${encodeURIComponent(
          studentQuestionFilter,
        )}&student_question_search=${encodeURIComponent(studentQuestionSearch)}&error=${encodeURIComponent(
          "Rubric score data is invalid.",
        )}`,
      );
    }
  }

  try {
    if (reviewTaskId) {
      if (safeRole === "teacher") {
        await submitTeacherReviewTask(reviewTaskId, {
          marks_awarded: marksAwarded,
          review_notes: reviewNotes,
          rubric_scores: rubricScores,
        });
      } else {
        await moderatePortalReviewTask(reviewTaskId, {
          marks_awarded: marksAwarded,
          review_notes: reviewNotes,
          rubric_scores: rubricScores,
        });
      }
    } else {
      await manualReviewTeacherAnswer(answerId, {
        marks_awarded: marksAwarded,
        review_notes: reviewNotes,
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error && error.message ? error.message : "Unable to save the manual review.";
    redirect(
      `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
        attemptId,
      )}&attempt_filter=${encodeURIComponent(attemptFilter)}&attempt_sort=${encodeURIComponent(
        attemptSort,
      )}&question_filter=${encodeURIComponent(questionFilter)}&student_question_filter=${encodeURIComponent(
        studentQuestionFilter,
      )}&student_question_search=${encodeURIComponent(studentQuestionSearch)}&error=${encodeURIComponent(message)}`,
    );
  }

  redirect(
    `${returnPath}?exam=${encodeURIComponent(examId)}&attempt=${encodeURIComponent(
      attemptId,
    )}&attempt_filter=${encodeURIComponent(attemptFilter)}&attempt_sort=${encodeURIComponent(
      attemptSort,
    )}&question_filter=${encodeURIComponent(questionFilter)}&student_question_filter=${encodeURIComponent(
      studentQuestionFilter,
    )}&student_question_search=${encodeURIComponent(studentQuestionSearch)}&message=${encodeURIComponent(
      "Manual review saved successfully.",
    )}`,
  );
}

async function runResultsExamLifecycleAction(formData: FormData) {
  "use server";

  const role = String(formData.get("role") ?? "").trim() as ResultsWorkspaceRole;
  const examId = String(formData.get("exam_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim() as "refresh-status" | "mark-completed";
  const safeRole = role === "teacher" ? "teacher" : "institute";
  const returnPath = resolveReturnPath(formData, safeRole);

  await requireResultsSession(safeRole);

  if (!examId || !action) {
    redirect(`${returnPath}?error=Exam%20lifecycle%20action%20context%20is%20missing.`);
  }

  try {
    await runTeacherExamAction(examId, action);
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to complete the selected exam lifecycle action.";
    redirect(`${returnPath}?exam=${encodeURIComponent(examId)}&error=${encodeURIComponent(message)}`);
  }

  redirect(
    `${returnPath}?exam=${encodeURIComponent(examId)}&message=${encodeURIComponent(
      action === "mark-completed"
        ? "Exam marked completed successfully."
        : "Exam status refreshed successfully.",
    )}`,
  );
}

type WorkspaceContext = {
  config: ResultsWorkspaceConfig;
  view: ResultsWorkspaceView;
  currentPath: string;
  resultExamCards: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>;
  selectedExam: ResultsExamCard;
  selectedSummary: TeacherResultSummary | null;
  selectedAttempt: ResultsAttempt | null;
  selectedAttemptInterventions: Awaited<ReturnType<typeof fetchTeacherAttemptInterventions>>;
  groupedExamCards: Array<{
    label: string;
    items: Array<{ exam: ResultsExamCard; summary: TeacherResultSummary | null }>;
  }>;
  visibleExamCardsLength: number;
  examListFilter: ResultExamFilter;
  examListSort: ResultExamSort;
  examListGroup: ResultExamGroup;
  safeExamPage: number;
  examTotalPages: number;
  examPageSize: number;
  attemptFilter: AttemptReviewFilter;
  attemptSort: AttemptSort;
  attemptGroup: AttemptGroup;
  questionFilter: string;
  studentQuestionFilter: StudentQuestionFilter;
  studentQuestionSearch: string;
  attemptPage: number;
  attemptPageSize: number;
  attemptTotalPages: number;
  leaderboardPage: number;
  leaderboardPageSize: number;
  leaderboardTotalPages: number;
  topicPage: number;
  topicPageSize: number;
  topicTotalPages: number;
  questionPage: number;
  questionPageSize: number;
  questionTotalPages: number;
  groupedAttempts: Array<{ label: string; items: ResultsAttempt[] }>;
  attemptsPageData: Awaited<ReturnType<typeof fetchTeacherExamAttemptPage>>;
  leaderboardPageData: Awaited<ReturnType<typeof fetchTeacherExamLeaderboard>>;
  topicPerformancePageData: Awaited<ReturnType<typeof fetchTeacherTopicPerformance>>;
  questionAnalysisPageData: Awaited<ReturnType<typeof fetchTeacherQuestionAnalysis>>;
  attemptQuestionAnalysisData: Awaited<ReturnType<typeof fetchTeacherAttemptQuestionAnalysis>>;
  monitor: Awaited<ReturnType<typeof fetchTeacherLiveExamMonitor>> | null;
  readiness: ReturnType<typeof resultReadinessState>;
  readinessSnapshot: ResultReadinessSnapshot;
  examReadinessPanel: ReadinessPanel | null;
  resultReadinessPanel: ReadinessPanel | null;
  workflowSteps: ResultWorkflowStep[];
  recommendedWorkflowStep: ResultWorkflowStep | null;
  canRefreshLifecycle: boolean;
  resultsPublished: boolean;
  evaluatedResults: number;
  totalAttempts: number;
  totalPassed: number;
  totalFailed: number;
  averageAcrossExams: number;
  selectedPendingCount: number;
  selectedReviewBlockCount: number;
  selectedRecheckCount: number;
  attemptsByHealth: Record<AttemptHealth, number>;
  interventionQueue: ResultsAttempt[];
  criticalAttempts: ResultsAttempt[];
  watchAttempts: ResultsAttempt[];
  integrityWarningAttempts: number;
  integrityWarningsTotal: number;
  thresholdReachedAttempts: number;
  latestPublishLog: ResultsExamCard["publish_logs"][number] | null;
  examLifecycleStatus: string;
  baseHrefArgs: {
    examId: string;
    attemptId?: string | null;
    attemptFilter: AttemptReviewFilter;
    attemptSort: AttemptSort;
    attemptGroup: AttemptGroup;
    attemptPage: number;
    attemptPageSize: number;
    questionFilter: string;
    examListFilter: ResultExamFilter;
    examListSort: ResultExamSort;
    examListGroup: ResultExamGroup;
    examPage: number;
    examPageSize: number;
    leaderboardPage: number;
    leaderboardPageSize: number;
    topicPage: number;
    topicPageSize: number;
    questionPage: number;
    questionPageSize: number;
    studentQuestionFilter: StudentQuestionFilter;
    studentQuestionSearch: string;
  };
};

function renderViewNavigation(context: WorkspaceContext) {
  const { config, view, baseHrefArgs } = context;
  const items = [
    {
      id: "overview" as const,
      title: "Overview",
      note: "Workflow, readiness, and exam health",
      badge: `${context.evaluatedResults} evaluated`,
    },
    {
      id: "live" as const,
      title: "Live Monitor",
      note: "Intervention queue and active alerts",
      badge: `${context.attemptsByHealth.critical} critical`,
    },
    {
      id: "attempts" as const,
      title: "Attempts",
      note: "Review filters and attempt-by-attempt details",
      badge: `${context.attemptsPageData.count} matching`,
    },
    {
      id: "leaderboard" as const,
      title: "Leaderboard",
      note: "Ranks, publication state, and top outcomes",
      badge: `${context.leaderboardPageData.count} ranked`,
    },
    {
      id: "analysis" as const,
      title: "Analysis",
      note: "Topics, hard questions, and skip patterns",
      badge: `${context.questionAnalysisPageData.count} questions`,
    },
  ];

  return (
    <section className="resultsSummaryGrid teacherResultsStatsGrid teacherResultsStatsGridFive">
      {items.map((item) => (
        <Link
          key={item.id}
          className={`metricCard dashboardHeroCard${view === item.id ? " teacherResultsCardActive" : ""}`}
          href={buildResultsHref(resultsViewPath(config.basePath, item.id), baseHrefArgs)}
        >
          <span>{item.title}</span>
          <strong>{item.badge}</strong>
          <small>{item.note}</small>
        </Link>
      ))}
    </section>
  );
}

function renderExamSidebar(context: WorkspaceContext) {
  const {
    config,
    currentPath,
    selectedExam,
    groupedExamCards,
    visibleExamCardsLength,
    examListFilter,
    examListSort,
    examListGroup,
    attemptFilter,
    attemptSort,
    attemptGroup,
    questionFilter,
    safeExamPage,
    examTotalPages,
    examPageSize,
    attemptPage,
    attemptPageSize,
    leaderboardPage,
    leaderboardPageSize,
    topicPage,
    topicPageSize,
    questionPage,
    questionPageSize,
  } = context;

  return (
    <article className="contentCard teacherResultsSidebar">
      <div className="sectionHeading">
        <strong>Exams</strong>
        <span>{visibleExamCardsLength} visible</span>
      </div>

      <form className="workspaceFiltersForm" method="GET">
        <input name="attempt_filter" type="hidden" value={attemptFilter} />
        <input name="attempt_sort" type="hidden" value={attemptSort} />
        <input name="attempt_group" type="hidden" value={attemptGroup} />
        <input name="attempt_page" type="hidden" value={String(attemptPage)} />
        <input name="attempt_page_size" type="hidden" value={String(attemptPageSize)} />
        <input name="question_filter" type="hidden" value={questionFilter} />
        <input name="leaderboard_page" type="hidden" value={String(leaderboardPage)} />
        <input name="leaderboard_page_size" type="hidden" value={String(leaderboardPageSize)} />
        <input name="topic_page" type="hidden" value={String(topicPage)} />
        <input name="topic_page_size" type="hidden" value={String(topicPageSize)} />
        <input name="question_page" type="hidden" value={String(questionPage)} />
        <input name="question_page_size" type="hidden" value={String(questionPageSize)} />
        <input name="exam_page" type="hidden" value="1" />
        <label className="workspaceFilterField">
          <span>Exam state</span>
          <select defaultValue={examListFilter} name="exam_list_filter">
            <option value="all">All exams</option>
            <option value="published">Published</option>
            <option value="ready">Ready to publish</option>
            <option value="review_blocked">Review blocked</option>
            <option value="high_risk">High release risk</option>
            <option value="medium_risk">Medium release risk</option>
            <option value="live">Live exams</option>
            <option value="draft">Draft exams</option>
          </select>
        </label>
        <label className="workspaceFilterField">
          <span>Sort by</span>
          <select defaultValue={examListSort} name="exam_list_sort">
            <option value="latest">Latest activity</option>
            <option value="attempts">Most attempts</option>
            <option value="average">Highest average</option>
            <option value="release_risk">Highest release risk</option>
            <option value="title">Title A-Z</option>
          </select>
        </label>
        <label className="workspaceFilterField">
          <span>Group by</span>
          <select defaultValue={examListGroup} name="exam_list_group">
            <option value="none">No grouping</option>
            <option value="publication">Publication state</option>
            <option value="release_risk">Release risk</option>
            <option value="status">Exam status</option>
          </select>
        </label>
        <label className="workspaceFilterField">
          <span>Page size</span>
          <select defaultValue={String(examPageSize)} name="exam_page_size">
            <option value="10">10</option>
            <option value="14">14</option>
            <option value="20">20</option>
          </select>
        </label>
        <div className="workspaceFilterActions workspaceFilterActionsFullRow">
          <button className="button buttonPrimary" type="submit">
            Apply filters
          </button>
          <Link
            className="button buttonSecondary"
            href={buildResultsHref(currentPath, {
              examId: selectedExam.id,
              attemptFilter,
              attemptSort,
              attemptGroup,
              attemptPage,
              attemptPageSize,
              questionFilter,
              leaderboardPage,
              leaderboardPageSize,
              topicPage,
              topicPageSize,
              questionPage,
              questionPageSize,
            })}
          >
            Reset exam filters
          </Link>
        </div>
      </form>

      <FilterSummaryPills
        items={[
          { label: "Exam state", value: formatFilterValue(examListFilter) },
          { label: "Sort", value: formatFilterValue(examListSort) },
          { label: "Group", value: formatFilterValue(examListGroup) },
          { label: "Page", value: `${safeExamPage}/${examTotalPages}` },
        ]}
      />

      <div className="resultsList">
        {visibleExamCardsLength === 0 ? (
          <p className="emptyText">No exams match the current result filters.</p>
        ) : (
          groupedExamCards.map((group) => (
            <section className="workspaceResultsGroup" key={group.label}>
              {examListGroup !== "none" ? (
                <div className="sectionHeading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} exams</span>
                </div>
              ) : null}
              <div className="resultsList">
                {group.items.map(({ exam, summary }) => {
                  const isActive = exam.id === selectedExam.id;
                  const publication = examPublicationState(summary);
                  return (
                    <Link
                      className={`resultCard ${isActive ? "teacherResultsCardActive" : ""}`}
                      href={buildResultsHref(currentPath, {
                        examId: exam.id,
                        attemptFilter,
                        attemptSort,
                        attemptGroup,
                        attemptPage,
                        attemptPageSize,
                        questionFilter,
                        examListFilter,
                        examListSort,
                        examListGroup,
                        examPage: safeExamPage,
                        examPageSize,
                        leaderboardPage,
                        leaderboardPageSize,
                        topicPage,
                        topicPageSize,
                        questionPage,
                        questionPageSize,
                      })}
                      key={exam.id}
                    >
                      <div className="resultCardTop">
                        <div>
                          <strong>{exam.title}</strong>
                          <span>{exam.code}</span>
                        </div>
                        <span className={`statusPill ${publication.tone}`}>{publication.label}</span>
                      </div>

                      <div className="questionBankTagRow">
                        <span className={`statusPill ${assessmentFamilyTone(exam.experience_profile?.assessment_family)}`}>
                          {exam.experience_profile?.assessment_family_label ?? "General"}
                        </span>
                        <span className="questionBankTagChip">
                          {normalizeLabel(exam.experience_profile?.delivery_emphasis) || "balanced delivery"}
                        </span>
                        {summary?.review_release_risk?.level && summary.review_release_risk.level !== "none" ? (
                          <span className={`statusPill ${reviewRiskTone(summary.review_release_risk.level)}`}>
                            {summary.review_release_risk.label}
                          </span>
                        ) : null}
                      </div>

                      <div className="resultKpiGrid">
                        <div>
                          <span>Attempts</span>
                          <strong>{summary?.total_attempted ?? 0}</strong>
                        </div>
                        <div>
                          <span>Passed</span>
                          <strong>{summary?.total_passed ?? 0}</strong>
                        </div>
                        <div>
                          <span>Failed</span>
                          <strong>{summary?.total_failed ?? 0}</strong>
                        </div>
                        <div>
                          <span>Highest</span>
                          <strong>{summary?.highest_score ?? "N/A"}</strong>
                        </div>
                        <div>
                          <span>Risk age</span>
                          <strong>{formatHoursCompact(summary?.review_release_risk?.oldest_open_hours ?? 0)}</strong>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {visibleExamCardsLength > examPageSize ? (
        <div className="workspaceFilterActions">
          <Link
            className="button buttonSecondary"
            href={
              safeExamPage <= 1
                ? "#"
                : buildResultsHref(currentPath, {
                    examId: selectedExam.id,
                    attemptFilter,
                    attemptSort,
                    attemptGroup,
                    attemptPage,
                    attemptPageSize,
                    questionFilter,
                    examListFilter,
                    examListSort,
                    examListGroup,
                    examPage: safeExamPage - 1,
                    examPageSize,
                    leaderboardPage,
                    leaderboardPageSize,
                    topicPage,
                    topicPageSize,
                    questionPage,
                    questionPageSize,
                  })
            }
          >
            Previous
          </Link>
          <Link
            className="button buttonSecondary"
            href={
              safeExamPage >= examTotalPages
                ? "#"
                : buildResultsHref(currentPath, {
                    examId: selectedExam.id,
                    attemptFilter,
                    attemptSort,
                    attemptGroup,
                    attemptPage,
                    attemptPageSize,
                    questionFilter,
                    examListFilter,
                    examListSort,
                    examListGroup,
                    examPage: safeExamPage + 1,
                    examPageSize,
                    leaderboardPage,
                    leaderboardPageSize,
                    topicPage,
                    topicPageSize,
                    questionPage,
                    questionPageSize,
                  })
            }
          >
            Next
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function renderOverviewView(context: WorkspaceContext) {
  const {
    config,
    currentPath,
    resultExamCards,
    selectedExam,
    selectedSummary,
    readiness,
    readinessSnapshot,
    workflowSteps,
    recommendedWorkflowStep,
    canRefreshLifecycle,
    resultsPublished,
    evaluatedResults,
    selectedPendingCount,
    selectedReviewBlockCount,
    selectedRecheckCount,
    latestPublishLog,
    examLifecycleStatus,
    examReadinessPanel,
    resultReadinessPanel,
    baseHrefArgs,
  } = context;
  const assessmentLens = resolveAssessmentAnalyticsLens(selectedExam);
  const familyPortfolioCards = buildFamilyPortfolioCards(resultExamCards);
  const scoreDistribution = selectedSummary?.score_distribution ?? [];
  const sectionPerformance = selectedSummary?.section_performance ?? [];
  const reviewReleaseRisk = selectedSummary?.review_release_risk;

  return (
    <>
      <section className="contentCard teacherResultsOverviewCard">
        <div className="resultCardTop">
          <div>
            <strong>{selectedExam.title}</strong>
            <span>{selectedExam.code}</span>
          </div>
          <div className="resultStatusGroup">
            <span className={`statusPill ${resultsPublished ? "statusLive" : "statusDemo"}`}>
              {resultsPublished ? "Results published" : "Results not published"}
            </span>
            <span
              className={`statusPill ${
                examLifecycleStatus === "completed"
                  ? "statusLive"
                  : examLifecycleStatus === "live"
                    ? "statusWarning"
                    : "statusDemo"
              }`}
            >
              Exam {examLifecycleStatus.replaceAll("_", " ")}
            </span>
            <span className="statusPill statusLive">
              Updated {formatDateTime(selectedSummary?.last_calculated_at ?? selectedExam.updated_at)}
            </span>
            {reviewReleaseRisk && reviewReleaseRisk.level !== "none" ? (
              <span className={`statusPill ${reviewRiskTone(reviewReleaseRisk.level)}`}>
                {reviewReleaseRisk.label}
              </span>
            ) : null}
          </div>
        </div>

        <div className="teacherWorkflowSummary">
          <div>
            <span className="studentDashboardTag">Guided workflow</span>
            <strong>
              {recommendedWorkflowStep
                ? `Next recommended step: ${recommendedWorkflowStep.title}`
                : "All result workflow steps are complete"}
            </strong>
            <p>
              {recommendedWorkflowStep
                ? recommendedWorkflowStep.detail
                : "This exam already has completed lifecycle, generated summary, ranking readiness, and published results."}
            </p>
          </div>
          <div className="resultStatusGroup">
            <span className={`statusPill ${readiness.tone}`}>{readiness.label}</span>
            <span className="statusPill statusDemo">
              {context.attemptsPageData.summary.total_attempts} attempts total
            </span>
            <span className="statusPill statusLive">{evaluatedResults} evaluated</span>
            {selectedReviewBlockCount > 0 ? (
              <span className="statusPill statusWarning">
                {selectedReviewBlockCount} review blocker{selectedReviewBlockCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {selectedRecheckCount > 0 ? (
              <span className="statusPill statusDemo">
                {selectedRecheckCount} recheck pending
              </span>
            ) : null}
          </div>
        </div>

        <div className="teacherResultsReadinessBoard">
          {examReadinessPanel ? (
            <article className="teacherResultsReadinessCard">
              <div className="teacherResultsReadinessCardTop">
                <strong>{examReadinessPanel.title}</strong>
                <span className={`statusPill ${examReadinessPanel.ready ? "statusLive" : "statusWarning"}`}>
                  {examReadinessPanel.ready ? "Ready" : "Blocked"}
                </span>
              </div>
              <p>{examReadinessPanel.summary}</p>
              <div className="questionBankTagRow">
                {examReadinessPanel.stats.map((item: string) => (
                  <span className="questionBankTagChip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              {examReadinessPanel.blockers.length ? (
                <ul>
                  {examReadinessPanel.blockers
                    .slice(0, 3)
                    .map((issue: ReadinessIssue) => (
                    <li key={`exam-${issue.code}`}>{issue.code.replaceAll("_", " ")}: {issue.message}</li>
                    ))}
                </ul>
              ) : (
                <p>No backend exam-publish blocker remains for this selected exam.</p>
              )}
              {examReadinessPanel.warnings.length ? (
                <p>
                  Warning: {examReadinessPanel.warnings[0].code.replaceAll("_", " ")}. {examReadinessPanel.warnings[0].message}
                </p>
              ) : null}
            </article>
          ) : null}

          {resultReadinessPanel ? (
            <article className="teacherResultsReadinessCard teacherResultsReadinessCardReady">
              <div className="teacherResultsReadinessCardTop">
                <strong>{resultReadinessPanel.title}</strong>
                <span className={`statusPill ${resultReadinessPanel.ready ? "statusLive" : "statusWarning"}`}>
                  {resultReadinessPanel.ready ? "Ready" : "Blocked"}
                </span>
              </div>
              <p>{resultReadinessPanel.summary}</p>
              <div className="questionBankTagRow">
                {resultReadinessPanel.stats.map((item: string) => (
                  <span className="questionBankTagChip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              {resultReadinessPanel.blockers.length ? (
                <ul>
                  {resultReadinessPanel.blockers
                    .slice(0, 3)
                    .map((issue: ReadinessIssue) => (
                    <li key={`result-${issue.code}`}>{issue.code.replaceAll("_", " ")}: {issue.message}</li>
                    ))}
                </ul>
              ) : (
                <p>No backend result-publication blocker remains for this selected exam.</p>
              )}
              {resultReadinessPanel.warnings.length ? (
                <p>
                  Warning: {resultReadinessPanel.warnings[0].code.replaceAll("_", " ")}. {resultReadinessPanel.warnings[0].message}
                </p>
              ) : null}
            </article>
          ) : null}

          <article className="teacherResultsReadinessHero">
            <span className="studentDashboardTag">Assessment lens</span>
            <strong>{assessmentLens.familyLabel} profile</strong>
            <p>{assessmentLens.summary}</p>
            <div className="questionBankTagRow">
              <span className={`statusPill ${assessmentFamilyTone(assessmentLens.familyCode)}`}>
                {assessmentLens.familyLabel}
              </span>
              <span className="questionBankTagChip">Delivery: {assessmentLens.deliveryModeLabel}</span>
              <span className="questionBankTagChip">Timer: {assessmentLens.timerModeLabel}</span>
              <span className="questionBankTagChip">Navigation: {assessmentLens.navigationModeLabel}</span>
            </div>
          </article>

          <article className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Read the data through</strong>
              <span className={`statusPill ${assessmentFamilyTone(assessmentLens.familyCode)}`}>
                {assessmentLens.focusAreas.length}
              </span>
            </div>
            <ul>
              {assessmentLens.focusAreas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Creator guidance</strong>
              <span className="statusPill statusDemo">Builder aligned</span>
            </div>
            <p>{assessmentLens.creatorSummary || "Builder guidance is aligned from the exam and program profile."}</p>
          </article>

          <article className="teacherResultsReadinessCard teacherResultsReadinessCardReady">
            <div className="teacherResultsReadinessCardTop">
              <strong>Learner experience</strong>
              <span className="statusPill statusLive">{assessmentLens.deliveryEmphasis}</span>
            </div>
            <p>{assessmentLens.learnerSummary || "Learner delivery guidance is available through the exam experience profile."}</p>
          </article>
        </div>

        <div className="teacherResultsReadinessBoard">
          <article className="teacherResultsReadinessHero">
            <span className="studentDashboardTag">Score distribution</span>
            <strong>
              {scoreDistribution.length
                ? "See how learners are spread across score bands, not just average score."
                : "Distribution will appear once results are generated for this exam."}
            </strong>
            <p>
              Distribution is the first Phase 6 analytics lens. It helps identify whether a low average means broad weakness,
              a polarized cohort, or just a handful of struggling learners.
            </p>
          </article>

          <article className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Score bands</strong>
              <span className="statusPill statusLive">{scoreDistribution.length}</span>
            </div>
            {scoreDistribution.length ? (
              <div className="analyticsResultBarStack">
                {scoreDistribution.map((bucket) => (
                  <div className="analyticsResultBarRow" key={bucket.label}>
                    <div className="analyticsResultBarMeta">
                      <strong>{bucket.label}</strong>
                      <span>{bucket.count} learner{bucket.count === 1 ? "" : "s"}</span>
                    </div>
                    <div className="analyticsResultBarTrack">
                      <div
                        className="analyticsResultBarFill"
                        style={{ width: `${Math.max(4, Math.min(bucket.percentage_share, 100))}%` }}
                      />
                    </div>
                    <strong>{Math.round(bucket.percentage_share)}%</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>No score buckets are available yet.</p>
            )}
          </article>

          <article className="teacherResultsReadinessCard teacherResultsReadinessCardReady">
            <div className="teacherResultsReadinessCardTop">
              <strong>Section performance</strong>
              <span className="statusPill statusDemo">{sectionPerformance.length}</span>
            </div>
            {sectionPerformance.length ? (
              <div className="analyticsResultBarStack">
                {sectionPerformance.slice(0, 4).map((section) => (
                  <div className="analyticsResultBarRow" key={section.section_id ?? section.section_name}>
                    <div className="analyticsResultBarMeta">
                      <strong>{section.section_name}</strong>
                      <span>{section.total_questions} question{section.total_questions === 1 ? "" : "s"}</span>
                    </div>
                    <div className="analyticsResultBarTrack">
                      <div
                        className="analyticsResultBarFill"
                        style={{ width: `${Math.max(4, Math.min(section.accuracy_percentage, 100))}%` }}
                      />
                    </div>
                    <strong>{Math.round(section.accuracy_percentage)}%</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>No section summaries are available for this exam yet.</p>
            )}
          </article>

          <article className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Fastest weak spot</strong>
              <span className="statusPill statusWarning">Phase 6</span>
            </div>
            {sectionPerformance.length ? (
              <>
                <strong>
                  {sectionPerformance
                    .slice()
                    .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0]?.section_name ?? "N/A"}
                </strong>
                <p>
                  Lowest accuracy section with{" "}
                  {Math.round(
                    sectionPerformance
                      .slice()
                      .sort((left, right) => left.accuracy_percentage - right.accuracy_percentage)[0]
                      ?.accuracy_percentage ?? 0,
                  )}
                  % accuracy and{" "}
                  {Math.round(
                    sectionPerformance
                      .slice()
                      .sort((left, right) => right.skip_percentage - left.skip_percentage)[0]
                      ?.skip_percentage ?? 0,
                  )}
                  % skip pressure in the weakest visible section.
                </p>
              </>
            ) : (
              <p>Section-level weakness indicators will appear after answer data is available.</p>
            )}
          </article>
        </div>

        <div className="teacherResultsReadinessBoard">
          <article className="teacherResultsReadinessHero">
            <span className="studentDashboardTag">Family portfolio</span>
            <strong>
              Compare readiness, release pressure, and average performance across every assessment family in scope.
            </strong>
            <p>
              This expands the family lens beyond one exam. Use it to decide which family needs the next builder cleanup,
              review attention, or coaching intervention first.
            </p>
          </article>

          {familyPortfolioCards.slice(0, 3).map((family) => (
            <article className="teacherResultsReadinessCard" key={family.familyCode}>
              <div className="teacherResultsReadinessCardTop">
                <strong>{family.familyLabel}</strong>
                <span className={`statusPill ${family.tone}`}>{family.averagePercentage}% avg</span>
              </div>
              <div className="resultKpiGrid">
                <div>
                  <span>Exams</span>
                  <strong>{family.examCount}</strong>
                </div>
                <div>
                  <span>Tracked</span>
                  <strong>{family.trackedExamCount}</strong>
                </div>
                <div>
                  <span>High risk</span>
                  <strong>{family.highRiskCount}</strong>
                </div>
                <div>
                  <span>Pending review</span>
                  <strong>{family.pendingReviewTasks}</strong>
                </div>
              </div>
              <p>{family.primaryConcern}</p>
              <div className="questionBankTagRow">
                {family.strongestExamTitle ? (
                  <span className="questionBankTagChip">
                    Strongest: {family.strongestExamTitle}
                    {typeof family.strongestExamPercentage === "number"
                      ? ` ${Math.round(family.strongestExamPercentage)}%`
                      : ""}
                  </span>
                ) : null}
                {family.weakestExamTitle ? (
                  <span className="questionBankTagChip">
                    Weakest: {family.weakestExamTitle}
                    {typeof family.weakestExamPercentage === "number"
                      ? ` ${Math.round(family.weakestExamPercentage)}%`
                      : ""}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="teacherResultsReadinessBoard">
          <article className="teacherResultsReadinessHero">
            <span className="studentDashboardTag">Publication readiness</span>
            <strong>{readinessSnapshot.headline}</strong>
            <p>{readinessSnapshot.summary}</p>
          </article>

          <article className="teacherResultsReadinessCard teacherResultsReadinessCardBlocked">
            <div className="teacherResultsReadinessCardTop">
              <strong>Hard blockers</strong>
              <span className="statusPill statusWarning">{readinessSnapshot.blockers.length}</span>
            </div>
            {readinessSnapshot.blockers.length ? (
              <ul>
                {readinessSnapshot.blockers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No blocker is currently stopping publication.</p>
            )}
          </article>

          <article className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Still to verify</strong>
              <span className="statusPill statusDemo">{readinessSnapshot.pendingDependencies.length}</span>
            </div>
            {readinessSnapshot.pendingDependencies.length ? (
              <ul>
                {readinessSnapshot.pendingDependencies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No extra dependency is waiting right now.</p>
            )}
          </article>

          <article className="teacherResultsReadinessCard teacherResultsReadinessCardReady">
            <div className="teacherResultsReadinessCardTop">
              <strong>Already ready</strong>
              <span className="statusPill statusLive">{readinessSnapshot.readySignals.length}</span>
            </div>
            {readinessSnapshot.readySignals.length ? (
              <ul>
                {readinessSnapshot.readySignals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No readiness signal has been established yet.</p>
            )}
          </article>
        </div>

        <div className="teacherWorkflowGrid">
          {workflowSteps.map((step, index) => (
            <article
              className={`teacherWorkflowCard ${
                step.completed
                  ? "teacherWorkflowCardDone"
                  : step.blocked
                    ? "teacherWorkflowCardBlocked"
                    : "teacherWorkflowCardReady"
              }`}
              key={step.id}
            >
              <div className="teacherWorkflowHeader">
                <div className="teacherWorkflowStepNo">Step {index + 1}</div>
                <span className={`statusPill ${step.tone}`}>{step.statusLabel}</span>
              </div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
              <small>{step.helper}</small>
              <div className="teacherWorkflowActionArea">
                {step.action?.kind === "form" ? (
                  <form action={step.action.formAction}>
                    <input name="role" type="hidden" value={config.role} />
                    <input name="return_path" type="hidden" value={currentPath} />
                    <input name="exam_id" type="hidden" value={selectedExam.id} />
                    <button
                      className={`button ${step.action.variant}`}
                      name="action"
                      type="submit"
                      value={step.action.actionName}
                    >
                      {step.action.label}
                    </button>
                  </form>
                ) : null}
                {step.action?.kind === "link" ? (
                  <Link className={`button ${step.action.variant}`} href={step.action.href}>
                    {step.action.label}
                  </Link>
                ) : null}
                {step.completed ? <span className="statusPill statusLive">Done</span> : null}
              </div>
            </article>
          ))}
        </div>

        <div className="resultCardActions">
          {canRefreshLifecycle ? (
            <form action={runResultsExamLifecycleAction}>
              <input name="role" type="hidden" value={config.role} />
              <input name="return_path" type="hidden" value={currentPath} />
              <input name="exam_id" type="hidden" value={selectedExam.id} />
              <button className="button buttonGhost" name="action" type="submit" value="refresh-status">
                Refresh Exam Status
              </button>
            </form>
          ) : null}
          <Link className="button buttonGhost" href={`${config.examBasePath}/${selectedExam.id}`}>
            Open Exam
          </Link>
          <Link className="button buttonGhost" href={`${config.examBasePath}/${selectedExam.id}/builder`}>
            Open Builder
          </Link>
          <Link className="button buttonGhost" href={`${config.reviewsBasePath}?exam=${selectedExam.id}`}>
            Open Reviews
          </Link>
          <Link className="button buttonGhost" href={config.questionBankPath}>
            Inspect Question Bank
          </Link>
          <Link
            className="button buttonSecondary"
            href={buildResultsHref(resultsViewPath(config.basePath, "leaderboard"), baseHrefArgs)}
          >
            Open Leaderboard
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid teacherResultsStatsGrid teacherResultsStatsGridSix">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Lifecycle readiness</span>
          <strong>{readiness.label}</strong>
          <small>{readiness.note}</small>
        </article>
        <article className="metricCard">
          <span>Submitted</span>
          <strong>{selectedSummary?.total_attempted ?? 0}</strong>
          <small>Attempt records found for this exam summary</small>
        </article>
        <article className="metricCard">
          <span>Evaluated</span>
          <strong>{evaluatedResults}</strong>
          <small>Passed plus failed results ready for review</small>
        </article>
        <article className="metricCard">
          <span>Pending</span>
          <strong>{selectedPendingCount}</strong>
          <small>
            {selectedPendingCount > 0
              ? "Submissions still need evaluation or publication work"
              : "No pending result work for this exam"}
          </small>
        </article>
        <article className="metricCard">
          <span>Review blockers</span>
          <strong>{selectedReviewBlockCount}</strong>
          <small>
            {selectedReviewBlockCount > 0
              ? selectedRecheckCount > 0
                ? `${selectedRecheckCount} of these are waiting on recheck decisions`
                : "Clear these review tasks before publishing results"
              : "No unresolved manual review tasks are blocking publication"}
          </small>
        </article>
        <article className="metricCard">
          <span>Release risk</span>
          <strong>{reviewReleaseRisk?.label ?? "No review risk"}</strong>
          <small>
            {reviewReleaseRisk?.level && reviewReleaseRisk.level !== "none"
              ? `${formatHoursCompact(reviewReleaseRisk.oldest_open_hours)} oldest unresolved review age`
              : "No review backlog is threatening publication right now"}
          </small>
        </article>
        <article className="metricCard">
          <span>Latest lifecycle event</span>
          <strong>
            {latestPublishLog
              ? `${latestPublishLog.old_status.replaceAll("_", " ")} to ${latestPublishLog.new_status.replaceAll("_", " ")}`
              : "No history"}
          </strong>
          <small>
            {latestPublishLog ? formatDateTime(latestPublishLog.created_at) : "No lifecycle actions recorded yet"}
          </small>
        </article>
      </section>

      <section className="contentCard teacherResultsActionLane">
        <div className="sectionHeading">
          <strong>Use the detail pages</strong>
          <span>Each page keeps the current exam context</span>
        </div>
        <div className="teacherResultsActionGrid">
          <article className="teacherResultsActionCard">
            <strong>Live monitoring</strong>
            <p>
              Follow active alerts, threshold pressure, and intervention decisions without scrolling through result analytics.
            </p>
            <Link
              className="button buttonSecondary"
              href={buildResultsHref(resultsViewPath(config.basePath, "live"), baseHrefArgs)}
            >
              Open Live Monitor
            </Link>
          </article>
          <article className="teacherResultsActionCard">
            <strong>Assessment analytics</strong>
            <p>
              Review topic performance and hard questions on a separate page built for post-exam improvement work.
            </p>
            <Link
              className="button buttonSecondary"
              href={buildResultsHref(resultsViewPath(config.basePath, "analysis"), baseHrefArgs)}
            >
              Open Analysis
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}

function renderLiveMonitorView(context: WorkspaceContext) {
  const {
    config,
    currentPath,
    selectedExam,
    selectedAttempt,
    selectedAttemptInterventions,
    monitor,
    attemptFilter,
    questionFilter,
    integrityWarningAttempts,
    integrityWarningsTotal,
    thresholdReachedAttempts,
    attemptsByHealth,
    interventionQueue,
    criticalAttempts,
    watchAttempts,
    baseHrefArgs,
  } = context;

  if (!monitor) {
    return (
      <StudentStatePanel
        eyebrow="Live monitor unavailable"
        title="Live attempt monitoring could not be loaded"
        description="The selected exam loaded, but the live monitor endpoint did not complete successfully for this exam."
        ctaHref={`${config.examBasePath}/${selectedExam.id}`}
        ctaLabel="Open Exam"
        statusLabel="Partial analytics available"
      />
    );
  }

  return (
    <>
      <section className="contentCard teacherResultsMonitorCard">
        <div className="sectionHeading">
          <strong>Live monitor</strong>
          <span>{monitor.exam_status.replaceAll("_", " ")}</span>
        </div>

        <LiveMonitorRefresh intervalSeconds={20} />

        <div className="resultKpiGrid teacherResultsKpiGrid">
          <div>
            <span>Total students</span>
            <strong>{monitor.total_students}</strong>
          </div>
          <div>
            <span>Started</span>
            <strong>{monitor.started_students}</strong>
          </div>
          <div>
            <span>In progress</span>
            <strong>{monitor.in_progress_students}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>{monitor.completed_students}</strong>
          </div>
          <div>
            <span>High alerts</span>
            <strong>{monitor.high_alert_attempts}</strong>
          </div>
          <div>
            <span>Warning attempts</span>
            <strong>{integrityWarningAttempts}</strong>
          </div>
          <div>
            <span>Total warnings</span>
            <strong>{integrityWarningsTotal}</strong>
          </div>
          <div>
            <span>Threshold reached</span>
            <strong>{thresholdReachedAttempts}</strong>
          </div>
          <div>
            <span>Last activity</span>
            <strong>{formatDateTime(monitor.last_activity_at)}</strong>
          </div>
        </div>

        <div className="teacherMonitorHealthGrid">
          <article className="teacherMonitorHealthCard teacherMonitorHealthCritical">
            <span>Intervene now</span>
            <strong>{attemptsByHealth.critical}</strong>
            <small>Auto-submitted, threshold-reached, or high-alert attempts</small>
          </article>
          <article className="teacherMonitorHealthCard teacherMonitorHealthWatch">
            <span>Watch closely</span>
            <strong>{attemptsByHealth.watch}</strong>
            <small>Warnings present or in-progress attempts worth tracking</small>
          </article>
          <article className="teacherMonitorHealthCard teacherMonitorHealthStable">
            <span>Stable</span>
            <strong>{attemptsByHealth.stable}</strong>
            <small>No active warning pressure returned from live monitoring</small>
          </article>
        </div>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Intervention queue</strong>
          <span>Highest-priority attempts first</span>
        </div>
        {interventionQueue.length ? (
          <div className="teacherInterventionList">
            {interventionQueue.map((attempt) => {
              const health = attemptHealth(attempt);
              return (
                <article className="teacherInterventionCard" key={`queue-${attempt.id}`}>
                  <div className="resultCardTop">
                    <div>
                      <strong>{attempt.student_name}</strong>
                      <span>
                        {attempt.student_admission_no} · Attempt {attempt.attempt_no}
                      </span>
                    </div>
                    <span className={`statusPill ${healthTone(health)}`}>{healthLabel(health)}</span>
                  </div>
                  <p>{healthReason(attempt)}</p>
                  <div className="teacherDecisionSummary">
                    <span>Recommended next step</span>
                    <strong>{recommendedAction(attempt, config.roleNounLower)}</strong>
                  </div>
                  <div className="resultCardActions">
                    <Link
                      className="button buttonSecondary"
                      href={buildResultsHref(currentPath, {
                        ...baseHrefArgs,
                        attemptId: attempt.id,
                      })}
                    >
                      Inspect Attempt
                    </Link>
                    {attempt.can_force_submit ? (
                      <form action={runResultsForceSubmitAction}>
                        <input name="role" type="hidden" value={config.role} />
                        <input name="return_path" type="hidden" value={currentPath} />
                        <input name="exam_id" type="hidden" value={selectedExam.id} />
                        <input name="attempt_id" type="hidden" value={attempt.id} />
                        <button className="button buttonGhost" type="submit">
                          Force Submit
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="emptyText">No attempts currently need intervention beyond routine monitoring.</p>
        )}
      </section>

      {(criticalAttempts.length || watchAttempts.length) ? (
        <section className="teacherLaneGrid">
          <article className="contentCard teacherLaneCard">
            <div className="sectionHeading">
              <strong>High-alert lane</strong>
              <span>{criticalAttempts.length} attempts</span>
            </div>
            {criticalAttempts.length ? (
              <div className="teacherLaneList">
                {criticalAttempts.slice(0, 6).map((attempt) => (
                  <div className="teacherLaneRow" key={`critical-${attempt.id}`}>
                    <div>
                      <strong>{attempt.student_name}</strong>
                      <span>{healthReason(attempt)}</span>
                    </div>
                    <Link
                      className="button buttonGhost"
                      href={buildResultsHref(currentPath, {
                        ...baseHrefArgs,
                        attemptId: attempt.id,
                      })}
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="emptyText">No critical attempts are waiting right now.</p>
            )}
          </article>

          <article className="contentCard teacherLaneCard">
            <div className="sectionHeading">
              <strong>Watch lane</strong>
              <span>{watchAttempts.length} attempts</span>
            </div>
            {watchAttempts.length ? (
              <div className="teacherLaneList">
                {watchAttempts.slice(0, 6).map((attempt) => (
                  <div className="teacherLaneRow" key={`watch-${attempt.id}`}>
                    <div>
                      <strong>{attempt.student_name}</strong>
                      <span>{recommendedAction(attempt, config.roleNounLower)}</span>
                    </div>
                    <Link
                      className="button buttonGhost"
                      href={buildResultsHref(currentPath, {
                        ...baseHrefArgs,
                        attemptId: attempt.id,
                      })}
                    >
                      Inspect
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="emptyText">No watch-list attempts are pending beyond routine monitoring.</p>
            )}
          </article>
        </section>
      ) : null}

      {renderAttemptDetailCard({
        config,
        currentPath,
        selectedExamId: selectedExam.id,
        selectedAttempt,
        selectedAttemptInterventions,
        attemptFilter,
        questionFilter,
      })}
    </>
  );
}

function renderAttemptDetailCard(args: {
  config: ResultsWorkspaceConfig;
  currentPath: string;
  selectedExamId: string;
  selectedAttempt: ResultsAttempt | null;
  selectedAttemptInterventions: Awaited<ReturnType<typeof fetchTeacherAttemptInterventions>>;
  attemptFilter: AttemptReviewFilter;
  questionFilter: string;
}) {
  const {
    config,
    currentPath,
    selectedExamId,
    selectedAttempt,
    selectedAttemptInterventions,
    attemptFilter,
    questionFilter,
  } = args;

  if (!selectedAttempt) {
    return null;
  }

  return (
    <section className="contentCard teacherAttemptDetailPanel">
      <div className="sectionHeading">
        <strong>Attempt detail</strong>
        <span>
          {selectedAttempt.student_name} · Attempt {selectedAttempt.attempt_no}
        </span>
      </div>

      <div className="resultCardTop">
        <div>
          <strong>{selectedAttempt.student_name}</strong>
          <span>
            {selectedAttempt.student_admission_no} · {selectedAttempt.status.replaceAll("_", " ")}
          </span>
        </div>
        <span className={`statusPill ${healthTone(attemptHealth(selectedAttempt))}`}>
          {healthLabel(attemptHealth(selectedAttempt))}
        </span>
      </div>

      <div className="resultKpiGrid teacherResultsKpiGrid">
        <div>
          <span>Final score</span>
          <strong>{selectedAttempt.final_score}</strong>
        </div>
        <div>
          <span>Percentage</span>
          <strong>{percentage(selectedAttempt.percentage)}</strong>
        </div>
        <div>
          <span>Attempted</span>
          <strong>{selectedAttempt.attempted_questions}</strong>
        </div>
        <div>
          <span>Correct</span>
          <strong>{selectedAttempt.correct_answers}</strong>
        </div>
        <div>
          <span>Incorrect</span>
          <strong>{selectedAttempt.incorrect_answers}</strong>
        </div>
        <div>
          <span>Skipped</span>
          <strong>{selectedAttempt.skipped_questions}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{formatDateTime(selectedAttempt.started_at)}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{formatDateTime(selectedAttempt.submitted_at)}</strong>
        </div>
        <div>
          <span>Time taken</span>
          <strong>{formatDuration(selectedAttempt.time_taken_seconds)}</strong>
        </div>
        <div>
          <span>Auto submitted</span>
          <strong>{selectedAttempt.is_auto_submitted ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>Integrity warnings</span>
          <strong>{selectedAttempt.integrity_summary.violation_count}</strong>
        </div>
        <div>
          <span>Latest signal</span>
          <strong>{latestIntegrityLabel(selectedAttempt.integrity_summary.latest_event?.event_type)}</strong>
        </div>
        <div>
          <span>Latest event time</span>
          <strong>{formatDateTime(selectedAttempt.integrity_summary.latest_event?.event_at ?? null)}</strong>
        </div>
        <div>
          <span>Threshold state</span>
          <strong>
            {selectedAttempt.integrity_summary.threshold_reached
              ? "Reached"
              : selectedAttempt.integrity_summary.violation_limit !== null
                ? `${selectedAttempt.integrity_summary.remaining_before_action ?? 0} left`
                : "Not used"}
          </strong>
        </div>
        <div>
          <span>{config.roleNoun} health</span>
          <strong>{healthLabel(attemptHealth(selectedAttempt))}</strong>
        </div>
        <div>
          <span>{config.roleNoun} action cue</span>
          <strong>{healthReason(selectedAttempt)}</strong>
        </div>
        <div>
          <span>Accommodation</span>
          <strong>{accommodationLabel(selectedAttempt)}</strong>
        </div>
      </div>

      <div className="teacherDecisionCard">
        <div className="resultCardTop">
          <div>
            <strong>Decision support</strong>
            <span>{followUpLabel(selectedAttempt)}</span>
          </div>
          <span className={`statusPill ${healthTone(attemptHealth(selectedAttempt))}`}>
            {healthLabel(attemptHealth(selectedAttempt))}
          </span>
        </div>
        <p>{recommendedAction(selectedAttempt, config.roleNounLower)}</p>
      </div>

      <article className="teacherAttemptTimelineCard">
        <div className="sectionHeading">
          <strong>Intervention notes</strong>
          <span>{selectedAttemptInterventions.length} logged actions</span>
        </div>
        <form action={runResultsAttemptInterventionNoteAction} className="teacherInterventionForm">
          <input name="role" type="hidden" value={config.role} />
          <input name="return_path" type="hidden" value={currentPath} />
          <input name="exam_id" type="hidden" value={selectedExamId} />
          <input name="attempt_id" type="hidden" value={selectedAttempt.id} />
          <input name="attempt_filter" type="hidden" value={attemptFilter} />
          <input name="question_filter" type="hidden" value={questionFilter} />

          <div className="builderComposerGrid">
            <label className="fieldStack">
              <span>Follow-up state</span>
              <select defaultValue="monitoring" name="follow_up">
                <option value="monitoring">Monitoring</option>
                <option value="contacted">Contacted</option>
                <option value="force_submit_considered">Force Submit Considered</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="fieldStack">
              <span>{config.roleNoun} note</span>
              <textarea
                className="builderTextarea"
                name="note"
                placeholder="Record what you observed, what action you took, or what should happen next."
                rows={3}
              />
            </label>
          </div>

          <div className="settingsActionRow">
            <button className="button buttonSecondary" type="submit">
              Save Intervention Note
            </button>
          </div>
        </form>

        {selectedAttemptInterventions.length ? (
          <div className="teacherTimelineList">
            {selectedAttemptInterventions.map((item) => (
              <div className="teacherTimelineRow" key={`intervention-${item.id}`}>
                <div className="teacherTimelineMarker" />
                <div>
                  <strong>{item.user_label}</strong>
                  <span>
                    {formatDateTime(item.created_at)}
                    {item.metadata.follow_up ? ` · ${item.metadata.follow_up.replaceAll("_", " ")}` : ""}
                  </span>
                  <small>{item.message}</small>
                </div>
                <span className="statusPill statusDemo">{item.action.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="emptyText">No intervention notes have been recorded for this attempt yet.</p>
        )}
      </article>
    </section>
  );
}

function renderAttemptsView(context: WorkspaceContext) {
  const {
    config,
    currentPath,
    selectedExam,
    selectedAttempt,
    selectedAttemptInterventions,
    attemptsPageData,
    groupedAttempts,
    attemptFilter,
    attemptSort,
    attemptGroup,
    attemptPage,
    attemptPageSize,
    attemptTotalPages,
    questionFilter,
    examListFilter,
    examListSort,
    examListGroup,
    safeExamPage,
    examPageSize,
    leaderboardPage,
    leaderboardPageSize,
    topicPage,
    topicPageSize,
    questionPage,
    questionPageSize,
  } = context;

  return (
    <>
      {renderAttemptDetailCard({
        config,
        currentPath,
        selectedExamId: selectedExam.id,
        selectedAttempt,
        selectedAttemptInterventions,
        attemptFilter,
        questionFilter,
      })}

      <section className="contentCard teacherResultsAttemptsCard">
        <div className="sectionHeading">
          <strong>Recent attempts</strong>
          <span>{attemptsPageData.count} matching</span>
        </div>
        <form className="workspaceFiltersForm" method="GET">
          <input name="exam" type="hidden" value={selectedExam.id} />
          <input name="question_filter" type="hidden" value={questionFilter} />
          <input name="exam_list_filter" type="hidden" value={examListFilter} />
          <input name="exam_list_sort" type="hidden" value={examListSort} />
          <input name="exam_list_group" type="hidden" value={examListGroup} />
          <input name="exam_page" type="hidden" value={String(safeExamPage)} />
          <input name="exam_page_size" type="hidden" value={String(examPageSize)} />
          <input name="leaderboard_page" type="hidden" value={String(leaderboardPage)} />
          <input name="leaderboard_page_size" type="hidden" value={String(leaderboardPageSize)} />
          <input name="topic_page" type="hidden" value={String(topicPage)} />
          <input name="topic_page_size" type="hidden" value={String(topicPageSize)} />
          <input name="question_page" type="hidden" value={String(questionPage)} />
          <input name="question_page_size" type="hidden" value={String(questionPageSize)} />
          <input name="attempt_page" type="hidden" value="1" />
          <label className="workspaceFilterField">
            <span>Review filter</span>
            <select defaultValue={attemptFilter} name="attempt_filter">
              <option value="all">All attempts</option>
              <option value="low_performers">Low performers</option>
              <option value="skipped_heavy">Skipped heavy</option>
              <option value="critical">Critical only</option>
              <option value="watch">Watch only</option>
              <option value="in_progress">In progress</option>
              <option value="auto_submitted">Auto-submitted</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Sort by</span>
            <select defaultValue={attemptSort} name="attempt_sort">
              <option value="latest">Latest activity</option>
              <option value="score_low">Lowest score</option>
              <option value="warnings_high">Most warnings</option>
              <option value="time_long">Longest duration</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Group by</span>
            <select defaultValue={attemptGroup} name="attempt_group">
              <option value="none">No grouping</option>
              <option value="health">Health</option>
              <option value="status">Attempt status</option>
            </select>
          </label>
          <label className="workspaceFilterField">
            <span>Page size</span>
            <select defaultValue={String(attemptPageSize)} name="attempt_page_size">
              <option value="12">12</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
          </label>
          <div className="workspaceFilterActions">
            <button className="button buttonPrimary" type="submit">
              Apply filters
            </button>
            <Link
              className="button buttonSecondary"
              href={buildResultsHref(currentPath, {
                examId: selectedExam.id,
                questionFilter,
                examListFilter,
                examListSort,
                examListGroup,
                examPage: safeExamPage,
                examPageSize,
                leaderboardPage,
                leaderboardPageSize,
                topicPage,
                topicPageSize,
                questionPage,
                questionPageSize,
              })}
            >
              Reset attempt filters
            </Link>
          </div>
        </form>

        <FilterSummaryPills
          items={[
            { label: "Review", value: formatFilterValue(attemptFilter) },
            { label: "Sort", value: formatFilterValue(attemptSort) },
            { label: "Group", value: formatFilterValue(attemptGroup) },
            { label: "Page", value: `${attemptPage}/${attemptTotalPages}` },
          ]}
        />

        {!attemptsPageData.summary.total_attempts ? (
          <p className="emptyText">No attempt records were returned for the selected exam.</p>
        ) : !attemptsPageData.results.length ? (
          <p className="emptyText">No students match this review filter right now.</p>
        ) : (
          groupedAttempts.map((group) => (
            <div className="workspaceResultsGroup" key={group.label}>
              {attemptGroup !== "none" ? (
                <div className="sectionHeading">
                  <strong>{group.label}</strong>
                  <span>{group.items.length} attempts</span>
                </div>
              ) : null}
              <div className="resultsList">
                {group.items.map((attempt) => {
                  const topAlert = attempt.alerts[0];
                  const health = attemptHealth(attempt);
                  return (
                    <article className="resultCard" key={attempt.id}>
                      <div className="resultCardTop">
                        <div>
                          <strong>{attempt.student_name}</strong>
                          <span>
                            {attempt.student_admission_no} · Attempt {attempt.attempt_no}
                          </span>
                        </div>
                        <span className={`statusPill ${healthTone(health)}`}>{healthLabel(health)}</span>
                      </div>

                      <div className="resultKpiGrid">
                        <div>
                          <span>Score</span>
                          <strong>{attempt.final_score}</strong>
                        </div>
                        <div>
                          <span>Percentage</span>
                          <strong>{percentage(attempt.percentage)}</strong>
                        </div>
                        <div>
                          <span>Started</span>
                          <strong>{formatDateTime(attempt.started_at)}</strong>
                        </div>
                        <div>
                          <span>Time taken</span>
                          <strong>{formatDuration(attempt.time_taken_seconds)}</strong>
                        </div>
                        <div>
                          <span>Health reason</span>
                          <strong>{healthReason(attempt)}</strong>
                        </div>
                        <div>
                          <span>Accommodation</span>
                          <strong>{accommodationLabel(attempt)}</strong>
                        </div>
                        <div>
                          <span>Warnings</span>
                          <strong>{attempt.integrity_summary.violation_count}</strong>
                        </div>
                        <div>
                          <span>Latest signal</span>
                          <strong>{latestIntegrityLabel(attempt.integrity_summary.latest_event?.event_type)}</strong>
                        </div>
                      </div>

                      {attempt.alerts.length ? (
                        <div className="questionBankTagRow">
                          {topAlert ? <span className="questionBankTagChip">{topAlert.label}</span> : null}
                          {attempt.accommodation_snapshot.has_accommodations ? (
                            <span className="questionBankTagChip">{accommodationLabel(attempt)}</span>
                          ) : null}
                          {attempt.alerts.map((alert) => (
                            <span className="questionBankTagChip" key={`${attempt.id}-${alert.code}`}>
                              {alert.label}
                            </span>
                          ))}
                          {attempt.integrity_summary.threshold_reached ? (
                            <span className="questionBankTagChip">Integrity threshold reached</span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="resultCardFooter">
                        <div className="examStateSummary">
                          <span>Status</span>
                          <strong>{attempt.status.replaceAll("_", " ")}</strong>
                        </div>
                        <div className="resultCardActions">
                          <Link
                            className="button buttonSecondary"
                            href={buildResultsHref(currentPath, {
                              examId: selectedExam.id,
                              attemptId: attempt.id,
                              attemptFilter,
                              attemptSort,
                              attemptGroup,
                              attemptPage,
                              attemptPageSize,
                              questionFilter,
                              examListFilter,
                              examListSort,
                              examListGroup,
                              examPage: safeExamPage,
                              examPageSize,
                              leaderboardPage,
                              leaderboardPageSize,
                              topicPage,
                              topicPageSize,
                              questionPage,
                              questionPageSize,
                            })}
                          >
                            Inspect Attempt
                          </Link>
                          {attempt.can_force_submit ? (
                            <form action={runResultsForceSubmitAction}>
                              <input name="role" type="hidden" value={config.role} />
                              <input name="return_path" type="hidden" value={currentPath} />
                              <input name="exam_id" type="hidden" value={selectedExam.id} />
                              <input name="attempt_id" type="hidden" value={attempt.id} />
                              <button className="button buttonGhost" type="submit">
                                Force Submit
                              </button>
                            </form>
                          ) : attempt.force_submit_block_reason ? (
                            <span className="statusPill statusDemo">{attempt.force_submit_block_reason}</span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {attemptsPageData.count > attemptPageSize ? (
          <div className="workspaceFilterActions">
            <Link
              className="button buttonSecondary"
              href={
                attemptPage <= 1
                  ? "#"
                  : buildResultsHref(currentPath, {
                      examId: selectedExam.id,
                      attemptFilter,
                      attemptSort,
                      attemptGroup,
                      attemptPage: attemptPage - 1,
                      attemptPageSize,
                      questionFilter,
                      examListFilter,
                      examListSort,
                      examListGroup,
                      examPage: safeExamPage,
                      examPageSize,
                      leaderboardPage,
                      leaderboardPageSize,
                      topicPage,
                      topicPageSize,
                      questionPage,
                      questionPageSize,
                    })
              }
            >
              Previous
            </Link>
            <Link
              className="button buttonSecondary"
              href={
                attemptPage >= attemptTotalPages
                  ? "#"
                  : buildResultsHref(currentPath, {
                      examId: selectedExam.id,
                      attemptFilter,
                      attemptSort,
                      attemptGroup,
                      attemptPage: attemptPage + 1,
                      attemptPageSize,
                      questionFilter,
                      examListFilter,
                      examListSort,
                      examListGroup,
                      examPage: safeExamPage,
                      examPageSize,
                      leaderboardPage,
                      leaderboardPageSize,
                      topicPage,
                      topicPageSize,
                      questionPage,
                      questionPageSize,
                    })
              }
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}

function renderLeaderboardView(context: WorkspaceContext) {
  const {
    config,
    selectedExam,
    selectedSummary,
    leaderboardPageData,
    leaderboardPage,
    leaderboardPageSize,
    leaderboardTotalPages,
    currentPath,
    baseHrefArgs,
    workflowSteps,
    readiness,
  } = context;

  return (
    <>
      <section className="resultsSummaryGrid teacherResultsStatsGrid teacherResultsStatsGridFour">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Publication state</span>
          <strong>{readiness.label}</strong>
          <small>{readiness.note}</small>
        </article>
        <article className="metricCard">
          <span>Ranked learners</span>
          <strong>{leaderboardPageData.summary.ranked_count}</strong>
          <small>{leaderboardPageData.summary.total} leaderboard rows total</small>
        </article>
        <article className="metricCard">
          <span>Published results</span>
          <strong>{leaderboardPageData.summary.published_count}</strong>
          <small>Student-visible result rows already published</small>
        </article>
        <article className="metricCard">
          <span>Average score</span>
          <strong>{selectedSummary ? percentage(selectedSummary.average_percentage) : "N/A"}</strong>
          <small>Current exam average from the latest result summary</small>
        </article>
      </section>

      <section className="contentCard teacherResultsOverviewCard">
        <div className="sectionHeading">
          <strong>Publication checklist</strong>
          <span>{selectedExam.code}</span>
        </div>
        <div className="teacherWorkflowGrid">
          {workflowSteps.map((step, index) => (
            <article className="teacherWorkflowCard" key={`leaderboard-${step.id}`}>
              <div className="teacherWorkflowHeader">
                <div className="teacherWorkflowStepNo">Step {index + 1}</div>
                <span className={`statusPill ${step.tone}`}>{step.statusLabel}</span>
              </div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
              <small>{step.helper}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="contentCard">
        <div className="sectionHeading">
          <strong>Leaderboard</strong>
          <span>{leaderboardPageData.count} ranked entries</span>
        </div>

        {!leaderboardPageData.count ? (
          <p className="emptyText">No leaderboard rows are available yet for this exam.</p>
        ) : (
          <div className="resultsList">
            {leaderboardPageData.results.map((row: ResultsLeaderboardRow) => (
              <article className="resultCard" key={row.id}>
                <div className="resultCardTop">
                  <div>
                    <strong>{row.student_name}</strong>
                    <span>{row.student_admission_no}</span>
                  </div>
                  <span className="statusPill statusLive">Rank {row.rank ?? "N/A"}</span>
                </div>

                <div className="resultBreakdown">
                  <div>
                    <span>Final score</span>
                    <strong>{row.final_score}</strong>
                  </div>
                  <div>
                    <span>Percentage</span>
                    <strong>{percentage(row.percentage)}</strong>
                  </div>
                  <div>
                    <span>Time taken</span>
                    <strong>{formatDuration(row.time_taken_seconds)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {leaderboardPageData.count > leaderboardPageSize ? (
          <div className="workspaceFilterActions">
            <Link
              className="button buttonSecondary"
              href={
                leaderboardPage <= 1
                  ? "#"
                  : buildResultsHref(currentPath, {
                      ...baseHrefArgs,
                      leaderboardPage: leaderboardPage - 1,
                    })
              }
            >
              Previous
            </Link>
            <Link
              className="button buttonSecondary"
              href={
                leaderboardPage >= leaderboardTotalPages
                  ? "#"
                  : buildResultsHref(currentPath, {
                      ...baseHrefArgs,
                      leaderboardPage: leaderboardPage + 1,
                    })
              }
            >
              Next
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}

function renderAnalysisView(context: WorkspaceContext) {
  const {
    config,
    currentPath,
    selectedExam,
    selectedSummary,
    selectedAttempt,
    attemptFilter,
    attemptSort,
    questionFilter,
    questionAnalysisPageData,
    questionPage,
    questionPageSize,
    questionTotalPages,
    attemptsPageData,
    leaderboardPageData,
    attemptQuestionAnalysisData,
    topicPerformancePageData,
    topicPage,
    topicPageSize,
    topicTotalPages,
    studentQuestionFilter,
    studentQuestionSearch,
    baseHrefArgs,
  } = context;
  const topicRows = topicPerformancePageData.results;
  const questionRows = questionAnalysisPageData.results;
  const examRubricSummary = questionAnalysisPageData.summary?.rubric;
  const questionQualitySummary = questionAnalysisPageData.summary?.question_quality;
  const distractorQualitySummary = questionAnalysisPageData.summary?.distractor_quality;
  const studentRows = attemptsPageData.results;
  const examCorrectTotal = questionRows.reduce((sum, row) => sum + row.correct_count, 0);
  const examWrongTotal = questionRows.reduce((sum, row) => sum + row.wrong_count, 0);
  const examSkippedTotal = questionRows.reduce((sum, row) => sum + row.skipped_count, 0);
  const examAttemptedTotal = examCorrectTotal + examWrongTotal;
  const examAccuracy = examAttemptedTotal > 0 ? Math.round((examCorrectTotal / examAttemptedTotal) * 100) : 0;
  const examSkipRate =
    examCorrectTotal + examWrongTotal + examSkippedTotal > 0
      ? Math.round((examSkippedTotal / (examCorrectTotal + examWrongTotal + examSkippedTotal)) * 100)
      : 0;
  const strongTopics = topicRows.filter((row) => Number(row.percentage) >= 70).length;
  const weakTopics = topicRows.filter((row) => Number(row.percentage) < 40).length;
  const totalTopics = topicRows.length;
  const lowPerformers = studentRows.filter((attempt) => Number(attempt.percentage) < 40).length;
  const skippedHeavyStudents = studentRows.filter((attempt) => attempt.skipped_questions >= 2).length;
  const studentQuestionRows = attemptQuestionAnalysisData.results;
  const studentQuestionSummary = attemptQuestionAnalysisData.summary;
  const selectedStudentAttempt = attemptQuestionAnalysisData.selected_attempt ?? selectedAttempt;
  const rubricQuestionRows = studentQuestionRows.filter(
    (row) => row.has_rubric && Array.isArray(row.rubric_scores) && row.rubric_scores.length > 0,
  );
  const rubricCriterionInsights = Array.from(
    rubricQuestionRows
      .flatMap((row) => row.rubric_scores ?? [])
      .reduce(
        (map, score) => {
          const key = score.criterion_key;
          const current = map.get(key) ?? {
            criterion_key: key,
            criterion_label: score.criterion_label || key,
            awarded_total: 0,
            max_total: 0,
            attempts: 0,
          };
          current.awarded_total += Number(score.awarded_score || 0);
          current.max_total += Number(score.max_score || 0);
          current.attempts += 1;
          map.set(key, current);
          return map;
        },
        new Map<
          string,
          {
            criterion_key: string;
            criterion_label: string;
            awarded_total: number;
            max_total: number;
            attempts: number;
          }
        >(),
      )
      .values(),
  )
    .map((item) => ({
      ...item,
      percentage: item.max_total > 0 ? Math.round((item.awarded_total / item.max_total) * 100) : 0,
      awarded_average: item.attempts > 0 ? (item.awarded_total / item.attempts).toFixed(2) : "0.00",
      max_average: item.attempts > 0 ? (item.max_total / item.attempts).toFixed(2) : "0.00",
    }))
    .sort((left, right) => left.percentage - right.percentage || left.criterion_label.localeCompare(right.criterion_label));
  const weakestRubricCriterion = rubricCriterionInsights[0] ?? null;
  const assessmentLens = resolveAssessmentAnalyticsLens(selectedExam);
  const familyInsightCards = buildAssessmentFamilyInsights({
    familyCode: assessmentLens.familyCode,
    examAccuracy,
    examSkipRate,
    strongTopics,
    weakTopics,
    lowPerformers,
    skippedHeavyStudents,
    totalTopics,
    questionQualitySummary,
    examRubricSummary,
  });
  const familyDeepDivePanels = buildAssessmentFamilyDeepDive({
    familyCode: assessmentLens.familyCode,
    selectedSummary,
    leaderboardRows: leaderboardPageData.results,
    studentRows,
    topicRows,
    questionQualitySummary,
    distractorQualitySummary,
    examRubricSummary,
  });

  return (
    <>
      <section className="contentCard analyticsResultHero">
        <div className="analyticsResultHeroMain">
          <div className="analyticsResultHeroCopy">
            <span className="studentDashboardTag">Analytics Flow</span>
            <strong>All exams to exam-wise to student-wise to question-wise evidence</strong>
            <p>
              Use this workspace to move from overall exam health into one learner’s exact answer trail
              without losing context. Start from the exam summary, inspect student clusters, then open
              the selected student’s question evidence below.
            </p>
            <div className="questionBankTagRow">
              <span className="questionBankTagChip">Exam: {selectedExam.code}</span>
              <span className={`statusPill ${assessmentFamilyTone(assessmentLens.familyCode)}`}>
                {assessmentLens.familyLabel}
              </span>
              <span className="questionBankTagChip">
                Student: {selectedStudentAttempt?.student_name ?? "Choose from explorer"}
              </span>
              <span className="questionBankTagChip">
                View: {studentQuestionFilter.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="analyticsResultHeroMetaGrid">
            <article className="analyticsResultHeroMetaCard">
              <span>Assessment family</span>
              <strong>{assessmentLens.familyLabel}</strong>
              <small>{assessmentLens.deliveryEmphasis}</small>
            </article>
            <article className="analyticsResultHeroMetaCard">
              <span>Exam average</span>
              <strong>{selectedSummary ? percentage(selectedSummary.average_percentage) : "N/A"}</strong>
              <small>Latest calculated performance for this exam</small>
            </article>
            <article className="analyticsResultHeroMetaCard">
              <span>Accuracy</span>
              <strong>{examAccuracy}%</strong>
              <small>Correct answers across the visible question evidence</small>
            </article>
            <article className="analyticsResultHeroMetaCard">
              <span>Skip pressure</span>
              <strong>{examSkipRate}%</strong>
              <small>Share of skipped responses in the visible risk board</small>
            </article>
            <article className="analyticsResultHeroMetaCard">
              <span>Low performers</span>
              <strong>{lowPerformers}</strong>
              <small>Students in the current exam list under 40%</small>
            </article>
          </div>
        </div>
      </section>

      <section className="analyticsResultShowcaseGrid">
        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Analysis lens</strong>
            <span>{assessmentLens.familyLabel}</span>
          </div>
          <p>{assessmentLens.summary}</p>
          <div className="questionBankTagRow">
            {assessmentLens.focusAreas.map((item) => (
              <span className="questionBankTagChip" key={item}>
                {item}
              </span>
            ))}
          </div>
          <div className="analyticsResultGaugeMeta">
            <div>
              <span>Delivery mode</span>
              <strong>{assessmentLens.deliveryModeLabel}</strong>
            </div>
            <div>
              <span>Timer mode</span>
              <strong>{assessmentLens.timerModeLabel}</strong>
            </div>
            <div>
              <span>Navigation mode</span>
              <strong>{assessmentLens.navigationModeLabel}</strong>
            </div>
          </div>
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Family focus board</strong>
            <span>{assessmentLens.familyLabel}</span>
          </div>
          <p>
            These signals are prioritized for this assessment family so teachers and institutes can
            act faster without reading every metric the same way.
          </p>
          <div className="teacherResultsReadinessBoard">
            {familyInsightCards.map((card) => (
              <article className="teacherResultsReadinessCard" key={card.title}>
                <div className="teacherResultsReadinessCardTop">
                  <strong>{card.title}</strong>
                  <span className={`statusPill ${card.tone}`}>{card.value}</span>
                </div>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="contentCard analyticsResultShowcaseCard analyticsResultDeepDiveCard">
          <div className="sectionHeading">
            <strong>{assessmentLens.familyLabel} deep dive</strong>
            <span>{familyDeepDivePanels.length} focused lane{familyDeepDivePanels.length === 1 ? "" : "s"}</span>
          </div>
          <p>
            This view changes how the same exam evidence should be interpreted for this assessment family,
            so teams can move from metrics into specific intervention or bank actions faster.
          </p>
          <div className="analyticsResultDeepDiveGrid">
            {familyDeepDivePanels.map((panel) => (
              <article className="analyticsResultDeepDivePanel" key={panel.title}>
                <div className="resultCardTop">
                  <strong>{panel.title}</strong>
                  <span className={`statusPill ${panel.tone}`}>{assessmentLens.familyLabel}</span>
                </div>
                <p>{panel.summary}</p>
                <div className="analyticsResultGaugeMeta">
                  {panel.metrics.map((metric) => (
                    <div key={`${panel.title}-${metric.label}`}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="questionBankTagRow">
                  {panel.callouts.map((callout) => (
                    <span className="questionBankTagChip" key={callout}>
                      {callout}
                    </span>
                  ))}
                </div>
                <div className="analyticsResultActionList">
                  {panel.actions.map((action) => (
                    <div className="analyticsResultActionItem" key={action}>
                      {action}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Exam pulse</strong>
            <span>{selectedExam.title}</span>
          </div>
          <div className="analyticsResultGaugeRow">
            <div
              className="analyticsResultGauge"
              style={{ background: `conic-gradient(var(--brand-primary, #5b6cff) 0 ${Math.max(examAccuracy, 4)}%, rgba(91, 108, 255, 0.12) 0 100%)` }}
            >
              <div>
                <strong>{examAccuracy}%</strong>
                <span>Accuracy</span>
              </div>
            </div>
            <div className="analyticsResultGaugeMeta">
              <div>
                <span>Strong topics</span>
                <strong>{strongTopics}</strong>
              </div>
              <div>
                <span>Weak topics</span>
                <strong>{weakTopics}</strong>
              </div>
              <div>
                <span>Skipped-heavy students</span>
                <strong>{skippedHeavyStudents}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Section distribution</strong>
            <span>{selectedSummary?.section_performance?.length ?? 0} sections</span>
          </div>
          {!selectedSummary?.section_performance?.length ? (
            <p className="emptyText">Section analytics will appear once results and answer data are available.</p>
          ) : (
            <div className="analyticsResultBarStack">
              {selectedSummary.section_performance.map((section) => (
                <div className="analyticsResultBarRow" key={section.section_id ?? section.section_name}>
                  <div className="analyticsResultBarMeta">
                    <strong>{section.section_name}</strong>
                    <span>
                      {section.total_questions} question{section.total_questions === 1 ? "" : "s"} · avg time{" "}
                      {formatCompactSeconds(section.average_time_seconds)}
                    </span>
                  </div>
                  <div className="analyticsResultBarTrack">
                    <div
                      className="analyticsResultBarFill"
                      style={{ width: `${Math.max(4, Math.min(section.accuracy_percentage, 100))}%` }}
                    />
                  </div>
                  <strong>{Math.round(section.accuracy_percentage)}%</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Topic strength</strong>
            <span>{topicPerformancePageData.count} topic rows</span>
          </div>
          {!topicRows.length ? (
            <p className="emptyText">No topic performance rows are available for this exam.</p>
          ) : (
            <div className="analyticsResultBarStack">
              {topicRows.map((row: ResultsTopicRow) => {
                const percent = Math.max(0, Math.min(Number(row.percentage), 100));
                return (
                  <div className="analyticsResultBarRow" key={row.id}>
                    <div className="analyticsResultBarMeta">
                      <strong>{row.topic_name || "Unmapped topic"}</strong>
                      <span>{row.subject_name}</span>
                    </div>
                    <div className="analyticsResultBarTrack">
                      <div className="analyticsResultBarFill" style={{ width: `${percent}%` }} />
                    </div>
                    <strong>{percent}%</strong>
                  </div>
                );
              })}
            </div>
          )}
          {topicPerformancePageData.count > topicPageSize ? (
            <div className="workspaceFilterActions">
              <Link className="button buttonSecondary" href={topicPage <= 1 ? "#" : buildResultsHref(currentPath, { ...baseHrefArgs, topicPage: topicPage - 1 })}>
                Previous
              </Link>
              <Link className="button buttonSecondary" href={topicPage >= topicTotalPages ? "#" : buildResultsHref(currentPath, { ...baseHrefArgs, topicPage: topicPage + 1 })}>
                Next
              </Link>
            </div>
          ) : null}
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Bank action queue</strong>
            <span>{questionQualitySummary?.revision_candidates ?? 0} in review lane</span>
          </div>
          <p>
            Use the question-quality summary to decide whether this exam should trigger bank cleanup,
            wording refinement, or more live sampling before the next release.
          </p>
          <div className="analyticsResultGaugeMeta">
            <div>
              <span>Healthy</span>
              <strong>{questionQualitySummary?.healthy_questions ?? 0}</strong>
            </div>
            <div>
              <span>Watch</span>
              <strong>{questionQualitySummary?.watch_questions ?? 0}</strong>
            </div>
            <div>
              <span>Ambiguous</span>
              <strong>{questionQualitySummary?.ambiguous_questions ?? 0}</strong>
            </div>
            <div>
              <span>Emerging</span>
              <strong>{questionQualitySummary?.emerging_questions ?? 0}</strong>
            </div>
          </div>
          {questionQualitySummary?.top_revision_topics?.length ? (
            <>
              <div className="sectionHeading">
                <strong>Top revision topics</strong>
                <span>{questionQualitySummary.top_revision_topics.length} hotspot(s)</span>
              </div>
              <div className="questionBankTagRow">
                {questionQualitySummary.top_revision_topics.map((topic) => (
                  <span className="questionBankTagChip" key={topic.topic_name}>
                    {topic.topic_name}: {topic.count}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          <div className="teacherResultsReadinessCard">
            <div className="teacherResultsReadinessCardTop">
              <strong>Recommended next actions</strong>
              <span className="statusPill statusDemo">
                {questionQualitySummary?.recommended_actions?.length ?? 0}
              </span>
            </div>
            <ul>
              {(questionQualitySummary?.recommended_actions ?? [
                "Question-quality actions will appear once enough answer evidence is available.",
              ]).map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Distractor quality board</strong>
            <span>{distractorQualitySummary?.weak_distractors ?? 0} weak distractor(s)</span>
          </div>
          <p>
            Track whether answer options are actually separating learners. Weak distractors, untested options,
            and keyed-answer review signals usually point to the next bank-cleanup work.
          </p>
          <div className="analyticsResultGaugeMeta">
            <div>
              <span>Weak distractors</span>
              <strong>{distractorQualitySummary?.weak_distractors ?? 0}</strong>
            </div>
            <div>
              <span>Untested distractors</span>
              <strong>{distractorQualitySummary?.untested_distractors ?? 0}</strong>
            </div>
            <div>
              <span>Strong distractors</span>
              <strong>{distractorQualitySummary?.strong_distractors ?? 0}</strong>
            </div>
            <div>
              <span>Key review</span>
              <strong>{distractorQualitySummary?.key_review_options ?? 0}</strong>
            </div>
          </div>
          {distractorQualitySummary?.top_weak_distractors?.length ? (
            <div className="analyticsResultInsightList">
              {distractorQualitySummary.top_weak_distractors.map((item) => (
                <article className="analyticsResultInsightCard" key={`weak-${item.option_id}`}>
                  <div className="resultCardTop">
                    <strong>{item.option_text_summary}</strong>
                    <span className={`statusPill ${distractorTone(item.distractor_signal)}`}>
                      {item.distractor_signal.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{item.distractor_note}</p>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Question risk board</strong>
            <span>{questionAnalysisPageData.count} shown</span>
          </div>
          <div className="questionBankButtonRow">
            <Link className={`button ${questionFilter === "all" ? "buttonPrimary" : "buttonGhost"}`} href={buildResultsHref(currentPath, { ...baseHrefArgs, questionFilter: "all", questionPage: 1 })}>
              All
            </Link>
            <Link className={`button ${questionFilter === "hard_questions" ? "buttonPrimary" : "buttonGhost"}`} href={buildResultsHref(currentPath, { ...baseHrefArgs, questionFilter: "hard_questions", questionPage: 1 })}>
              Hard
            </Link>
            <Link className={`button ${questionFilter === "skipped_often" ? "buttonPrimary" : "buttonGhost"}`} href={buildResultsHref(currentPath, { ...baseHrefArgs, questionFilter: "skipped_often", questionPage: 1 })}>
              Skipped Often
            </Link>
            <Link className={`button ${questionFilter === "revision_candidates" ? "buttonPrimary" : "buttonGhost"}`} href={buildResultsHref(currentPath, { ...baseHrefArgs, questionFilter: "revision_candidates", questionPage: 1 })}>
              Revision Candidates
            </Link>
          </div>
          <div className="questionBankTagRow">
            <span className="questionBankTagChip">
              {questionQualitySummary?.revision_candidates ?? 0} revision candidates
            </span>
            <span className="questionBankTagChip">
              {questionQualitySummary?.urgent_revision_candidates ?? 0} urgent
            </span>
            <span className="questionBankTagChip">
              {questionQualitySummary?.high_skip_questions ?? 0} skip risk
            </span>
            <span className="questionBankTagChip">
              {questionQualitySummary?.hard_questions ?? 0} hard
            </span>
          </div>
          {!questionRows.length ? (
            <p className="emptyText">No question analysis records are available for this exam yet.</p>
          ) : (
            <div className="analyticsResultRiskList">
              {questionRows.map((row: ResultsQuestionRow) => {
                const total = Math.max(row.correct_count + row.wrong_count + row.skipped_count, 1);
                return (
                  <article className="analyticsResultRiskCard" key={row.question_id}>
                    <div className="resultCardTop">
                      <div>
                        <strong>{row.question_text_summary}</strong>
                        <span>
                          {row.subject_name || "No subject"}
                          {row.topic_name ? ` · ${row.topic_name}` : ""}
                        </span>
                      </div>
                      <span className={`statusPill ${questionQualityTone(row.quality_signal)}`}>
                        {row.revision_priority} priority
                      </span>
                    </div>
                    {row.passage_title ? (
                      <div className="questionBankTagRow">
                        <span className="questionBankTagChip">Comprehension</span>
                        <span className="questionBankTagChip">{row.passage_title}</span>
                      </div>
                    ) : null}
                    <div className="questionBankTagRow">
                      <span className={`statusPill ${questionQualityTone(row.quality_signal)}`}>
                        {row.quality_signal.replaceAll("_", " ")}
                      </span>
                      <span className="questionBankTagChip">{Math.round(row.wrong_rate)}% wrong</span>
                      <span className="questionBankTagChip">{Math.round(row.skip_rate)}% skipped</span>
                    </div>
                    {row.revision_reasons.length ? (
                      <div className="questionBankTagRow">
                        {row.revision_reasons.map((reason) => (
                          <span className="questionBankTagChip" key={`${row.question_id}-${reason}`}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="analyticsResultRiskBar">
                      <div className="analyticsResultRiskBarCorrect" style={{ width: `${(row.correct_count / total) * 100}%` }} />
                      <div className="analyticsResultRiskBarWrong" style={{ width: `${(row.wrong_count / total) * 100}%` }} />
                      <div className="analyticsResultRiskBarSkipped" style={{ width: `${(row.skipped_count / total) * 100}%` }} />
                    </div>
                    <div className="analyticsResultRiskLegend">
                      <span>Correct {row.correct_count}</span>
                      <span>Wrong {row.wrong_count}</span>
                      <span>Skipped {row.skipped_count}</span>
                    </div>
                    <p>{row.quality_note}</p>
                    {row.distractor_insights.length ? (
                      <div className="analyticsResultInsightList">
                        {row.distractor_insights.map((distractor) => (
                          <article className="analyticsResultInsightCard" key={distractor.option_id}>
                            <div className="resultCardTop">
                              <strong>{distractor.option_text_summary}</strong>
                              <span className={`statusPill ${distractorTone(distractor.distractor_signal)}`}>
                                {distractor.distractor_signal.replaceAll("_", " ")}
                              </span>
                            </div>
                            <div className="questionBankTagRow">
                              <span className="questionBankTagChip">{Math.round(distractor.selection_rate)}% selected</span>
                              <span className="questionBankTagChip">{distractor.selected_wrong_count} wrong picks</span>
                              {distractor.is_correct ? (
                                <span className="questionBankTagChip">Key option</span>
                              ) : null}
                            </div>
                            <p>{distractor.distractor_note}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
          {questionAnalysisPageData.count > questionPageSize ? (
            <div className="workspaceFilterActions">
              <Link className="button buttonSecondary" href={questionPage <= 1 ? "#" : buildResultsHref(currentPath, { ...baseHrefArgs, questionPage: questionPage - 1 })}>
                Previous
              </Link>
              <Link className="button buttonSecondary" href={questionPage >= questionTotalPages ? "#" : buildResultsHref(currentPath, { ...baseHrefArgs, questionPage: questionPage + 1 })}>
                Next
              </Link>
            </div>
          ) : null}
        </article>

        <article className="contentCard analyticsResultShowcaseCard">
          <div className="sectionHeading">
            <strong>Cohort rubric insight</strong>
            <span>
              {examRubricSummary?.reviewed_responses
                ? `${examRubricSummary.reviewed_responses} reviewed response${examRubricSummary.reviewed_responses === 1 ? "" : "s"}`
                : "No rubric data"}
            </span>
          </div>
          {!examRubricSummary?.criteria_count ? (
            <p className="emptyText">No rubric-backed review data is available for this exam yet.</p>
          ) : (
            <>
              <div className="analyticsResultGaugeMeta">
                <div>
                  <span>Tracked criteria</span>
                  <strong>{examRubricSummary.criteria_count}</strong>
                </div>
                <div>
                  <span>Weakest cohort criterion</span>
                  <strong>{examRubricSummary.weakest_criteria[0]?.criterion_label ?? "N/A"}</strong>
                </div>
                <div>
                  <span>Lowest mastery</span>
                  <strong>
                    {typeof examRubricSummary.weakest_criteria[0]?.average_percentage === "number"
                      ? `${examRubricSummary.weakest_criteria[0].average_percentage}%`
                      : "N/A"}
                  </strong>
                </div>
              </div>

              <div className="analyticsResultBarStack">
                {examRubricSummary.weakest_criteria.map((criterion) => (
                  <div className="analyticsResultBarRow" key={criterion.criterion_key}>
                    <div className="analyticsResultBarMeta">
                      <strong>{criterion.criterion_label}</strong>
                      <span>
                        Avg {criterion.average_awarded_score.toFixed(2)} / {criterion.average_max_score.toFixed(2)} across{" "}
                        {criterion.reviewed_count} reviewed response{criterion.reviewed_count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="analyticsResultBarTrack">
                      <div className="analyticsResultBarFill" style={{ width: `${criterion.average_percentage}%` }} />
                    </div>
                    <strong>{criterion.average_percentage}%</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className="analyticsResultExplorerLayout">
        <article className="contentCard analyticsResultStudentRail">
          <div className="sectionHeading">
            <strong>Student explorer</strong>
            <span>{attemptsPageData.count} students in scope</span>
          </div>
          <form className="workspaceFiltersForm" method="GET">
            <input name="exam" type="hidden" value={selectedExam.id} />
            <input name="question_filter" type="hidden" value={questionFilter} />
            <input name="exam_list_filter" type="hidden" value={baseHrefArgs.examListFilter} />
            <input name="exam_list_sort" type="hidden" value={baseHrefArgs.examListSort} />
            <input name="exam_list_group" type="hidden" value={baseHrefArgs.examListGroup} />
            <input name="exam_page" type="hidden" value={String(baseHrefArgs.examPage)} />
            <input name="exam_page_size" type="hidden" value={String(baseHrefArgs.examPageSize)} />
            <input name="leaderboard_page" type="hidden" value={String(baseHrefArgs.leaderboardPage)} />
            <input name="leaderboard_page_size" type="hidden" value={String(baseHrefArgs.leaderboardPageSize)} />
            <input name="topic_page" type="hidden" value={String(baseHrefArgs.topicPage)} />
            <input name="topic_page_size" type="hidden" value={String(baseHrefArgs.topicPageSize)} />
            <input name="question_page" type="hidden" value={String(baseHrefArgs.questionPage)} />
            <input name="question_page_size" type="hidden" value={String(baseHrefArgs.questionPageSize)} />
            <input name="student_question_filter" type="hidden" value={studentQuestionFilter} />
            <input name="student_question_search" type="hidden" value={studentQuestionSearch} />
            <label className="workspaceFilterField">
              <span>Student filter</span>
              <select defaultValue={attemptFilter} name="attempt_filter">
                <option value="all">All students</option>
                <option value="low_performers">Low performers</option>
                <option value="skipped_heavy">Skipped heavy</option>
                <option value="critical">Critical</option>
                <option value="watch">Watch</option>
                <option value="auto_submitted">Auto submitted</option>
              </select>
            </label>
            <label className="workspaceFilterField">
              <span>Student sort</span>
              <select defaultValue={attemptSort} name="attempt_sort">
                <option value="latest">Latest</option>
                <option value="score_low">Lowest score</option>
                <option value="warnings_high">Most warnings</option>
                <option value="time_long">Longest time</option>
              </select>
            </label>
            <div className="workspaceFilterActions">
              <button className="button buttonPrimary" type="submit">
                Refresh student rail
              </button>
            </div>
          </form>

          <div className="analyticsResultStudentList">
            {studentRows.length ? (
              studentRows.map((attempt) => {
                const isActive = attempt.id === selectedStudentAttempt?.id;
                return (
                  <Link
                    key={attempt.id}
                    className={`analyticsResultStudentCard${isActive ? " analyticsResultStudentCardActive" : ""}`}
                    href={buildResultsHref(currentPath, {
                      ...baseHrefArgs,
                      attemptId: attempt.id,
                    })}
                  >
                    <div className="resultCardTop">
                      <div>
                        <strong>{attempt.student_name}</strong>
                        <span>{attempt.student_admission_no}</span>
                      </div>
                      <span className={`statusPill ${healthTone(attemptHealth(attempt))}`}>
                        {Math.round(Number(attempt.percentage))}%
                      </span>
                    </div>
                    <div className="analyticsResultStudentMeta">
                      <span>{attempt.correct_answers} correct</span>
                      <span>{attempt.incorrect_answers} wrong</span>
                      <span>{attempt.skipped_questions} skipped</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="emptyText">No students matched the current analysis filter.</p>
            )}
          </div>
        </article>

        <div className="analyticsResultStudentCanvas">
          <section className="contentCard analyticsResultStudentSummary">
            <div className="sectionHeading">
              <strong>Selected student</strong>
              <span>{selectedStudentAttempt?.student_name ?? "No student selected"}</span>
            </div>

            {selectedStudentAttempt ? (
              <>
                <div className="resultsSummaryGrid teacherResultsStatsGrid teacherResultsStatsGridFour">
                  <article className="metricCard">
                    <span>Score</span>
                    <strong>{percentage(selectedStudentAttempt.percentage)}</strong>
                    <small>{selectedStudentAttempt.final_score} final marks</small>
                  </article>
                  <article className="metricCard">
                    <span>Attempted</span>
                    <strong>{studentQuestionSummary.attempted_questions}</strong>
                    <small>{studentQuestionSummary.total_questions} total questions</small>
                  </article>
                  <article className="metricCard">
                    <span>Wrong</span>
                    <strong>{studentQuestionSummary.wrong_count}</strong>
                    <small>{studentQuestionSummary.skipped_count} skipped</small>
                  </article>
                  <article className="metricCard">
                    <span>Average pace</span>
                    <strong>{formatDuration(studentQuestionSummary.average_time_seconds)}</strong>
                    <small>{formatDuration(studentQuestionSummary.total_time_seconds)} total tracked time</small>
                  </article>
                </div>

                <div className="analyticsResultQuestionToolbar">
                  <div className="questionBankButtonRow">
                    {[
                      { label: "All", value: "all" as const },
                      { label: "Wrong", value: "wrong" as const },
                      { label: "Skipped", value: "skipped" as const },
                      { label: "Marked", value: "marked" as const },
                      { label: "Slow", value: "slow" as const },
                    ].map((chip) => (
                      <Link
                        key={chip.value}
                        className={`button ${studentQuestionFilter === chip.value ? "buttonPrimary" : "buttonGhost"}`}
                        href={buildResultsHref(currentPath, {
                          ...baseHrefArgs,
                          studentQuestionFilter: chip.value,
                        })}
                      >
                        {chip.label}
                      </Link>
                    ))}
                  </div>

                  <form className="analyticsResultSearchForm" method="GET">
                    <input name="exam" type="hidden" value={selectedExam.id} />
                    <input name="attempt" type="hidden" value={selectedStudentAttempt.id} />
                    <input name="attempt_filter" type="hidden" value={attemptFilter} />
                    <input name="attempt_sort" type="hidden" value={attemptSort} />
                    <input name="attempt_group" type="hidden" value={baseHrefArgs.attemptGroup} />
                    <input name="question_filter" type="hidden" value={questionFilter} />
                    <input name="exam_list_filter" type="hidden" value={baseHrefArgs.examListFilter} />
                    <input name="exam_list_sort" type="hidden" value={baseHrefArgs.examListSort} />
                    <input name="exam_list_group" type="hidden" value={baseHrefArgs.examListGroup} />
                    <input name="exam_page" type="hidden" value={String(baseHrefArgs.examPage)} />
                    <input name="exam_page_size" type="hidden" value={String(baseHrefArgs.examPageSize)} />
                    <input name="attempt_page" type="hidden" value={String(baseHrefArgs.attemptPage)} />
                    <input name="attempt_page_size" type="hidden" value={String(baseHrefArgs.attemptPageSize)} />
                    <input name="leaderboard_page" type="hidden" value={String(baseHrefArgs.leaderboardPage)} />
                    <input name="leaderboard_page_size" type="hidden" value={String(baseHrefArgs.leaderboardPageSize)} />
                    <input name="topic_page" type="hidden" value={String(baseHrefArgs.topicPage)} />
                    <input name="topic_page_size" type="hidden" value={String(baseHrefArgs.topicPageSize)} />
                    <input name="question_page" type="hidden" value={String(baseHrefArgs.questionPage)} />
                    <input name="question_page_size" type="hidden" value={String(baseHrefArgs.questionPageSize)} />
                    <input name="student_question_filter" type="hidden" value={studentQuestionFilter} />
                    <label className="workspaceFilterField analyticsResultSearchField">
                      <span>Question search</span>
                      <input defaultValue={studentQuestionSearch} name="student_question_search" placeholder="Search question, subject, or topic" />
                    </label>
                    <button className="button buttonSecondary" type="submit">
                      Apply
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <p className="emptyText">Choose a student from the explorer to open question-wise evidence.</p>
            )}
          </section>

          <section className="contentCard analyticsResultShowcaseCard">
            <div className="sectionHeading">
              <strong>Rubric insight</strong>
              <span>
                {selectedStudentAttempt
                  ? `${rubricQuestionRows.length} rubric-scored response${rubricQuestionRows.length === 1 ? "" : "s"}`
                  : "Student not selected"}
              </span>
            </div>

            {!selectedStudentAttempt ? (
              <p className="emptyText">Choose a student to inspect criterion-level rubric performance.</p>
            ) : !rubricCriterionInsights.length ? (
              <p className="emptyText">No rubric-backed review data is available for this student yet.</p>
            ) : (
              <>
                <div className="analyticsResultGaugeMeta">
                  <div>
                    <span>Tracked criteria</span>
                    <strong>{rubricCriterionInsights.length}</strong>
                  </div>
                  <div>
                    <span>Weakest criterion</span>
                    <strong>{weakestRubricCriterion?.criterion_label ?? "N/A"}</strong>
                  </div>
                  <div>
                    <span>Lowest mastery</span>
                    <strong>{weakestRubricCriterion ? `${weakestRubricCriterion.percentage}%` : "N/A"}</strong>
                  </div>
                </div>

                <div className="analyticsResultBarStack">
                  {rubricCriterionInsights.slice(0, 5).map((criterion) => (
                    <div className="analyticsResultBarRow" key={criterion.criterion_key}>
                      <div className="analyticsResultBarMeta">
                        <strong>{criterion.criterion_label}</strong>
                        <span>
                          Avg {criterion.awarded_average} / {criterion.max_average} across {criterion.attempts} response
                          {criterion.attempts === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="analyticsResultBarTrack">
                        <div className="analyticsResultBarFill" style={{ width: `${criterion.percentage}%` }} />
                      </div>
                      <strong>{criterion.percentage}%</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="contentCard analyticsResultQuestionEvidence">
            <div className="sectionHeading">
              <strong>Question-wise evidence</strong>
              <span>{studentQuestionRows.length} rows</span>
            </div>

            {!selectedStudentAttempt ? (
              <p className="emptyText">Question evidence appears after a student is selected.</p>
            ) : !studentQuestionRows.length ? (
              <p className="emptyText">No question rows matched the current student question filter.</p>
            ) : (
              <div className="analyticsResultQuestionList">
                {studentQuestionRows.map((row, index) => {
                  const previousRow = studentQuestionRows[index - 1];
                  const shouldShowPassageTrigger =
                    Boolean(row.passage && row.passage_text) &&
                    previousRow?.passage !== row.passage;
                  const rowNeedsManualReview = isManualReviewRow(row);
                  const maxMarks = row.question_marks ?? "0.00";
                  const presentationProfile = buildQuestionTypePresentationProfile(
                    row.question_type_definition,
                  );
                  const promptQuestion = {
                    question_text: row.question_text,
                    assertion_text: row.assertion_text,
                    reason_text: row.reason_text,
                    matrix_left_items: row.matrix_left_items,
                    matrix_right_items: row.matrix_right_items,
                    question_type_definition: row.question_type_definition,
                    passage_detail: row.passage
                      ? {
                          title: row.passage_title || "Comprehension passage",
                          content_format: row.passage_content_format,
                          passage_text: row.passage_text,
                          description: row.passage_description,
                        }
                      : null,
                    attachments: row.attachments,
                    media_context: row.media_context,
                  };

                  return (
                  <article className="analyticsResultQuestionCard" key={`${selectedStudentAttempt.id}-${row.question_id}`}>
                    <div className="resultCardTop">
                      <div>
                        <strong>Q{row.question_order}. {getStudentQuestionPromptTitle(promptQuestion)}</strong>
                        <span>
                          {row.subject_name || "No subject"}
                          {row.topic_name ? ` · ${row.topic_name}` : ""}
                        </span>
                      </div>
                      <span
                        className={`statusPill ${
                          row.outcome === "correct"
                            ? "statusLive"
                            : row.outcome === "wrong"
                              ? "statusWarning"
                              : "statusDemo"
                        }`}
                      >
                        {row.outcome}
                      </span>
                    </div>

                    <StudentQuestionPrompt
                      passageBadgeLabel="Shared passage"
                      passageButtonLabel="Open Passage"
                      passageMetaLabel={row.passage_title || "Comprehension"}
                      question={promptQuestion}
                      showPassageTrigger={shouldShowPassageTrigger}
                    />

                    <div className="questionBankTagRow">
                      <span className="questionBankTagChip">
                        {row.question_type_definition?.label ?? row.question_type.replaceAll("_", " ")}
                      </span>
                      {row.passage_title ? <span className="questionBankTagChip">{row.passage_title}</span> : null}
                      {row.is_marked_for_review ? <span className="questionBankTagChip">Marked for review</span> : null}
                      {rowNeedsManualReview ? (
                        <span className={`statusPill ${manualReviewStatusTone(row.evaluation_status)}`}>
                          {manualReviewStatusLabel(row.evaluation_status)}
                        </span>
                      ) : null}
                      {row.selected_option_text ? <span className="questionBankTagChip">Selected: {row.selected_option_text}</span> : null}
                      {!row.selected_option_text && row.selected_option_texts.length ? (
                        <span className="questionBankTagChip">Selected: {row.selected_option_texts.join(", ")}</span>
                      ) : null}
                    </div>

                    {row.answer_text ? (
                      <div className="analyticsResultAnswerPanel">
                        <div className="sectionHeading">
                          <strong>Student response</strong>
                          <span>{rowNeedsManualReview ? "Use this to score the answer" : "Captured text response"}</span>
                        </div>
                        <div className="analyticsResultAnswerBody">{row.answer_text}</div>
                        {row.answer_transcript ? (
                          <div className="analyticsResultReviewNotes">
                            <span>Transcript</span>
                            <p>{row.answer_transcript}</p>
                          </div>
                        ) : null}
                        {presentationProfile.supportsAcceptedAnswers && row.accepted_answers.length ? (
                          <div className="analyticsResultReviewNotes">
                            <span>{presentationProfile.acceptedAnswersLabel}</span>
                            <p>{row.accepted_answers.map(reviewOptionText).join(" / ")}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {row.response_artifacts.length ? (
                      <div className="attemptArtifactList">
                        {row.response_artifacts.map((artifact) => (
                          <div className="attemptArtifactRow" key={artifact.upload_token}>
                            <div>
                              <strong>{artifact.file_name || artifact.asset_kind.replaceAll("_", " ")}</strong>
                              <span>
                                {artifact.asset_kind.replaceAll("_", " ")}
                                {artifact.storage_status ? ` · ${artifact.storage_status}` : ""}
                              </span>
                            </div>
                            {artifact.file_url ? (
                              <Link className="button buttonGhost" href={artifact.file_url} target="_blank">
                                Open
                              </Link>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="analyticsResultQuestionStats">
                      <div>
                        <span>Awarded</span>
                        <strong>{row.marks_awarded ?? "0.00"}</strong>
                      </div>
                      <div>
                        <span>Max marks</span>
                        <strong>{row.question_marks ?? "0.00"}</strong>
                      </div>
                      <div>
                        <span>Negative</span>
                        <strong>{row.negative_marks_applied ?? "0.00"}</strong>
                      </div>
                      <div>
                        <span>Time spent</span>
                        <strong>{formatDuration(row.time_spent_seconds)}</strong>
                      </div>
                      <div>
                        <span>Answered at</span>
                        <strong>{formatDateTime(row.answered_at)}</strong>
                      </div>
                    </div>

                    {rowNeedsManualReview && row.answer_id ? (
                      <div className="analyticsResultReviewPanel">
                        <div className="sectionHeading">
                          <strong>Manual review</strong>
                          <span>
                            {row.reviewed_at
                              ? `Last reviewed ${formatDateTime(row.reviewed_at)}`
                              : "Grade this answer before final reporting"}
                          </span>
                        </div>

                        {row.reviewed_by_teacher_name || row.review_notes ? (
                          <div className="analyticsResultReviewMeta">
                            {row.reviewed_by_teacher_name ? (
                              <div>
                                <span>Reviewer</span>
                                <strong>{row.reviewed_by_teacher_name}</strong>
                              </div>
                            ) : null}
                            {row.reviewed_at ? (
                              <div>
                                <span>Reviewed at</span>
                                <strong>{formatDateTime(row.reviewed_at)}</strong>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {row.review_notes ? (
                          <div className="analyticsResultReviewNotes">
                            <span>Latest notes</span>
                            <p>{row.review_notes}</p>
                          </div>
                        ) : null}

                        <form action={runResultsManualReviewAction} className="analyticsResultReviewForm">
                          <input name="role" type="hidden" value={config.role} />
                          <input name="exam_id" type="hidden" value={selectedExam.id} />
                          <input name="attempt_id" type="hidden" value={selectedStudentAttempt.id} />
                          <input name="answer_id" type="hidden" value={row.answer_id} />
                          <input name="review_task_id" type="hidden" value={row.review_task_id ?? ""} />
                          <input name="attempt_filter" type="hidden" value={attemptFilter} />
                          <input name="attempt_sort" type="hidden" value={attemptSort} />
                          <input name="question_filter" type="hidden" value={questionFilter} />
                          <input name="student_question_filter" type="hidden" value={studentQuestionFilter} />
                          <input name="student_question_search" type="hidden" value={studentQuestionSearch} />
                          <input name="return_path" type="hidden" value={currentPath} />

                          {row.has_rubric && row.rubric ? (
                            <div className="fieldStack fieldStackFull">
                              <span>Rubric scoring</span>
                              {row.rubric_scores?.length ? (
                                <div className="teacherRubricReviewStack">
                                  <div className="teacherRubricReviewSummary">
                                    <strong>Latest rubric snapshot</strong>
                                    <span>{row.rubric_total || row.marks_awarded || "0.00"}</span>
                                  </div>
                                  <div className="teacherRubricReviewGrid">
                                    {row.rubric_scores.map((score) => (
                                      <section className="teacherRubricCriterionCard" key={score.criterion_key}>
                                        <div className="sectionHeading">
                                          <strong>{score.criterion_label}</strong>
                                          <span>
                                            {score.awarded_score} / {score.max_score}
                                          </span>
                                        </div>
                                        {score.note ? (
                                          <p className="teacherRubricCriterionHint">{score.note}</p>
                                        ) : null}
                                      </section>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              <TeacherRubricReviewFields
                                criteria={row.rubric.criteria}
                                initialScores={row.rubric_scores ?? []}
                              />
                            </div>
                          ) : (
                            <label className="fieldStack">
                              <span>Marks awarded</span>
                              <input
                                defaultValue={row.marks_awarded ?? ""}
                                max={maxMarks}
                                min="0"
                                name="marks_awarded"
                                placeholder={`0.00 to ${maxMarks}`}
                                required
                                step="0.01"
                                type="number"
                              />
                            </label>
                          )}

                          <label className="fieldStack fieldStackFull">
                            <span>Review notes</span>
                            <textarea
                              defaultValue={row.review_notes}
                              name="review_notes"
                              placeholder="Highlight strengths, misses, rubric observations, or follow-up advice."
                              rows={4}
                            />
                          </label>

                          <div className="resultCardActions">
                            <button className="buttonPrimary" type="submit">
                              {row.evaluation_status === "manual_reviewed" ? "Update review" : "Save review"}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
                })}
              </div>
            )}
          </section>

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Improve the bank</strong>
              <span>{selectedExam.code}</span>
            </div>
            <p>{assessmentLens.bankGuidance}</p>
            <div className="questionBankTagRow">
              {assessmentLens.focusAreas.map((item) => (
                <span className="questionBankTagChip" key={`bank-${item}`}>
                  {item}
                </span>
              ))}
            </div>
            {questionQualitySummary?.top_revision_questions?.length ? (
              <div className="analyticsResultInsightList">
                {questionQualitySummary.top_revision_questions.map((question) => (
                  <article className="analyticsResultInsightCard" key={question.question_id}>
                    <div className="resultCardTop">
                      <strong>{question.question_text_summary}</strong>
                      <span className={`statusPill ${questionQualityTone(question.quality_signal)}`}>
                        {question.revision_priority}
                      </span>
                    </div>
                    <p>{question.topic_name || "Unmapped topic"}</p>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="resultCardActions">
              <Link className="button buttonSecondary" href={config.questionBankPath}>
                Open Question Bank
              </Link>
              <Link className="button buttonGhost" href={`${config.examBasePath}/${selectedExam.id}/builder`}>
                Open Builder
              </Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

export async function ResultsWorkspacePage({
  role,
  view,
  searchParams,
}: {
  role: ResultsWorkspaceRole;
  view: ResultsWorkspaceView;
  searchParams: SearchParams;
}) {
  const config = getWorkspaceConfig(role);
  const Header = config.header;
  const pageClassName =
    config.role === "institute"
      ? "studentPage studentPageTight studentDashboardModern instituteConsolePage instituteResultsPageVivid"
      : "studentPage studentPageTight studentDashboardModern teacherResultsPageVivid";

  await requireResultsSession(role);

  const resolvedSearchParams = await searchParams;
  const currentPath = resultsViewPath(config.basePath, view);
  const selectedExamId = readSingle(resolvedSearchParams.exam);
  const selectedAttemptId = readSingle(resolvedSearchParams.attempt);
  const attemptFilter = resolveAttemptFilter(readSingle(resolvedSearchParams.attempt_filter) || "all");
  const attemptSort = resolveAttemptSort(readSingle(resolvedSearchParams.attempt_sort) || "latest");
  const attemptGroup = resolveAttemptGroup(readSingle(resolvedSearchParams.attempt_group) || "none");
  const questionFilter = readSingle(resolvedSearchParams.question_filter) || "all";
  const studentQuestionFilter = resolveStudentQuestionFilter(
    readSingle(resolvedSearchParams.student_question_filter) || "all",
  );
  const studentQuestionSearch = readSingle(resolvedSearchParams.student_question_search) || "";
  const examListFilter = resolveExamFilter(readSingle(resolvedSearchParams.exam_list_filter) || "all");
  const examListSort = resolveExamSort(readSingle(resolvedSearchParams.exam_list_sort) || "latest");
  const examListGroup = resolveExamGroup(readSingle(resolvedSearchParams.exam_list_group) || "none");
  const examPage = parsePositiveInt(readSingle(resolvedSearchParams.exam_page), 1);
  const examPageSize = parsePositiveInt(readSingle(resolvedSearchParams.exam_page_size), 10);
  const attemptPage = parsePositiveInt(readSingle(resolvedSearchParams.attempt_page), 1);
  const attemptPageSize = parsePositiveInt(readSingle(resolvedSearchParams.attempt_page_size), 12);
  const leaderboardPage = parsePositiveInt(readSingle(resolvedSearchParams.leaderboard_page), 1);
  const leaderboardPageSize = parsePositiveInt(readSingle(resolvedSearchParams.leaderboard_page_size), 6);
  const topicPage = parsePositiveInt(readSingle(resolvedSearchParams.topic_page), 1);
  const topicPageSize = parsePositiveInt(readSingle(resolvedSearchParams.topic_page_size), 6);
  const questionPage = parsePositiveInt(readSingle(resolvedSearchParams.question_page), 1);
  const questionPageSize = parsePositiveInt(readSingle(resolvedSearchParams.question_page_size), 6);
  const error = readSingle(resolvedSearchParams.error);
  const message = readSingle(resolvedSearchParams.message);

  const [summaries, teacherExams] = await Promise.all([
    fetchTeacherResultSummary().catch(() => null),
    fetchTeacherExams().catch(() => null),
  ]);

  if (!summaries || !teacherExams) {
    return (
      <div className="studentPage">
        <Header
          title="Results"
          description={`This route depends on the live ${config.roleNounLower} results summary and analytics endpoints.`}
        />
        <StudentStatePanel
          eyebrow="Load issue"
          title={`${config.roleNoun} results workspace could not be loaded`}
          description={`The ${config.roleNounLower} results area depends on live summary, leaderboard, attempts, and monitoring endpoints, and the current request did not complete successfully.`}
          bullets={[
            `${config.roleNoun} results summary endpoint`,
            "Exam leaderboard and attempts endpoints",
            "Live monitor and publish actions",
          ]}
          ctaHref={config.dashboardPath}
          ctaLabel="Back to Dashboard"
          statusLabel="Retry after backend check"
        />
      </div>
    );
  }

  if (teacherExams.length === 0) {
    return (
      <div className="studentPage">
        <Header
          title="Results"
          description={`Track exam outcome readiness, live attempt behavior, and result publication from one ${config.roleNounLower}-scoped workspace.`}
        />
        <StudentStatePanel
          eyebrow={`No ${config.roleNounLower} exams yet`}
          title={`Results will appear once exams exist in your ${config.roleNounLower} scope`}
          description={`The ${config.roleNounLower} results workspace can only render exams that exist in your scope. Create or publish exams first, then generate results after students submit attempts.`}
          ctaHref={config.examBasePath}
          ctaLabel="Open Exams"
          statusLabel="Waiting for exam setup"
        />
      </div>
    );
  }

  const summaryByExamId = new Map(summaries.map((summary) => [summary.exam, summary]));
  const resultExamCards = teacherExams.map((exam) => ({
    exam,
    summary: summaryByExamId.get(exam.id) ?? null,
  }));
  const visibleExamCards = sortResultExamCards(filterResultExamCards(resultExamCards, examListFilter), examListSort);
  const highRiskExamCount = resultExamCards.filter(
    ({ summary }) => summary?.review_release_risk?.level === "high",
  ).length;
  const mediumRiskExamCount = resultExamCards.filter(
    ({ summary }) => summary?.review_release_risk?.level === "medium",
  ).length;
  const examTotalPages = Math.max(Math.ceil(visibleExamCards.length / examPageSize), 1);
  const safeExamPage = Math.min(examPage, examTotalPages);
  const pagedExamCards = visibleExamCards.slice((safeExamPage - 1) * examPageSize, safeExamPage * examPageSize);
  const groupedExamCards = groupResultExamCards(pagedExamCards, examListGroup);

  const currentExamId = selectedExamId || resultExamCards[0]?.exam.id || "";
  const selectedExamCard = resultExamCards.find((item) => item.exam.id === currentExamId) ?? resultExamCards[0];
  const selectedExam = selectedExamCard.exam;
  const selectedSummary = selectedExamCard.summary;

  const detailData = await Promise.allSettled([
    fetchTeacherLiveExamMonitor(selectedExam.id),
    fetchTeacherExamPublishReadiness(selectedExam.id),
    fetchTeacherResultPublishReadiness(selectedExam.id),
    fetchTeacherExamLeaderboard(selectedExam.id, {
      page: leaderboardPage,
      pageSize: leaderboardPageSize,
    }),
    fetchTeacherExamAttemptPage(selectedExam.id, {
      page: attemptPage,
      pageSize: attemptPageSize,
      filter: attemptFilter,
      sort: attemptSort,
      attemptId: selectedAttemptId,
    }),
    fetchTeacherQuestionAnalysis(selectedExam.id, {
      page: questionPage,
      pageSize: questionPageSize,
      filter: questionFilter as "all" | "hard_questions" | "skipped_often" | "revision_candidates",
    }),
    fetchTeacherTopicPerformance(selectedExam.id, {
      page: topicPage,
      pageSize: topicPageSize,
    }),
  ]);

  const monitor = detailData[0]?.status === "fulfilled" ? detailData[0].value : null;
  const examPublishReadiness = detailData[1]?.status === "fulfilled" ? detailData[1].value : null;
  const resultPublishReadiness = detailData[2]?.status === "fulfilled" ? detailData[2].value : null;
  const leaderboardPageData =
    detailData[3]?.status === "fulfilled"
      ? detailData[3].value
      : {
          count: 0,
          next: null,
          previous: null,
          results: [],
          summary: {
            total: 0,
            ranked_count: 0,
            published_count: 0,
            all_ranked: false,
            published_results: false,
          },
        };
  const attemptsPageData =
    detailData[4]?.status === "fulfilled"
      ? detailData[4].value
      : {
          count: 0,
          next: null,
          previous: null,
          results: [],
          summary: { total_attempts: 0 },
          applied_filter: "all",
          applied_sort: "latest",
          applied_search: "",
          selected_attempt: null,
        };
  const questionAnalysisPageData =
    detailData[5]?.status === "fulfilled"
      ? detailData[5].value
      : { count: 0, next: null, previous: null, results: [] };
  const topicPerformancePageData =
    detailData[6]?.status === "fulfilled"
      ? detailData[6].value
      : { count: 0, next: null, previous: null, results: [] };

  const totalAttempts = summaries.reduce((sum, item) => sum + item.total_attempted, 0);
  const totalPassed = summaries.reduce((sum, item) => sum + item.total_passed, 0);
  const totalFailed = summaries.reduce((sum, item) => sum + item.total_failed, 0);
  const averageAcrossExams =
    summaries.length > 0
      ? Math.round(summaries.reduce((sum, item) => sum + Number(item.average_percentage), 0) / summaries.length)
      : 0;
  const selectedPendingCount = selectedSummary
    ? pendingCount(selectedSummary.total_attempted, selectedSummary.total_passed, selectedSummary.total_failed)
    : 0;
  const selectedReviewBlockCount = selectedSummary?.pending_review_tasks_count ?? 0;
  const selectedRecheckCount = selectedSummary?.recheck_review_tasks_count ?? 0;
  const attempts = attemptsPageData.results;
  const attemptTotalPages = Math.max(Math.ceil(attemptsPageData.count / attemptPageSize), 1);
  const groupedAttempts = groupAttempts(attempts, attemptGroup);
  const leaderboardTotalPages = Math.max(Math.ceil(leaderboardPageData.count / leaderboardPageSize), 1);
  const topicTotalPages = Math.max(Math.ceil(topicPerformancePageData.count / topicPageSize), 1);
  const questionTotalPages = Math.max(Math.ceil(questionAnalysisPageData.count / questionPageSize), 1);
  const examLifecycleStatus = selectedExam.status || monitor?.exam_status || "unknown";
  const canPublishResults = examLifecycleStatus === "completed";
  const canRefreshLifecycle = examLifecycleStatus !== "completed" && examLifecycleStatus !== "cancelled";
  const canMarkCompleted = examLifecycleStatus === "live" || examLifecycleStatus === "scheduled";
  const resultsPublished = selectedSummary?.results_published ?? leaderboardPageData.summary.published_results;
  const evaluatedResults = selectedSummary
    ? evaluatedCount(selectedSummary.total_passed, selectedSummary.total_failed)
    : 0;
  const rankedLeaderboardReady = leaderboardPageData.summary.all_ranked;
  const readiness = resultReadinessState({ selectedSummary, resultsPublished, canPublishResults });
  const readinessSnapshot = buildResultReadinessSnapshot({
    selectedSummary,
    resultsPublished,
    canPublishResults,
    attemptsCount: attemptsPageData.summary.total_attempts,
    evaluatedResults,
    rankedLeaderboardReady,
    selectedPendingCount,
  });
  const examReadinessPanel = examPublishReadiness
    ? buildReadinessPanel({
        title: "Exam publish readiness",
        ready: examPublishReadiness.ready,
        blockers: examPublishReadiness.blockers,
        warnings: examPublishReadiness.warnings,
        summary: examPublishReadiness.ready
          ? "Schedule, marks, and linked-question structure are aligned for exam publication."
          : "Backend publish blockers still exist on the exam lifecycle side.",
        stats: [
          `${examPublishReadiness.blocker_count} blocker${examPublishReadiness.blocker_count === 1 ? "" : "s"}`,
          `${examPublishReadiness.warning_count} warning${examPublishReadiness.warning_count === 1 ? "" : "s"}`,
        ],
      })
    : null;
  const resultReadinessPanel = resultPublishReadiness
    ? buildReadinessPanel({
        title: "Result publish readiness",
        ready: resultPublishReadiness.ready,
        blockers: resultPublishReadiness.blockers,
        warnings: resultPublishReadiness.warnings,
        summary: resultPublishReadiness.ready
          ? "Generated results, review state, and lifecycle are aligned for publication."
          : "Backend publication blockers still exist on the results side.",
        stats: [
          `${resultPublishReadiness.generated_results_count} generated`,
          `${resultPublishReadiness.published_results_count} published`,
        ],
      })
    : null;
  const workflowSteps = buildResultWorkflow({
    selectedExamId: selectedExam.id,
    selectedSummary,
    examLifecycleStatus,
    canMarkCompleted,
    canPublishResults,
    resultsPublished,
    attemptsCount: attemptsPageData.summary.total_attempts,
    evaluatedResults,
    rankedLeaderboardReady,
    examBasePath: config.examBasePath,
    reviewsBasePath: config.reviewsBasePath,
  });
  const recommendedWorkflowStep = nextWorkflowStep(workflowSteps);
  const latestPublishLog = selectedExam.publish_logs[0] ?? null;
  const integrityWarningAttempts = monitor?.integrity_warning_attempts ?? 0;
  const integrityWarningsTotal = monitor?.integrity_warnings_total ?? 0;
  const thresholdReachedAttempts = monitor?.threshold_reached_attempts ?? 0;
  const attemptsByHealth = monitor?.attempts_by_health ?? ({ critical: 0, watch: 0, stable: 0 } as Record<
    AttemptHealth,
    number
  >);
  const interventionQueue = [...(monitor?.recent_attempts ?? [])]
    .sort((left, right) => healthPriorityScore(right) - healthPriorityScore(left))
    .filter((attempt) => attemptHealth(attempt) !== "stable")
    .slice(0, 6);
  const criticalAttempts = interventionQueue.filter((attempt) => attemptHealth(attempt) === "critical");
  const watchAttempts = interventionQueue.filter((attempt) => attemptHealth(attempt) === "watch");
  const selectedAttempt =
    attemptsPageData.selected_attempt ??
    attempts.find((attempt) => attempt.id === selectedAttemptId) ??
    attempts[0] ??
    monitor?.recent_attempts[0] ??
    null;
  const attemptQuestionAnalysisData =
    view === "analysis" && selectedAttempt
      ? await fetchTeacherAttemptQuestionAnalysis(selectedExam.id, {
          attemptId: selectedAttempt.id,
          filter: studentQuestionFilter,
          search: studentQuestionSearch,
        }).catch(() => ({
          selected_attempt: selectedAttempt,
          summary: {
            total_questions: 0,
            attempted_questions: 0,
            correct_count: 0,
            wrong_count: 0,
            skipped_count: 0,
            marked_count: 0,
            total_time_seconds: 0,
            average_time_seconds: 0,
          },
          applied_filter: studentQuestionFilter,
          results: [],
        }))
      : {
          selected_attempt: selectedAttempt,
          summary: {
            total_questions: 0,
            attempted_questions: 0,
            correct_count: 0,
            wrong_count: 0,
            skipped_count: 0,
            marked_count: 0,
            total_time_seconds: 0,
            average_time_seconds: 0,
          },
          applied_filter: studentQuestionFilter,
          results: [],
        };
  const selectedAttemptInterventions = selectedAttempt
    ? await fetchTeacherAttemptInterventions(selectedAttempt.id).catch(() => [])
    : [];

  const context: WorkspaceContext = {
    config,
    view,
    currentPath,
    resultExamCards,
    selectedExam,
    selectedSummary,
    selectedAttempt,
    selectedAttemptInterventions,
    groupedExamCards,
    visibleExamCardsLength: visibleExamCards.length,
    examListFilter,
    examListSort,
    examListGroup,
    safeExamPage,
    examTotalPages,
    examPageSize,
    attemptFilter,
    attemptSort,
    attemptGroup,
    questionFilter,
    studentQuestionFilter,
    studentQuestionSearch,
    attemptPage,
    attemptPageSize,
    attemptTotalPages,
    leaderboardPage,
    leaderboardPageSize,
    leaderboardTotalPages,
    topicPage,
    topicPageSize,
    topicTotalPages,
    questionPage,
    questionPageSize,
    questionTotalPages,
    groupedAttempts,
    attemptsPageData,
    leaderboardPageData,
    topicPerformancePageData,
    questionAnalysisPageData,
    attemptQuestionAnalysisData,
    monitor,
    readiness,
    readinessSnapshot,
    workflowSteps,
    recommendedWorkflowStep,
    canRefreshLifecycle,
    resultsPublished,
    evaluatedResults,
    totalAttempts,
    totalPassed,
    totalFailed,
    averageAcrossExams,
    selectedPendingCount,
    selectedReviewBlockCount,
    selectedRecheckCount,
    attemptsByHealth,
    interventionQueue,
    criticalAttempts,
    watchAttempts,
    integrityWarningAttempts,
    integrityWarningsTotal,
    thresholdReachedAttempts,
    latestPublishLog,
    examLifecycleStatus,
    examReadinessPanel,
    resultReadinessPanel,
    baseHrefArgs: {
      examId: selectedExam.id,
      attemptId: selectedAttemptId,
      attemptFilter,
      attemptSort,
      attemptGroup,
      attemptPage,
      attemptPageSize,
      questionFilter,
      examListFilter,
      examListSort,
      examListGroup,
      examPage: safeExamPage,
      examPageSize,
      leaderboardPage,
      leaderboardPageSize,
      topicPage,
      topicPageSize,
      questionPage,
      questionPageSize,
      studentQuestionFilter,
      studentQuestionSearch,
    },
  };

  return (
    <div className={pageClassName}>
      <Header
        title="Results"
        description={`Monitor live attempt behavior, generate summaries, publish ranks, and review leaderboard outcomes across ${config.roleNounLower}-scoped exams.`}
        statusLabel={`${visibleExamCards.length} exam${visibleExamCards.length === 1 ? "" : "s"} visible`}
        statusTone="live"
      />

      {message ? <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p> : null}

      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">Outcome Control</span>
          <strong>{config.roleNoun} result operations</strong>
          <small>
            {totalAttempts} attempts · {attemptsByHealth.critical} critical · {attemptsByHealth.watch} watch-list
          </small>
        </div>
        <div className="studentInsightHeroActions">
          <Link className="button buttonPrimary" href={`${config.examBasePath}/${selectedExam.id}`}>
            Open Exam
          </Link>
          <Link className="button buttonSecondary" href={`${config.examBasePath}/${selectedExam.id}/builder`}>
            Open Builder
          </Link>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard metricCardPrimary dashboardHeroCard">
          <span>Visible Exams</span>
          <strong>{visibleExamCards.length}</strong>
          <small>{config.roleNoun}-scoped exams available in this results workspace</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Total Attempts</span>
          <strong>{totalAttempts}</strong>
          <small>{totalPassed} passed and {totalFailed} failed so far</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Average Performance</span>
          <strong>{averageAcrossExams}%</strong>
          <small>Average percentage across all returned exam summaries</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>High Release Risk</span>
          <strong>{highRiskExamCount}</strong>
          <small>Exams where review backlog is most likely to delay publication</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Medium Release Risk</span>
          <strong>{mediumRiskExamCount}</strong>
          <small>Exams that need review attention before pressure grows further</small>
        </article>
      </section>

      {renderViewNavigation(context)}

      <section className="resultsList teacherResultsLayout">
        {renderExamSidebar(context)}
        <div className="teacherResultsMain">
          {view === "overview" ? renderOverviewView(context) : null}
          {view === "live" ? renderLiveMonitorView(context) : null}
          {view === "attempts" ? renderAttemptsView(context) : null}
          {view === "leaderboard" ? renderLeaderboardView(context) : null}
          {view === "analysis" ? renderAnalysisView(context) : null}
        </div>
      </section>
    </div>
  );
}
