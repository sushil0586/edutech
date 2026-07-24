"use client";

import Link from "next/link";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import {
  ALL_SOURCES_CONTEXT,
  ALL_SUBJECTS_CONTEXT,
  type StudentSourceValue,
  type StudentSubjectOption,
  type StudentTeacherSourceOption,
} from "@/lib/student/subject-context";
import { formatFilterValue } from "@/lib/workspace/filter-utils";

type StudentReportFiltersProps = {
  title?: string;
  helper?: string;
  basePath: string;
  selectedSubject: string;
  selectedSource: StudentSourceValue;
  selectedTeacherId: string | null;
  subjectOptions: StudentSubjectOption[];
  teacherOptions: StudentTeacherSourceOption[];
};

export function StudentReportFilters({
  title = "Report filters",
  helper = "Scope this report by subject, source, and teacher before reviewing the details.",
  basePath,
  selectedSubject,
  selectedSource,
  selectedTeacherId,
  subjectOptions,
  teacherOptions,
}: StudentReportFiltersProps) {
  const resetHref = basePath;

  return (
    <section className="contentCard workspaceFiltersCard">
      <div className="studentNotificationFiltersHeader">
        <strong>{title}</strong>
        <small>{helper}</small>
      </div>

      <form action={basePath} className="workspaceFiltersForm" method="GET">
        <label className="workspaceFilterField">
          <span>Subject</span>
          <select defaultValue={selectedSubject} name="subject">
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Source</span>
          <select defaultValue={selectedSource} name="source">
            <option value={ALL_SOURCES_CONTEXT}>All sources</option>
            <option value="platform">Platform</option>
            <option value="institute">Institute</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Teacher</span>
          <select defaultValue={selectedTeacherId ?? ""} name="teacher">
            <option value="">All teachers</option>
            {teacherOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <div className="workspaceFilterActions">
          <button className="button buttonPrimary" type="submit">
            Apply Filters
          </button>
          <Link className="button buttonGhost" href={resetHref}>
            Reset Filters
          </Link>
        </div>
      </form>

      <FilterSummaryPills
        items={[
          {
            label: "Subject",
            value:
              selectedSubject !== ALL_SUBJECTS_CONTEXT
                ? subjectOptions.find((option) => option.value === selectedSubject)?.label ??
                  selectedSubject
                : null,
          },
          {
            label: "Source",
            value:
              selectedSource !== ALL_SOURCES_CONTEXT
                ? formatFilterValue(selectedSource)
                : null,
          },
          {
            label: "Teacher",
            value:
              selectedSource === "teacher"
                ? teacherOptions.find((option) => option.id === selectedTeacherId)?.name ?? null
                : null,
          },
        ]}
      />
    </section>
  );
}
