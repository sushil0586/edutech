import Link from "next/link";
import type { AccountProfile } from "@/lib/auth/session";
import { StudentSourceSwitcher } from "@/components/ui/student-source-switcher";
import { StudentSubjectSwitcher } from "@/components/ui/student-subject-switcher";
import type { StudentWalletSummary } from "@/features/dashboard/types";
import type {
  StudentSourceOption,
  StudentSourceValue,
  StudentSubjectOption,
  StudentTeacherSourceOption,
} from "@/lib/student/subject-context";

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());
}

export type WorkspaceTopbarAction = {
  href: string;
  label: string;
  icon: string;
};

export function WorkspaceTopbar({
  profile,
  workspaceLabel,
  summaryText,
  hintLabel = "Pilot",
  actions = [],
  sourceOptions = [],
  selectedSource = "all",
  teacherOptions = [],
  selectedTeacherId = null,
  subjectOptions = [],
  selectedSubject = "overall",
  walletSummary = null,
  unreadCount = 0,
  profileHref,
  profileLabel,
}: {
  profile: AccountProfile;
  workspaceLabel: string;
  summaryText: string;
  hintLabel?: string;
  actions?: WorkspaceTopbarAction[];
  sourceOptions?: StudentSourceOption[];
  selectedSource?: StudentSourceValue;
  teacherOptions?: StudentTeacherSourceOption[];
  selectedTeacherId?: string | null;
  subjectOptions?: StudentSubjectOption[];
  selectedSubject?: string;
  walletSummary?: StudentWalletSummary | null;
  unreadCount?: number;
  profileHref?: string;
  profileLabel?: string;
}) {
  const resolvedProfileLabel =
    profileLabel ?? profile.display_name ?? profile.username;
  const initial = resolvedProfileLabel.charAt(0).toUpperCase();
  const hasFilters = sourceOptions.length > 0 || subjectOptions.length > 0;
  return (
    <div className="appTopbar">
      <div className="appTopbarIntro">
        <span className="appTopbarLabel">{workspaceLabel}</span>
        <strong>{formatToday()}</strong>
      </div>

      <div className="appSearch appSearchStatic" aria-label={workspaceLabel}>
        <span className="appSearchIcon" aria-hidden="true">
          ⌕
        </span>
        <span className="appSearchText">{summaryText}</span>
        <span className="appSearchHint">{hintLabel}</span>
      </div>

      <div className="appTopbarActions">
        {hasFilters ? (
          <div className="appTopbarFiltersRail">
            {sourceOptions.length > 0 ? (
              <StudentSourceSwitcher
                sourceOptions={sourceOptions}
                selectedSource={selectedSource}
                teacherOptions={teacherOptions}
                selectedTeacherId={selectedTeacherId}
              />
            ) : null}
            {subjectOptions.length > 0 ? (
              <StudentSubjectSwitcher
                options={subjectOptions}
                selectedSubject={selectedSubject}
              />
            ) : null}
          </div>
        ) : null}
        {walletSummary ? (
          <Link className="appTopbarWalletPill" href="/app/wallet">
            <span className="appTopbarWalletIcon" aria-hidden="true">
              *
            </span>
            <div>
              <strong>{walletSummary.available_stars.toLocaleString("en-IN")}</strong>
              <span>Stars</span>
            </div>
          </Link>
        ) : null}
        {profileHref ? (
          <Link
            className="appTopbarIconButton"
            href="/app/notifications"
            aria-label="Notifications"
          >
            <span aria-hidden="true">!</span>
            {unreadCount > 0 ? <i>{unreadCount > 9 ? "9+" : unreadCount}</i> : null}
          </Link>
        ) : null}
        {actions.map((action) => (
          <Link className="appTopbarAction" href={action.href} key={action.href}>
            <span className="appTopbarActionIcon" aria-hidden="true">
              {action.icon}
            </span>
            <span>{action.label}</span>
          </Link>
        ))}
        {profileHref ? (
          <Link className="appTopbarAction" href={profileHref}>
            <span className="appTopbarActionIcon" aria-hidden="true">
              {initial}
            </span>
            <span>Profile</span>
          </Link>
        ) : null}
        <div className="appTopbarProfile">
          <span className="appTopbarAvatar" aria-hidden="true">
            {initial}
          </span>
          <div>
            <strong>{resolvedProfileLabel}</strong>
            <span>{profile.role.replaceAll("_", " ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
