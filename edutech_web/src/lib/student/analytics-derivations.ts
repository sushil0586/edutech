import type {
  StudentQuestionAnalyticsItem,
  StudentResult,
  StudentTopicPerformance,
} from "@/features/dashboard/types";

type AggregateRow = {
  key: string;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  averageTimeSeconds: number;
  accuracy: number;
  skipRate: number;
};

function finalizeAggregateRows(
  map: Map<
    string,
    {
      label: string;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      totalTimeSeconds: number;
    }
  >,
) {
  return Array.from(map.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    total: value.total,
    correct: value.correct,
    wrong: value.wrong,
    skipped: value.skipped,
    averageTimeSeconds: value.total ? Math.round(value.totalTimeSeconds / value.total) : 0,
    accuracy: value.total ? (value.correct / value.total) * 100 : 0,
    skipRate: value.total ? (value.skipped / value.total) * 100 : 0,
  }));
}

export function aggregateQuestionsByType(
  questions: StudentQuestionAnalyticsItem[],
): AggregateRow[] {
  const map = new Map<
    string,
    {
      label: string;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      totalTimeSeconds: number;
    }
  >();

  for (const item of questions) {
    const bucket = map.get(item.question_type) ?? {
      label: item.question_type,
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      totalTimeSeconds: 0,
    };
    bucket.total += 1;
    bucket.totalTimeSeconds += item.your_time_spent_seconds ?? 0;
    if (item.your_result === "correct") bucket.correct += 1;
    if (item.your_result === "wrong") bucket.wrong += 1;
    if (item.your_result === "skipped") bucket.skipped += 1;
    map.set(item.question_type, bucket);
  }

  return finalizeAggregateRows(map).sort((a, b) => a.accuracy - b.accuracy);
}

export function aggregateQuestionsByDifficulty(
  questions: StudentQuestionAnalyticsItem[],
): AggregateRow[] {
  const map = new Map<
    string,
    {
      label: string;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      totalTimeSeconds: number;
    }
  >();

  for (const item of questions) {
    const bucket = map.get(item.difficulty_level) ?? {
      label: item.difficulty_level,
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      totalTimeSeconds: 0,
    };
    bucket.total += 1;
    bucket.totalTimeSeconds += item.your_time_spent_seconds ?? 0;
    if (item.your_result === "correct") bucket.correct += 1;
    if (item.your_result === "wrong") bucket.wrong += 1;
    if (item.your_result === "skipped") bucket.skipped += 1;
    map.set(item.difficulty_level, bucket);
  }

  return finalizeAggregateRows(map);
}

export function aggregateQuestionsByTopic(
  questions: StudentQuestionAnalyticsItem[],
): AggregateRow[] {
  const map = new Map<
    string,
    {
      label: string;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
      totalTimeSeconds: number;
    }
  >();

  for (const item of questions) {
    const key = item.topic_id ?? item.topic_name ?? "untagged";
    const bucket = map.get(key) ?? {
      label: item.topic_name ?? "Untagged topic",
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      totalTimeSeconds: 0,
    };
    bucket.total += 1;
    bucket.totalTimeSeconds += item.your_time_spent_seconds ?? 0;
    if (item.your_result === "correct") bucket.correct += 1;
    if (item.your_result === "wrong") bucket.wrong += 1;
    if (item.your_result === "skipped") bucket.skipped += 1;
    map.set(key, bucket);
  }

  return finalizeAggregateRows(map).sort((a, b) => a.accuracy - b.accuracy);
}

export function aggregateSubjectPerformance(
  topicPerformance: StudentTopicPerformance[],
) {
  const map = new Map<
    string,
    {
      subject: string;
      totalPercentage: number;
      count: number;
      attemptedQuestions: number;
      correctAnswers: number;
    }
  >();

  for (const item of topicPerformance) {
    const bucket = map.get(item.subject_name) ?? {
      subject: item.subject_name,
      totalPercentage: 0,
      count: 0,
      attemptedQuestions: 0,
      correctAnswers: 0,
    };
    bucket.totalPercentage += Number(item.percentage);
    bucket.count += 1;
    bucket.attemptedQuestions += item.attempted_questions;
    bucket.correctAnswers += item.correct_answers;
    map.set(item.subject_name, bucket);
  }

  return Array.from(map.values())
    .map((item) => ({
      subject: item.subject,
      averagePercentage: item.count ? item.totalPercentage / item.count : 0,
      trackedTopics: item.count,
      attemptedQuestions: item.attemptedQuestions,
      correctAnswers: item.correctAnswers,
    }))
    .sort((a, b) => b.averagePercentage - a.averagePercentage);
}

export function sortResultsByPublishedDate(results: StudentResult[]) {
  return [...results].sort((a, b) => {
    const left = a.published_at ? new Date(a.published_at).getTime() : 0;
    const right = b.published_at ? new Date(b.published_at).getTime() : 0;
    return right - left;
  });
}
