"use client";

import { useEffect, useState } from "react";

type TeacherOption = {
  id: string;
  full_name: string;
  employee_code: string;
  is_active: boolean;
};

type InstituteExamsTeacherFilterProps = {
  apiPath: string;
  initialTeachers: TeacherOption[];
  selectedTeacherId: string;
};

export function InstituteExamsTeacherFilter({
  apiPath,
  initialTeachers,
  selectedTeacherId,
}: InstituteExamsTeacherFilterProps) {
  const [teachers, setTeachers] = useState<TeacherOption[]>(initialTeachers);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTeachers(initialTeachers);
  }, [initialTeachers]);

  useEffect(() => {
    if (teachers.length > 0 || isLoading) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      void fetch(apiPath, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to load institute teachers.");
          }

          const payload = (await response.json()) as { teachers?: TeacherOption[] };
          setTeachers(Array.isArray(payload.teachers) ? payload.teachers : []);
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiPath, isLoading, teachers.length]);

  return (
    <select defaultValue={selectedTeacherId} name="teacher">
      <option value="">All teachers</option>
      {teachers.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {teacher.full_name} ({teacher.employee_code})
        </option>
      ))}
      {isLoading && teachers.length === 0 ? (
        <option disabled value="__loading">
          Loading teachers...
        </option>
      ) : null}
    </select>
  );
}
