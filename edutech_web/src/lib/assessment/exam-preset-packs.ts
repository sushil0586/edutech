import {
  assessmentExamFamilyMetadataById,
  type AssessmentExamFamilyId,
  type AssessmentProgramFamilyCode,
} from "@/lib/assessment/exam-family-metadata";

export type ExamPresetPackRecommendations = {
  defaultExamType: string;
  timingExpectation: string;
  securitySuggestion: string;
  reviewPolicy: string;
  resultVisibility: string;
  questionMixGuidance: string;
  authoringNote: string;
  suggestedDurationMinutes?: string;
  suggestedSectionCount?: number;
  suggestedQuestionCountBand?: string;
  suggestedAccessPolicy?: string;
};

export type ExamPresetPackTopicPool =
  | "firstTwo"
  | "firstThree"
  | "all"
  | "allOrFirstThree";

export type ExamPresetPackSectionTemplate = {
  name: string;
  questionCount: number;
  topicPool: ExamPresetPackTopicPool;
  difficultyMix: {
    foundation: number;
    intermediate: number;
    advanced: number;
  };
  marksPerQuestion: string;
  negativeMarksPerQuestion: string;
  timerEnabled?: boolean;
  durationMinutes?: string;
  allowSkipSection?: boolean;
  lockAfterSubmit?: boolean;
};

export type ExamPresetPackBuilderDefaults = {
  exam: {
    titleSuffix: string;
    codeSuffix: string;
    description: string;
    examType: string;
    deliveryMode: string;
    status: string;
    durationMinutes: string;
    passingMarks: string;
  };
  delivery: {
    timerMode: string;
    navigationMode: string;
    attemptPolicy: string;
    resultPublishMode: string;
    reviewMode: string;
    securityMode: string;
    assignmentMode: string;
    maxAttempts: string;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    allowResume: boolean;
    allowSectionSwitching: boolean;
    allowReturnToPreviousSection: boolean;
  };
  economy: {
    policyType: string;
    starCost: string;
    entitlementCode: string;
    unlockRuleType: string;
  };
  experience: {
    recommendedTimerMode: string;
    recommendedNavigationMode: string;
    recommendedMediaFlow: string;
    supportsSectionMediaGuidance: boolean;
    learnerSummary: string;
    creatorSummary: string;
  };
  selectionMode: string;
  sections: ExamPresetPackSectionTemplate[];
};

export type ExamPresetPackDefinition = {
  id: string;
  resourceId?: string;
  label: string;
  family: string;
  familyId?: AssessmentExamFamilyId;
  programFamilyCode?: AssessmentProgramFamilyCode;
  note: string;
  chip: string;
  recommendations?: ExamPresetPackRecommendations;
  builderDefaults?: ExamPresetPackBuilderDefaults;
  config?: Record<string, unknown>;
  scope_type?: string;
  institute?: string | null;
  can_manage?: boolean;
};

export const examPresetPacks: ExamPresetPackDefinition[] = [
  {
    id: "ielts_academic",
    label: "IELTS Academic",
    family: assessmentExamFamilyMetadataById.language_proficiency.category,
    familyId: "language_proficiency",
    programFamilyCode: assessmentExamFamilyMetadataById.language_proficiency.programFamilyCode,
    note: "Reading, listening, writing, and integrated-prompt simulation with guided section delivery and formal timing.",
    chip: "Language test",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.language_proficiency.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.language_proficiency.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.language_proficiency.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.language_proficiency.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.language_proficiency.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.language_proficiency.recommendedQuestionMixGuidance,
      authoringNote: assessmentExamFamilyMetadataById.language_proficiency.authoringNote,
      suggestedDurationMinutes: "120",
      suggestedSectionCount: 3,
      suggestedQuestionCountBand: "42 prompts",
      suggestedAccessPolicy: "Formal guided language simulation",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "IELTS Academic Mock",
        codeSuffix: "IELTS-01",
        description: "Academic English simulation with skill-based sections and guided prompt media behavior.",
        examType: "mock_exam",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "120",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "section",
        navigationMode: "sequential",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "focus",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: false,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: false,
        allowReturnToPreviousSection: false,
      },
      economy: {
        policyType: "free",
        starCost: "0",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "section",
        recommendedNavigationMode: "sequential",
        recommendedMediaFlow: "controlled_exam_media",
        supportsSectionMediaGuidance: true,
        learnerSummary:
          "Treat this like a structured language simulation with section-by-section pacing, controlled prompt media, and rubric-guided writing review.",
        creatorSummary:
          "Use dedicated reading, listening, and writing blocks, and keep speaking or audio-capture promises explicit only when the workflow is actually configured.",
      },
      selectionMode: "strict",
      sections: [
        {
          name: "Reading",
          questionCount: 20,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 20, intermediate: 50, advanced: 30 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "40",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Listening",
          questionCount: 20,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 20, intermediate: 40, advanced: 40 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "30",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Writing",
          questionCount: 2,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 0, intermediate: 40, advanced: 60 },
          marksPerQuestion: "9.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "50",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
      ],
    },
  },
  {
    id: "pte_academic",
    label: "PTE Academic",
    family: assessmentExamFamilyMetadataById.language_proficiency.category,
    familyId: "language_proficiency",
    programFamilyCode: assessmentExamFamilyMetadataById.language_proficiency.programFamilyCode,
    note: "Computer-first language simulation with stricter media guidance, integrated prompts, and section-aware pacing.",
    chip: "AI-delivered",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.language_proficiency.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.language_proficiency.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.language_proficiency.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.language_proficiency.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.language_proficiency.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.language_proficiency.recommendedQuestionMixGuidance,
      authoringNote:
        "Cluster integrated skill prompts together and keep computer-first prompt guidance visible in the section plan.",
      suggestedDurationMinutes: "90",
      suggestedSectionCount: 2,
      suggestedQuestionCountBand: "40 prompts",
      suggestedAccessPolicy: "Computer-delivered guided simulation",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "PTE Academic Simulation",
        codeSuffix: "PTE-01",
        description: "Computer-first academic English simulation with strong prompt-media guidance.",
        examType: "mock_exam",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "90",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "section",
        navigationMode: "sequential",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "focus",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: false,
        allowReturnToPreviousSection: false,
      },
      economy: {
        policyType: "free",
        starCost: "0",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "section",
        recommendedNavigationMode: "sequential",
        recommendedMediaFlow: "controlled_exam_media",
        supportsSectionMediaGuidance: true,
        learnerSummary:
          "Computer-delivered language simulation with controlled media prompts, integrated skill blocks, and rubric-guided written response review.",
        creatorSummary:
          "Cluster integrated skills together and keep prompt-based items in tightly timed sections without implying production-ready speaking capture by default.",
      },
      selectionMode: "strict",
      sections: [
        {
          name: "Integrated Skills",
          questionCount: 15,
          topicPool: "firstThree",
          difficultyMix: { foundation: 20, intermediate: 45, advanced: 35 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "35",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Reading and Listening",
          questionCount: 25,
          topicPool: "firstThree",
          difficultyMix: { foundation: 15, intermediate: 45, advanced: 40 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "55",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
      ],
    },
  },
  {
    id: "gre_quant",
    label: "GRE Quant",
    family: assessmentExamFamilyMetadataById.gre.category,
    familyId: "gre",
    programFamilyCode: assessmentExamFamilyMetadataById.gre.programFamilyCode,
    note: "Structured timed sections with simulation-oriented difficulty and formal review controls.",
    chip: "Graduate prep",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.gre.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.gre.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.gre.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.gre.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.gre.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.gre.recommendedQuestionMixGuidance,
      authoringNote: assessmentExamFamilyMetadataById.gre.authoringNote,
      suggestedDurationMinutes: "70",
      suggestedSectionCount: 2,
      suggestedQuestionCountBand: "40 questions",
      suggestedAccessPolicy: "Stars-only premium drill",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "GRE Quant Drill",
        codeSuffix: "GREQ-01",
        description: "Graduate-level quantitative reasoning simulation with timed structured sections.",
        examType: "assessment",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "70",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "section",
        navigationMode: "sequential",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "fullscreen",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: false,
        allowReturnToPreviousSection: false,
      },
      economy: {
        policyType: "stars_only",
        starCost: "120",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "section",
        recommendedNavigationMode: "sequential",
        recommendedMediaFlow: "light_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary:
          "Graduate-level quant simulation with disciplined section pacing and minimal distractions.",
        creatorSummary: "Keep sections balanced, difficulty high, and reference media light.",
      },
      selectionMode: "strict",
      sections: [
        {
          name: "Quant Section 1",
          questionCount: 20,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 10, intermediate: 40, advanced: 50 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "35",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Quant Section 2",
          questionCount: 20,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 5, intermediate: 35, advanced: 60 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "35",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
      ],
    },
  },
  {
    id: "neet_mock",
    label: "NEET Mock",
    family: assessmentExamFamilyMetadataById.neet.category,
    familyId: "neet",
    programFamilyCode: assessmentExamFamilyMetadataById.neet.programFamilyCode,
    note: "Large high-stakes mock setup with sequential exam-day style discipline.",
    chip: "Competitive exam",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.neet.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.neet.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.neet.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.neet.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.neet.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.neet.recommendedQuestionMixGuidance,
      authoringNote: assessmentExamFamilyMetadataById.neet.authoringNote,
      suggestedDurationMinutes: "180",
      suggestedSectionCount: 3,
      suggestedQuestionCountBand: "135 questions",
      suggestedAccessPolicy: "Premium mock access",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "NEET Full Mock",
        codeSuffix: "NEET-01",
        description: "Full-length competitive mock with strict sequencing and exam-day style runtime rules.",
        examType: "final_exam",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "180",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "section",
        navigationMode: "sequential",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "violation_limited",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: false,
        allowReturnToPreviousSection: false,
      },
      economy: {
        policyType: "stars_only",
        starCost: "200",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "section",
        recommendedNavigationMode: "sequential",
        recommendedMediaFlow: "free_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary:
          "High-stakes competitive mock built for stamina, speed, and strict sequence discipline.",
        creatorSummary:
          "Use full-length timed sections, stronger negative marking, and minimal media distractions.",
      },
      selectionMode: "subject_fallback",
      sections: [
        {
          name: "Biology",
          questionCount: 45,
          topicPool: "allOrFirstThree",
          difficultyMix: { foundation: 20, intermediate: 45, advanced: 35 },
          marksPerQuestion: "4.00",
          negativeMarksPerQuestion: "1.00",
          timerEnabled: true,
          durationMinutes: "60",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Chemistry",
          questionCount: 45,
          topicPool: "allOrFirstThree",
          difficultyMix: { foundation: 15, intermediate: 45, advanced: 40 },
          marksPerQuestion: "4.00",
          negativeMarksPerQuestion: "1.00",
          timerEnabled: true,
          durationMinutes: "60",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
        {
          name: "Physics",
          questionCount: 45,
          topicPool: "allOrFirstThree",
          difficultyMix: { foundation: 10, intermediate: 40, advanced: 50 },
          marksPerQuestion: "4.00",
          negativeMarksPerQuestion: "1.00",
          timerEnabled: true,
          durationMinutes: "60",
          allowSkipSection: false,
          lockAfterSubmit: true,
        },
      ],
    },
  },
  {
    id: "jee_mains_math",
    label: "JEE Mains Math",
    family: assessmentExamFamilyMetadataById.jee.category,
    familyId: "jee",
    programFamilyCode: assessmentExamFamilyMetadataById.jee.programFamilyCode,
    note: "Mixed objective/numeric style setup with stronger timing and challenge emphasis.",
    chip: "STEM intensive",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.jee.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.jee.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.jee.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.jee.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.jee.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.jee.recommendedQuestionMixGuidance,
      authoringNote: assessmentExamFamilyMetadataById.jee.authoringNote,
      suggestedDurationMinutes: "90",
      suggestedSectionCount: 2,
      suggestedQuestionCountBand: "30 questions",
      suggestedAccessPolicy: "Premium timed mock",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "JEE Mains Math Mock",
        codeSuffix: "JEE-01",
        description: "Structured engineering-entrance mock with numeric and objective emphasis.",
        examType: "assessment",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "90",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "hybrid",
        navigationMode: "hybrid",
        attemptPolicy: "single",
        resultPublishMode: "after_review",
        reviewMode: "attempted_only",
        securityMode: "fullscreen",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: true,
        allowReturnToPreviousSection: false,
      },
      economy: {
        policyType: "stars_only",
        starCost: "150",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "hybrid",
        recommendedNavigationMode: "hybrid",
        recommendedMediaFlow: "light_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary:
          "Engineering-entrance pacing with a balance of objective and numeric reasoning blocks.",
        creatorSummary:
          "Keep objective and numeric sections distinct and weight advanced items more heavily.",
      },
      selectionMode: "strict",
      sections: [
        {
          name: "Objective",
          questionCount: 20,
          topicPool: "firstThree",
          difficultyMix: { foundation: 10, intermediate: 45, advanced: 45 },
          marksPerQuestion: "4.00",
          negativeMarksPerQuestion: "1.00",
          timerEnabled: true,
          durationMinutes: "45",
          allowSkipSection: true,
          lockAfterSubmit: false,
        },
        {
          name: "Numeric",
          questionCount: 10,
          topicPool: "firstTwo",
          difficultyMix: { foundation: 5, intermediate: 40, advanced: 55 },
          marksPerQuestion: "4.00",
          negativeMarksPerQuestion: "0.00",
          timerEnabled: true,
          durationMinutes: "45",
          allowSkipSection: true,
          lockAfterSubmit: false,
        },
      ],
    },
  },
  {
    id: "aws_practitioner",
    label: "AWS Practitioner",
    family: assessmentExamFamilyMetadataById.aws_certification.category,
    familyId: "aws_certification",
    programFamilyCode: assessmentExamFamilyMetadataById.aws_certification.programFamilyCode,
    note: "Certification-focused practice set with single-section coverage and optional reference behavior.",
    chip: "Certification",
    recommendations: {
      defaultExamType: assessmentExamFamilyMetadataById.aws_certification.recommendedExamType,
      timingExpectation: assessmentExamFamilyMetadataById.aws_certification.recommendedTimingModel,
      securitySuggestion: assessmentExamFamilyMetadataById.aws_certification.recommendedSecurityMode,
      reviewPolicy: assessmentExamFamilyMetadataById.aws_certification.recommendedReviewPolicy,
      resultVisibility: assessmentExamFamilyMetadataById.aws_certification.recommendedResultVisibility,
      questionMixGuidance: assessmentExamFamilyMetadataById.aws_certification.recommendedQuestionMixGuidance,
      authoringNote: assessmentExamFamilyMetadataById.aws_certification.authoringNote,
      suggestedDurationMinutes: "45",
      suggestedSectionCount: 1,
      suggestedQuestionCountBand: "25 questions",
      suggestedAccessPolicy: "Free repeatable certification practice",
    },
    builderDefaults: {
      exam: {
        titleSuffix: "AWS Practitioner Pack",
        codeSuffix: "AWS-01",
        description: "Certification-focused practice set with concise structure and quick performance feedback.",
        examType: "practice",
        deliveryMode: "online",
        status: "draft",
        durationMinutes: "45",
        passingMarks: "0.00",
      },
      delivery: {
        timerMode: "global",
        navigationMode: "free_exam",
        attemptPolicy: "unlimited_practice",
        resultPublishMode: "immediate",
        reviewMode: "solution_review",
        securityMode: "normal",
        assignmentMode: "scope",
        maxAttempts: "1",
        randomizeQuestions: true,
        randomizeOptions: true,
        allowResume: true,
        allowSectionSwitching: true,
        allowReturnToPreviousSection: true,
      },
      economy: {
        policyType: "free",
        starCost: "0",
        entitlementCode: "",
        unlockRuleType: "",
      },
      experience: {
        recommendedTimerMode: "global",
        recommendedNavigationMode: "free_exam",
        recommendedMediaFlow: "free_reference",
        supportsSectionMediaGuidance: false,
        learnerSummary:
          "Certification prep flow optimized for repetition, confidence, and immediate feedback.",
        creatorSummary:
          "Keep it concise, objective-heavy, and friendly to repeated practice sessions.",
      },
      selectionMode: "strict",
      sections: [
        {
          name: "Cloud Concepts",
          questionCount: 25,
          topicPool: "firstThree",
          difficultyMix: { foundation: 35, intermediate: 45, advanced: 20 },
          marksPerQuestion: "1.00",
          negativeMarksPerQuestion: "0.00",
        },
      ],
    },
  },
];
