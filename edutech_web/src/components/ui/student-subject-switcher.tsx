"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ALL_SUBJECTS_CONTEXT,
  type StudentSubjectOption,
  STUDENT_SUBJECT_CONTEXT_COOKIE,
} from "@/lib/student/subject-context";

function updateSubjectCookie(value: string) {
  const maxAge = 60 * 60 * 24 * 30;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${STUDENT_SUBJECT_CONTEXT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${secure ? "; secure" : ""}`;
}

export function StudentSubjectSwitcher({
  options,
  selectedSubject,
}: {
  options: StudentSubjectOption[];
  selectedSubject: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="appTopbarSubjectSelector" aria-label="Dashboard subject context">
      <span className="appTopbarSubjectLabel">Subject view</span>
      <div className="appTopbarSubjectSelectWrap">
        <select
          value={selectedSubject}
          disabled={isPending}
          onChange={(event) => {
            const nextValue = event.target.value || ALL_SUBJECTS_CONTEXT;
            updateSubjectCookie(nextValue);
            startTransition(() => {
              router.refresh();
            });
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
