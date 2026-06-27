import type { StudentAvailableExam } from "@/features/dashboard/types";

export function buildPracticeHref(args?: {
  subjectName?: string | null;
  topicName?: string | null;
  source?: string | null;
  teacher?: string | null;
}) {
  const params = new URLSearchParams();

  if (args?.subjectName?.trim()) {
    params.set("subject", args.subjectName.trim());
  }

  if (args?.topicName?.trim()) {
    params.set("topic", args.topicName.trim());
  }

  if (args?.source?.trim()) {
    params.set("source", args.source.trim());
  }

  if (args?.teacher?.trim()) {
    params.set("teacher", args.teacher.trim());
  }

  const query = params.toString();
  return query ? `/app/practice?${query}` : "/app/practice";
}

export function derivePracticeFocusFromReviewQuestions(
  questions: Array<{
    result_status: string;
    subject_name: string | null;
    topic_name: string | null;
  }>,
) {
  const candidates = questions.filter(
    (question) => question.result_status === "wrong" || question.result_status === "skipped",
  );

  if (!candidates.length) {
    return { subjectName: null, topicName: null, label: "Open Practice" };
  }

  const topicCounts = new Map<string, { subjectName: string | null; topicName: string | null; count: number }>();

  for (const question of candidates) {
    const key = `${question.subject_name ?? ""}::${question.topic_name ?? ""}`;
    const current = topicCounts.get(key);
    if (current) {
      current.count += 1;
      continue;
    }
    topicCounts.set(key, {
      subjectName: question.subject_name,
      topicName: question.topic_name,
      count: 1,
    });
  }

  const bestMatch = [...topicCounts.values()].sort((left, right) => right.count - left.count)[0];
  if (!bestMatch) {
    return { subjectName: null, topicName: null, label: "Open Practice" };
  }

  return {
    subjectName: bestMatch.subjectName,
    topicName: bestMatch.topicName,
    label: bestMatch.topicName
      ? `Practice ${bestMatch.topicName}`
      : bestMatch.subjectName
        ? `Practice ${bestMatch.subjectName}`
        : "Open Practice",
  };
}

export function resolvePracticeFollowUpAction(args: {
  exams: StudentAvailableExam[];
  subjectName?: string | null;
}) {
  const scopedExams = args.subjectName?.trim()
    ? args.exams.filter((exam) => exam.subject_name === args.subjectName?.trim())
    : args.exams;

  const exam =
    scopedExams.find((candidate) => candidate.can_resume) ??
    scopedExams.find((candidate) => candidate.can_start) ??
    scopedExams.find((candidate) => !candidate.economy_access.is_locked) ??
    scopedExams[0] ??
    null;

  if (!exam) {
    return {
      exam: null,
      action: {
        mode: "link" as const,
        href: buildPracticeHref({ subjectName: args.subjectName ?? null }),
        label: "Open Practice",
      },
    };
  }

  if (exam.can_resume && exam.active_attempt?.id) {
    return {
      exam,
      action: {
        mode: "link" as const,
        href: `/app/attempts/${exam.active_attempt.id}`,
        label: "Resume Practice",
      },
    };
  }

  if (exam.can_start) {
    return {
      exam,
      action: {
        mode: "start" as const,
        href: "",
        label: "Start Practice",
      },
    };
  }

  if (exam.economy_access.is_locked && exam.economy_access.can_unlock_with_stars) {
    return {
      exam,
      action: {
        mode: "unlock" as const,
        href: "",
        label: `Unlock with ${exam.economy_access.star_cost} Stars`,
      },
    };
  }

  return {
    exam,
    action: {
      mode: "link" as const,
      href: `/app/exams/${exam.id}`,
      label: "View Practice Detail",
    },
  };
}

export function resolvePracticeFocusRecommendation(args: {
  exams: StudentAvailableExam[];
  subjectName?: string | null;
  topicName?: string | null;
}) {
  const focusLabel = args.topicName?.trim()
    ? `Practice ${args.topicName.trim()}`
    : args.subjectName?.trim()
      ? `Practice ${args.subjectName.trim()}`
      : "Open Practice";
  const followUp = resolvePracticeFollowUpAction({
    exams: args.exams,
    subjectName: args.subjectName,
  });
  const matchedExam = followUp.exam;

  if (!matchedExam) {
    return {
      ...followUp,
      focusLabel,
      laneLabel: "Insights -> Practice",
      helper:
        "No matching practice set is ready yet, so open the practice workspace and choose the closest available revision lane.",
      focusHref: buildPracticeHref({
        subjectName: args.subjectName ?? null,
        topicName: args.topicName ?? null,
      }),
    };
  }

  if (followUp.action.mode === "link" && matchedExam.can_resume && matchedExam.active_attempt?.id) {
    return {
      ...followUp,
      focusLabel,
      laneLabel: "Insights -> Resume Practice",
      helper: args.topicName?.trim()
        ? `A live ${matchedExam.subject_name} practice attempt already exists, so resume it and work through ${args.topicName.trim()} in the current session.`
        : `A live ${matchedExam.subject_name} practice attempt already exists, so resume it instead of starting a new revision lane.`,
      focusHref: buildPracticeHref({
        subjectName: args.subjectName ?? null,
        topicName: args.topicName ?? null,
      }),
    };
  }

  if (followUp.action.mode === "start") {
    return {
      ...followUp,
      focusLabel,
      laneLabel: "Insights -> Start Practice",
      helper: args.topicName?.trim()
        ? `${args.topicName.trim()} is the clearest next recovery target, and this ${matchedExam.subject_name} practice set is ready to start immediately.`
        : `This ${matchedExam.subject_name} practice set is the best immediate follow-up for the current insight signal.`,
      focusHref: buildPracticeHref({
        subjectName: args.subjectName ?? null,
        topicName: args.topicName ?? null,
      }),
    };
  }

  if (followUp.action.mode === "unlock") {
    return {
      ...followUp,
      focusLabel,
      laneLabel: "Insights -> Unlock Practice",
      helper: args.topicName?.trim()
        ? `${args.topicName.trim()} is the right next focus, but the closest matching practice set needs ${matchedExam.economy_access.star_cost} stars before it can be opened.`
        : `The best matching practice lane is currently premium and needs ${matchedExam.economy_access.star_cost} stars before you continue.`,
      focusHref: buildPracticeHref({
        subjectName: args.subjectName ?? null,
        topicName: args.topicName ?? null,
      }),
    };
  }

  return {
    ...followUp,
    focusLabel,
    laneLabel: "Insights -> Practice Detail",
    helper: args.topicName?.trim()
      ? `${args.topicName.trim()} is the current focus. Open the matched practice detail to confirm access, timing, and the next valid learner action.`
      : "Open the matched practice detail to confirm access, timing, and the next valid learner action.",
    focusHref: buildPracticeHref({
      subjectName: args.subjectName ?? null,
      topicName: args.topicName ?? null,
    }),
  };
}
