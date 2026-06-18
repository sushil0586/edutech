import Link from "next/link";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentNotificationFilters } from "@/components/ui/student-notification-filters";
import { StudentNotificationsInbox } from "@/components/ui/student-notifications-inbox";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  fetchStudentNotifications,
  getStudentApiState,
} from "@/lib/api/student";
import {
  NOTIFICATION_GROUP_VALUES,
  NOTIFICATION_ORDERING_VALUES,
  NOTIFICATION_PAGE_SIZE_VALUES,
  NOTIFICATION_STATUS_VALUES,
  parsePositiveInt,
} from "@/lib/student/notifications";
import { resolveFilterValue } from "@/lib/workspace/filter-utils";

type NotificationSearchParams = {
  page?: string;
  page_size?: string;
  status?: string;
  notification_type?: string;
  related_object_type?: string;
  ordering?: string;
  group_by?: string;
  search?: string;
};

async function loadNotifications(filters: {
  page: number;
  pageSize: number;
  status: string;
  notificationType: string;
  relatedObjectType: string;
  ordering: string;
  search: string;
}) {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      notificationsPage: null,
    };
  }

  try {
    const notificationsPage = await fetchStudentNotifications({
      page: filters.page,
      page_size: filters.pageSize,
      status: filters.status,
      notification_type: filters.notificationType || null,
      related_object_type: filters.relatedObjectType || null,
      ordering: filters.ordering,
      search: filters.search || null,
    });

    return {
      source: "live" as const,
      notificationsPage,
    };
  } catch {
    return {
      source: "error" as const,
      notificationsPage: null,
    };
  }
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<NotificationSearchParams>;
}) {
  const params = await searchParams;
  const page = parsePositiveInt(params.page, 1);
  const pageSizeCandidate = parsePositiveInt(params.page_size, 24);
  const pageSize = NOTIFICATION_PAGE_SIZE_VALUES.includes(
    pageSizeCandidate as (typeof NOTIFICATION_PAGE_SIZE_VALUES)[number],
  )
    ? pageSizeCandidate
    : 24;
  const status = resolveFilterValue(params.status, NOTIFICATION_STATUS_VALUES, "all");
  const ordering = resolveFilterValue(
    params.ordering,
    NOTIFICATION_ORDERING_VALUES,
    "newest",
  );
  const groupBy = resolveFilterValue(params.group_by, NOTIFICATION_GROUP_VALUES, "day");
  const notificationType = (params.notification_type ?? "").trim();
  const relatedObjectType = (params.related_object_type ?? "").trim();
  const search = (params.search ?? "").trim();

  const { source, notificationsPage } = await loadNotifications({
    page,
    pageSize,
    status,
    notificationType,
    relatedObjectType,
    ordering,
    search,
  });

  if (source !== "live" || !notificationsPage) {
    return (
      <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerNotificationsPage">
        <StudentPageHeader
          title="Notifications"
          description="A live notification center backed by the in-app notifications API, including inbox filters and mark-read actions."
          statusLabel={
            source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load notifications"
          }
          statusTone={source === "unconfigured" ? "warning" : "demo"}
        />

        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for student notifications"
              : "Student notifications could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page depends on the live inbox API contract for filtering, sorting, and grouping."
              : "The notification center is connected to live backend APIs, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? [
                  "Notifications list endpoint",
                  "Notification unread count summary",
                  "Active student web session",
                ]
              : ["Backend connectivity", "Notification inbox endpoints"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      </div>
    );
  }

  const summary = notificationsPage.summary;

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerNotificationsPage">
      <StudentPageHeader
        title="Notifications"
        description="Search, sort, group, and review student alerts from one lighter-weight inbox backed by a paged API feed."
        statusLabel={`${summary.unread} unread`}
        statusTone="live"
      />

      {summary.total === 0 ? (
        <StudentStatePanel
          eyebrow="No notifications yet"
          title="Your notification center is empty right now"
          description="No in-app notifications were returned for the authenticated student. Once exams are published, go live, or results are released, updates will appear here automatically."
          ctaHref="/app/exams"
          ctaLabel="Open Exams"
          statusLabel="Waiting for learner updates"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Inbox Overview</span>
              <strong>{summary.unread} unread alerts</strong>
              <small>
                {notificationsPage.count} matching notifications in the current view · {summary.total} total in
                your inbox.
              </small>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonSecondary" href="/app/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Inbox Total",
                value: summary.total,
                note: "All student-facing alerts currently stored in the inbox",
                tone: "primary",
              },
              {
                label: "Filtered Results",
                value: notificationsPage.count,
                note: "Notifications matching the active search, sort, and filter state",
              },
              {
                label: "Unread Alerts",
                value: summary.unread,
                note: "Unread reminders and activity updates",
              },
              {
                label: "Read Alerts",
                value: summary.read,
                note: "Notifications already acknowledged by the learner",
              },
            ]}
          />

          <StudentNotificationFilters
            groupBy={groupBy}
            notificationType={notificationType}
            notificationTypes={notificationsPage.available_notification_types}
            ordering={ordering}
            pageSize={pageSize}
            relatedObjectType={relatedObjectType}
            relatedObjectTypes={notificationsPage.available_related_object_types}
            search={search}
            status={status}
          />

          {!notificationsPage.results.length ? (
            <StudentStatePanel
              eyebrow="No matches"
              title="No notifications match the current filters"
              description="Try widening the status, object, or category filters to bring more notifications back into view."
              ctaHref="/app/notifications"
              ctaLabel="Clear filters"
              statusLabel="Adjust the inbox view"
            />
          ) : (
            <StudentNotificationsInbox
              initialGroupBy={groupBy}
              initialPage={notificationsPage}
              notificationType={notificationType}
              ordering={ordering}
              page={page}
              pageSize={pageSize}
              relatedObjectType={relatedObjectType}
              search={search}
              status={status}
            />
          )}
        </>
      )}
    </div>
  );
}
