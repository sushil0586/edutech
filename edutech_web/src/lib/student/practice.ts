import type { StudentAvailableExam } from "@/features/dashboard/types";

export function buildPracticeHref(args?: {
  subjectName?: string | null;
  topicName?: string | null;
}) {
  const params = new URLSearchParams();

  if (args?.subjectName?.trim()) {
    params.set("subject", args.subjectName.trim());
  }

  if (args?.topicName?.trim()) {
    params.set("topic", args.topicName.trim());
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
