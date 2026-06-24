export type QuestionImportSampleTemplate = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  csvContent: string;
};

export type QuestionPassageImportSampleTemplate = QuestionImportSampleTemplate;

type SampleRow = Record<string, string>;

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function buildCsv(columns: string[], rows: SampleRow[]) {
  const header = columns.join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column] ?? "")).join(","),
  );
  return [header, ...body].join("\n");
}

function baseRow(): SampleRow {
  return {
    subject: "SUBJECT-CODE",
    topic: "TOPIC-CODE",
    passage_title: "",
    passage_order: "",
    question_type: "",
    difficulty_level: "foundation",
    question_text: "",
    assertion_text: "",
    reason_text: "",
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    correct_answer: "",
    accepted_answers: "",
    numeric_tolerance: "",
    review_guidance: "",
    default_marks: "1.00",
    negative_marks: "0.00",
    explanation: "",
    tags: "sample-import",
  };
}

export function buildQuestionImportSampleTemplates(columns: string[]) {
  const mcqSingle = {
    ...baseRow(),
    question_type: "mcq_single",
    question_text: "Which AWS service stores files as objects?",
    option_1: "Amazon S3",
    option_2: "Amazon RDS",
    option_3: "Amazon Redshift",
    option_4: "Amazon Route 53",
    correct_answer: "1",
    explanation: "Amazon S3 is AWS object storage.",
    tags: "aws|storage|mcq",
  };

  const trueFalse = {
    ...baseRow(),
    question_type: "true_false",
    question_text: "Auto Scaling helps adjust capacity based on demand.",
    option_1: "True",
    option_2: "False",
    correct_answer: "1",
    explanation: "Auto Scaling increases or decreases resources automatically.",
    tags: "aws|autoscaling|true-false",
  };

  const shortAnswer = {
    ...baseRow(),
    question_type: "short_answer",
    question_text: "What does IAM stand for in AWS?",
    accepted_answers: "Identity and Access Management|AWS Identity and Access Management",
    explanation: "IAM controls users, roles, and permissions in AWS.",
    tags: "aws|identity|short-answer",
  };

  const assertionReason = {
    ...baseRow(),
    question_type: "assertion_reason",
    question_text: "Choose the correct relationship between the assertion and the reason.",
    assertion_text: "AWS Auto Scaling can automatically increase compute capacity during demand spikes.",
    reason_text: "Auto Scaling monitors demand signals and adjusts resource count based on configured policies.",
    correct_answer: "1",
    explanation: "Both statements are true, and the reason explains the assertion.",
    tags: "aws|autoscaling|assertion-reason",
  };

  const numeric = {
    ...baseRow(),
    question_type: "numeric_answer",
    question_text: "If each question gives 2 marks, how many marks do 5 correct answers give?",
    accepted_answers: "10|10.0",
    numeric_tolerance: "0.01",
    explanation: "5 multiplied by 2 equals 10.",
    tags: "math|numeric|short-answer",
  };

  const fillInBlanks = {
    ...baseRow(),
    question_type: "fill_in_blanks",
    question_text: "Amazon [[blank]] stores data as [[blank]] inside buckets.",
    accepted_answers: "S3|objects",
    explanation: "Amazon S3 stores objects in buckets.",
    tags: "aws|storage|fill-in-the-blanks",
  };

  const matrixMatch = {
    ...baseRow(),
    question_type: "matrix_match",
    question_text: "Match each AWS service in Column I with its best description in Column II, then choose the correct option.",
    matrix_left_items: "S3|EC2|RDS",
    matrix_right_items: "Object storage|Virtual machine|Managed relational database",
    option_1: "A-1, B-2, C-3",
    option_2: "A-2, B-1, C-3",
    option_3: "A-3, B-2, C-1",
    option_4: "A-1, B-3, C-2",
    correct_answer: "1",
    explanation: "S3 is object storage, EC2 is virtual compute, and RDS is a managed relational database.",
    tags: "aws|matching|matrix",
  };

  const essay = {
    ...baseRow(),
    question_type: "essay_manual_review",
    difficulty_level: "advanced",
    default_marks: "5.00",
    question_text: "Explain how cloud elasticity differs from scalability with one practical example.",
    review_guidance:
      "Award full marks when the response clearly defines both terms and gives one correct real-world example.",
    explanation: "This question is manually reviewed, so explanation can store model guidance.",
    tags: "cloud|essay|review",
  };

  const linkedComprehension = {
    ...baseRow(),
    passage_title: "Cloud Security Reading Set",
    passage_order: "1",
    question_type: "mcq_single",
    question_text: "According to the passage, who secures the cloud infrastructure?",
    option_1: "The cloud provider",
    option_2: "Only the customer",
    option_3: "A third-party auditor",
    option_4: "The internet service provider",
    correct_answer: "1",
    explanation: "The provider is responsible for security of the cloud.",
    tags: "aws|comprehension|linked",
  };

  const variants: Array<Omit<QuestionImportSampleTemplate, "csvContent"> & { rows: SampleRow[] }> = [
    {
      id: "mcq-single",
      title: "Single Correct MCQ",
      description: "Shows option columns plus a single numeric correct answer index.",
      fileName: "nexora-sample-mcq-single.csv",
      rows: [mcqSingle],
    },
    {
      id: "true-false",
      title: "True / False",
      description: "Uses the same objective structure with two options and one correct answer.",
      fileName: "nexora-sample-true-false.csv",
      rows: [trueFalse],
    },
    {
      id: "assertion-reason",
      title: "Assertion / Reason",
      description: "Uses assertion_text and reason_text with a fixed four-option pattern and a correct answer index from 1 to 4.",
      fileName: "nexora-sample-assertion-reason.csv",
      rows: [assertionReason],
    },
    {
      id: "short-answer",
      title: "Short Answer",
      description: "Uses accepted answers with pipe-separated variants instead of options.",
      fileName: "nexora-sample-short-answer.csv",
      rows: [shortAnswer],
    },
    {
      id: "numeric",
      title: "Numeric Response",
      description: "Shows accepted answers plus numeric tolerance for near-match scoring.",
      fileName: "nexora-sample-numeric.csv",
      rows: [numeric],
    },
    {
      id: "fill-in-blanks",
      title: "Fill in the Blanks",
      description: "Uses [[blank]] markers in the prompt and ordered accepted answers for each blank.",
      fileName: "nexora-sample-fill-in-blanks.csv",
      rows: [fillInBlanks],
    },
    {
      id: "matrix-match",
      title: "Matrix Match",
      description: "Uses matrix_left_items and matrix_right_items with standard answer options and a single correct answer index.",
      fileName: "nexora-sample-matrix-match.csv",
      rows: [matrixMatch],
    },
    {
      id: "essay",
      title: "Essay Review",
      description: "Shows manual-review guidance without objective options or accepted answers.",
      fileName: "nexora-sample-essay.csv",
      rows: [essay],
    },
    {
      id: "linked-comprehension",
      title: "Linked to Comprehension",
      description: "Shows how to connect a question row to an existing comprehension set using passage title and order.",
      fileName: "nexora-sample-linked-comprehension.csv",
      rows: [linkedComprehension],
    },
  ];

  return variants.map((variant) => ({
    id: variant.id,
    title: variant.title,
    description: variant.description,
    fileName: variant.fileName,
    csvContent: buildCsv(columns, variant.rows),
  }));
}

export function buildQuestionPassageImportSampleTemplates(columns: string[]) {
  const markdownRow = {
    subject: "SUBJECT-CODE",
    topic: "TOPIC-CODE",
    title: "Cloud Security Reading Set",
    content_format: "markdown_latex",
    passage_text:
      "AWS follows a shared responsibility model. The provider manages the security of the cloud, while customers manage security in the cloud.",
    description: "Use this set for comprehension-style cloud security questions.",
  };

  const richTextRow = {
    subject: "SUBJECT-CODE",
    topic: "TOPIC-CODE",
    title: "Renewable Energy Passage",
    content_format: "rich_text_html",
    passage_text:
      "<h2>Renewable Energy</h2><p>Solar and wind power reduce dependency on fossil fuels and support long-term sustainability.</p>",
    description: "<p>Internal teacher note: focus on inference and summary-based follow-up questions.</p>",
  };

  const variants: Array<Omit<QuestionPassageImportSampleTemplate, "csvContent"> & { rows: SampleRow[] }> = [
    {
      id: "passage-markdown",
      title: "Markdown Passage",
      description: "A clean sample for shared reading passages using markdown/plain text friendly content.",
      fileName: "nexora-sample-comprehension-markdown.csv",
      rows: [markdownRow],
    },
    {
      id: "passage-rich-text",
      title: "Rich Text Passage",
      description: "A sample showing HTML-rich passage content for formatted comprehension sets.",
      fileName: "nexora-sample-comprehension-rich-text.csv",
      rows: [richTextRow],
    },
  ];

  return variants.map((variant) => ({
    id: variant.id,
    title: variant.title,
    description: variant.description,
    fileName: variant.fileName,
    csvContent: buildCsv(columns, variant.rows),
  }));
}
