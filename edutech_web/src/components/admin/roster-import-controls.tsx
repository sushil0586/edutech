"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RosterImportDialog } from "@/components/admin/roster-import-dialog";

export function RosterImportControls({
  instituteId,
  allowedResources = ["students", "teachers"],
}: {
  instituteId: string | null;
  allowedResources?: Array<"students" | "teachers">;
}) {
  const router = useRouter();
  const [activeResource, setActiveResource] = useState<"students" | "teachers" | null>(null);

  function closeDialog() {
    setActiveResource(null);
  }

  function handleImported() {
    router.refresh();
  }

  return (
    <div className="accountActionStack">
      <div className="accountActionRow">
        {allowedResources.includes("students") ? (
          <button
            className="appTopbarAction"
            disabled={!instituteId}
            onClick={() => setActiveResource("students")}
            type="button"
          >
            <span className="appTopbarActionIcon" aria-hidden="true">
              ⌁
            </span>
            Import students
          </button>
        ) : null}
        {allowedResources.includes("teachers") ? (
          <button
            className="appTopbarAction"
            disabled={!instituteId}
            onClick={() => setActiveResource("teachers")}
            type="button"
          >
            <span className="appTopbarActionIcon" aria-hidden="true">
              ⌁
            </span>
            Import teachers
          </button>
        ) : null}
      </div>

      {activeResource ? (
        <RosterImportDialog
          instituteId={instituteId ?? ""}
          open
          onClose={closeDialog}
          onImported={handleImported}
          resource={activeResource}
          subtitle={
            activeResource === "students"
              ? "Upload a CSV to create student profiles and optional login credentials in one step."
              : "Upload a CSV to create teacher profiles and optional login credentials in one step."
          }
          title={activeResource === "students" ? "Bulk import students" : "Bulk import teachers"}
        />
      ) : null}
    </div>
  );
}
