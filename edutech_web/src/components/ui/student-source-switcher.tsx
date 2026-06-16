"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ALL_SOURCES_CONTEXT,
  type StudentSourceOption,
  type StudentSourceValue,
  STUDENT_SOURCE_CONTEXT_COOKIE,
  STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE,
  type StudentTeacherSourceOption,
} from "@/lib/student/subject-context";

function updateSourceCookies(source: StudentSourceValue, teacherId?: string | null) {
  const maxAge = 60 * 60 * 24 * 30;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${STUDENT_SOURCE_CONTEXT_COOKIE}=${encodeURIComponent(source)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
  const resolvedTeacher = source === "teacher" ? teacherId?.trim() || "" : "";
  document.cookie = `${STUDENT_SOURCE_TEACHER_CONTEXT_COOKIE}=${encodeURIComponent(resolvedTeacher)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
}

export function StudentSourceSwitcher({
  sourceOptions,
  selectedSource,
  teacherOptions,
  selectedTeacherId,
}: {
  sourceOptions: StudentSourceOption[];
  selectedSource: StudentSourceValue;
  teacherOptions: StudentTeacherSourceOption[];
  selectedTeacherId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <label className="appTopbarSubjectSelector" aria-label="Dashboard source context">
        <span className="appTopbarSubjectLabel">Source view</span>
        <div className="appTopbarSubjectSelectWrap">
          <select
            value={selectedSource}
            disabled={isPending}
            onChange={(event) => {
              const nextSource = (event.target.value || ALL_SOURCES_CONTEXT) as StudentSourceValue;
              updateSourceCookies(nextSource, nextSource === "teacher" ? selectedTeacherId : null);
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </label>

      {selectedSource === "teacher" ? (
        <label className="appTopbarSubjectSelector" aria-label="Teacher source context">
          <span className="appTopbarSubjectLabel">Teacher lane</span>
          <div className="appTopbarSubjectSelectWrap">
            <select
              value={selectedTeacherId ?? ""}
              disabled={isPending || teacherOptions.length === 0}
              onChange={(event) => {
                updateSourceCookies("teacher", event.target.value || null);
                startTransition(() => {
                  router.refresh();
                });
              }}
            >
              <option value="">
                {teacherOptions.length === 0 ? "No teacher lanes" : "All Teachers"}
              </option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      ) : null}
    </>
  );
}
