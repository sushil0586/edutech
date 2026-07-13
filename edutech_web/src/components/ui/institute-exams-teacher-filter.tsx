"use client";

import { useEffect, useRef, useState } from "react";

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
  const [loadedTeachers, setLoadedTeachers] = useState<TeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestStartedRef = useRef(initialTeachers.length > 0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const teachers = initialTeachers.length > 0 ? initialTeachers : loadedTeachers;

  function loadTeachersOnDemand() {
    if (teachers.length > 0 || isLoading || requestStartedRef.current) {
      return;
    }

    requestStartedRef.current = true;
    const controller = new AbortController();
    requestControllerRef.current?.abort();
    requestControllerRef.current = controller;
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
        setLoadedTeachers(Array.isArray(payload.teachers) ? payload.teachers : []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        requestStartedRef.current = false;
      })
      .finally(() => {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
        setIsLoading(false);
      });
  }

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  return (
    <select
      defaultValue={selectedTeacherId}
      name="teacher"
      onFocus={loadTeachersOnDemand}
      onPointerDown={loadTeachersOnDemand}
    >
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
