import {
  QUESTION_IMPORT_COLUMNS,
  QUESTION_IMPORT_FALLBACK_SAMPLE_ROW,
} from "@/lib/teacher/question-import-contract";

export const FALLBACK_QUESTION_IMPORT_COLUMNS = QUESTION_IMPORT_COLUMNS;

export function buildFallbackQuestionImportTemplate() {
  return {
    columns: [...FALLBACK_QUESTION_IMPORT_COLUMNS],
    csv_content: [
      FALLBACK_QUESTION_IMPORT_COLUMNS.join(","),
      QUESTION_IMPORT_FALLBACK_SAMPLE_ROW.join(","),
    ].join("\n"),
  };
}
