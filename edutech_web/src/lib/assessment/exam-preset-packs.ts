export type ExamPresetPackDefinition = {
  id: string;
  resourceId?: string;
  label: string;
  family: string;
  note: string;
  chip: string;
  config?: Record<string, unknown>;
  scope_type?: string;
  institute?: string | null;
  can_manage?: boolean;
};

export const examPresetPacks: ExamPresetPackDefinition[] = [
  {
    id: "ielts_academic",
    label: "IELTS Academic",
    family: "Study Abroad",
    note: "Reading/listening/speaking style runtime with guided section delivery and formal timing.",
    chip: "Language test",
  },
  {
    id: "pte_academic",
    label: "PTE Academic",
    family: "Study Abroad",
    note: "Computer-first assessment flow with stricter media guidance and section-aware pacing.",
    chip: "AI-delivered",
  },
  {
    id: "gre_quant",
    label: "GRE Quant",
    family: "Graduate Admission",
    note: "Structured timed sections with simulation-oriented difficulty and formal review controls.",
    chip: "Graduate prep",
  },
  {
    id: "neet_mock",
    label: "NEET Mock",
    family: "Medical Entrance",
    note: "Large high-stakes mock setup with sequential exam-day style discipline.",
    chip: "Competitive exam",
  },
  {
    id: "jee_mains_math",
    label: "JEE Mains Math",
    family: "Engineering Entrance",
    note: "Mixed objective/numeric style setup with stronger timing and challenge emphasis.",
    chip: "STEM intensive",
  },
  {
    id: "aws_practitioner",
    label: "AWS Practitioner",
    family: "Professional Certification",
    note: "Certification-focused practice set with single-section coverage and optional reference behavior.",
    chip: "Certification",
  },
];
