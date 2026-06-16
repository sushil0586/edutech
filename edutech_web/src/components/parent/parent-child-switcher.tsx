import Link from "next/link";
import type { ParentChildRecord } from "@/lib/api/parent";

function childHref(basePath: string, childId?: string) {
  return childId ? `${basePath}?child_id=${encodeURIComponent(childId)}` : basePath;
}

export function ParentChildSwitcher({
  childRecords,
  basePath,
  currentChildId,
  allLabel = "All Linked Children",
}: {
  childRecords: ParentChildRecord[];
  basePath: string;
  currentChildId?: string;
  allLabel?: string;
}) {
  if (!childRecords.length) {
    return null;
  }

  return (
    <section className="dashboardPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">Child Focus</span>
        <h3>Switch the active child without leaving this workspace</h3>
        <p className="sectionDescription">
          The parent workspace stays relationship-driven, so every dashboard, progress, and alert view
          can be scoped to one linked child at a time.
        </p>
        <div className="resultCardActions">
          <Link
            className={`button ${!currentChildId ? "buttonPrimary" : "buttonGhost"}`}
            href={childHref(basePath)}
          >
            {allLabel}
          </Link>
          {childRecords.map((child) => (
            <Link
              className={`button ${currentChildId === child.student_id ? "buttonPrimary" : "buttonGhost"}`}
              href={childHref(basePath, child.student_id)}
              key={child.relationship_id}
            >
              {child.student_name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
