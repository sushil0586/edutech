export type TeacherSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export const rankVisibilityModeOptions: TeacherSelectOption[] = [
  {
    value: "hidden",
    label: "Hidden",
    description: "Do not show rank to students for this exam.",
  },
  {
    value: "provisional_after_submit",
    label: "Provisional After Submit",
    description: "Show provisional rank after submission while more attempts may still arrive.",
  },
  {
    value: "final_after_exam_closure",
    label: "Final After Exam Closure",
    description: "Hold rank until the exam window is complete.",
  },
];

export const percentileVisibilityModeOptions: TeacherSelectOption[] = [
  {
    value: "hidden",
    label: "Hidden",
    description: "Do not show percentile to students for this exam.",
  },
  {
    value: "provisional_after_submit",
    label: "Provisional After Submit",
    description: "Show provisional percentile after submission while the cohort is still growing.",
  },
  {
    value: "final_after_exam_closure",
    label: "Final After Exam Closure",
    description: "Hold percentile until the exam window is complete.",
  },
];

export const benchmarkVisibilityModeOptions: TeacherSelectOption[] = [
  {
    value: "hidden",
    label: "Hidden",
    description: "Do not show benchmark comparison blocks to students.",
  },
  {
    value: "peer_average_only",
    label: "Peer Average Only",
    description: "Show peer averages without percentile positioning.",
  },
  {
    value: "peer_average_plus_percentile",
    label: "Peer Average Plus Percentile",
    description: "Show benchmark averages and percentile when percentile data is available.",
  },
];

export const rankFreezePolicyOptions: TeacherSelectOption[] = [
  {
    value: "rolling_until_exam_closure",
    label: "Rolling Until Exam Closure",
    description: "Allow provisional rank and percentile to move as more results arrive.",
  },
  {
    value: "freeze_on_exam_closure",
    label: "Freeze On Exam Closure",
    description: "Treat rank and percentile as final only when the exam closes.",
  },
];
