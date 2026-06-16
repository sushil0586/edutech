import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  fetchStudentNotifications,
  fetchStudentUnreadCount,
  getStudentApiState,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from "@/lib/api/student";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";

function notificationTone(type: string) {
  if (type.includes("result")) return "statusLive";
  if (type.includes("starting") || type.includes("live")) return "statusWarning";
  return "statusDemo";
}

function formatNotificationType(value: string) {
  return value.replaceAll("_", " ");
}

function notificationHref(notification: {
  related_object_type: string;
  related_object_id: string;
  metadata: Record<string, unknown>;
}) {
  const route =
    typeof notification.metadata.route === "string" ? notification.metadata.route : "";
  const examId =
    typeof notification.metadata.exam_id === "string"
      ? notification.metadata.exam_id
      : "";
  const attemptId =
    typeof notification.metadata.attempt_id === "string"
      ? notification.metadata.attempt_id
      : "";

  if (route === "student_exam_detail" && examId) {
    return `/app/exams/${examId}`;
  }

  if (route === "student_attempt_summary" && attemptId) {
    return `/app/attempts/${attemptId}/summary`;
  }

  if (notification.related_object_type === "exam" && notification.related_object_id) {
    return `/app/exams/${notification.related_object_id}`;
  }

  if (notification.related_object_type === "attempt" && notification.related_object_id) {
    return `/app/attempts/${notification.related_object_id}/summary`;
  }

  return "/app/notifications";
}

function relativeTimeLabel(isoDate: string) {
  const createdAt = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(Math.round((now - createdAt) / 60000), 0);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

async function markReadAction(formData: FormData) {
  "use server";

  const notificationId = String(formData.get("notification_id") ?? "");
  if (!notificationId) return;

  await markStudentNotificationRead(notificationId);
  revalidatePath("/app/notifications");
}

async function markAllReadAction() {
  "use server";

  await markAllStudentNotificationsRead();
  revalidatePath("/app/notifications");
}

async function loadNotifications() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      count: 0,
      unreadCount: 0,
      notifications: [],
    };
  }

  try {
    const [list, unread] = await Promise.all([
      fetchStudentNotifications(),
      fetchStudentUnreadCount(),
    ]);

    return {
      source: "live" as const,
      count: list.count,
      unreadCount: unread.unread_count,
      notifications: list.results,
    };
  } catch {
    return {
      source: "error" as const,
      count: 0,
      unreadCount: 0,
      notifications: [],
    };
  }
}

export default async function NotificationsPage() {
  const { source, count, unreadCount, notifications } = await loadNotifications();
  const readCount = Math.max(count - unreadCount, 0);

  return (
    <div className="studentPage studentDashboardModern">
      <StudentPageHeader
        title="Notifications"
        description="A live notification center backed by the in-app notifications API, including unread counts and mark-read actions."
        statusLabel={
          source === "live"
            ? `${unreadCount} unread`
            : source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load notifications"
        }
        statusTone={
          source === "live"
            ? "live"
            : source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {source !== "live" ? (
        <StudentStatePanel
          eyebrow={source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            source === "unconfigured"
              ? "Waiting for student notifications"
              : "Student notifications could not be loaded"
          }
          description={
            source === "unconfigured"
              ? "This page only renders real in-app notifications. Configure the API base URL and sign in with an active student account to load the student-specific notification feed."
              : "The notification center is connected to live backend APIs, but the current request did not complete successfully."
          }
          bullets={
            source === "unconfigured"
              ? [
                  "Notifications feed endpoint",
                  "Unread count endpoint",
                  "Active student web session",
                ]
              : ["Backend connectivity", "Notification feed endpoints"]
          }
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : count === 0 ? (
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
          <section className="studentInsightHeroCard">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Inbox Overview</span>
              <strong>{unreadCount} unread alerts</strong>
              <p>
                This inbox stays connected to the same student session and helps the learner move quickly into exams, attempts, and results.
              </p>
              <small>{count} total notifications loaded from the backend feed.</small>
            </div>
            <div className="studentInsightHeroActions">
              <form action={markAllReadAction}>
                <ActionSubmitButton
                  className="button buttonPrimary"
                  disabled={unreadCount === 0}
                  idleLabel="Mark All Read"
                  pendingLabel="Updating Inbox..."
                />
              </form>
              <Link className="button buttonSecondary" href="/app/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Total Notifications",
                value: count,
                note: "All student-facing alerts returned by the backend",
                tone: "primary",
              },
              {
                label: "Unread Alerts",
                value: unreadCount,
                note: "Unread reminders and activity updates",
              },
              {
                label: "Read Alerts",
                value: readCount,
                note: "Notifications already acknowledged in this session",
              },
            ]}
          />

          <section className="studentNotificationGrid">
            {notifications.map((notification) => (
              <article
                className={`contentCard studentNotificationSurface ${
                  notification.is_read ? "studentNotificationRead" : "studentNotificationUnread"
                }`}
                key={notification.id}
              >
                <div className="studentResultSurfaceHead">
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{relativeTimeLabel(notification.created_at)}</span>
                  </div>
                  <span className={`statusPill ${notificationTone(notification.notification_type)}`}>
                    {formatNotificationType(notification.notification_type)}
                  </span>
                </div>

                <p className="studentNotificationMessage">{notification.message}</p>

                <div className="studentResultFooter">
                  <div className="studentResultHelper">
                    <span>Related object</span>
                    <strong>
                      {notification.related_object_type || "General"}
                      {notification.related_object_id
                        ? ` · ${notification.related_object_id}`
                        : ""}
                    </strong>
                    <small>{notification.is_read ? "Already acknowledged in this session." : "Unread and waiting for learner action."}</small>
                  </div>
                  <div className="studentInsightHeroActions">
                    <span
                      className={`statusPill ${
                        notification.is_read ? "statusLive" : "statusWarning"
                      }`}
                    >
                      {notification.is_read ? "Read" : "Unread"}
                    </span>
                    <form action={markReadAction}>
                      <input name="notification_id" type="hidden" value={notification.id} />
                      <ActionSubmitButton
                        className="button buttonGhost"
                        disabled={notification.is_read}
                        idleLabel="Mark Read"
                        pendingLabel="Marking..."
                      />
                    </form>
                    <Link className="button buttonSecondary" href={notificationHref(notification)}>
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
