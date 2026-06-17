"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState, useTransition } from "react";
import type {
  StudentNotification,
  StudentNotificationListResponse,
} from "@/features/dashboard/types";
import {
  buildNotificationsHref,
  formatNotificationType,
  groupNotifications,
  notificationHref,
  notificationTone,
  NOTIFICATION_GROUP_VALUES,
  relativeTimeLabel,
} from "@/lib/student/notifications";
import { formatFilterValue } from "@/lib/workspace/filter-utils";

type InboxProps = {
  initialPage: StudentNotificationListResponse;
  initialGroupBy: string;
  page: number;
  pageSize: number;
  status: string;
  notificationType: string;
  relatedObjectType: string;
  ordering: string;
  search: string;
};

type InboxState = {
  notifications: StudentNotification[];
  summary: StudentNotificationListResponse["summary"];
};

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  if ("error" in payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  if ("detail" in payload && typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }
  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return fallback;
}

export function StudentNotificationsInbox({
  initialPage,
  initialGroupBy,
  page,
  pageSize,
  status,
  notificationType,
  relatedObjectType,
  ordering,
  search,
}: InboxProps) {
  const [inbox, setInbox] = useState<InboxState>({
    notifications: initialPage.results,
    summary: initialPage.summary,
  });
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [isPending, startUiTransition] = useTransition();

  const deferredNotifications = useDeferredValue(inbox.notifications);
  const groups = groupNotifications(deferredNotifications, groupBy);
  const filteredCount = initialPage.count;
  const currentPageCount = inbox.notifications.length;
  const totalPages = Math.max(Math.ceil(filteredCount / pageSize), 1);

  const linkState = {
    pageSize,
    status,
    notificationType,
    relatedObjectType,
    ordering,
    groupBy,
    search,
  };

  async function markNotificationRead(notificationId: string) {
    const snapshot = inbox;
    const alreadyRead = inbox.notifications.find(
      (notification) => notification.id === notificationId,
    )?.is_read;

    if (alreadyRead) {
      return;
    }

    setError("");
    setMessage("");
    setPendingNotificationId(notificationId);
    setInbox((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
              read_at: notification.read_at ?? new Date().toISOString(),
            }
          : notification,
      ),
      summary: {
        total: current.summary.total,
        unread: Math.max(current.summary.unread - 1, 0),
        read: current.summary.read + 1,
      },
    }));

    startUiTransition(async () => {
      try {
        const response = await fetch(
          `/api/student/notifications/${notificationId}/mark-read`,
          {
            method: "POST",
          },
        );
        const payload = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          throw new Error(
            readErrorMessage(payload, "Unable to mark this notification as read."),
          );
        }
        setMessage("Notification marked as read.");
      } catch (updateError) {
        setInbox(snapshot);
        setError(
          updateError instanceof Error && updateError.message
            ? updateError.message
            : "Unable to mark this notification as read.",
        );
      } finally {
        setPendingNotificationId(null);
      }
    });
  }

  async function markAllRead() {
    const snapshot = inbox;
    if (snapshot.summary.unread === 0) {
      return;
    }

    setError("");
    setMessage("");
    setPendingNotificationId("all");
    setInbox((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.is_read
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: notification.read_at ?? new Date().toISOString(),
            },
      ),
      summary: {
        total: current.summary.total,
        unread: 0,
        read: current.summary.total,
      },
    }));

    startUiTransition(async () => {
      try {
        const response = await fetch("/api/student/notifications/mark-all-read", {
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          throw new Error(
            readErrorMessage(payload, "Unable to mark all notifications as read."),
          );
        }
        setMessage("All notifications marked as read.");
      } catch (updateError) {
        setInbox(snapshot);
        setError(
          updateError instanceof Error && updateError.message
            ? updateError.message
            : "Unable to mark all notifications as read.",
        );
      } finally {
        setPendingNotificationId(null);
      }
    });
  }

  return (
    <>
      {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
      {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

      <section className="studentNotificationToolbar">
        <div>
          <strong>{filteredCount} matching notifications</strong>
          <small>
            Page {page} of {totalPages} · {currentPageCount} shown in this slice
          </small>
        </div>
        <div className="studentNotificationToolbarActions">
          <label className="studentNotificationGroupingControl">
            <span>Group by</span>
            <select
              disabled={isPending}
              onChange={(event) => {
                const value = event.target.value;
                startTransition(() => setGroupBy(value));
              }}
              value={groupBy}
            >
              {NOTIFICATION_GROUP_VALUES.map((value) => (
                <option key={value} value={value}>
                  {formatFilterValue(value)}
                </option>
              ))}
            </select>
          </label>
          <span className="statusPill statusDefault">
            {inbox.summary.unread} unread on this inbox
          </span>
          <button
            className="button buttonPrimary"
            disabled={isPending || inbox.summary.unread === 0}
            onClick={() => {
              void markAllRead();
            }}
            type="button"
          >
            {isPending && pendingNotificationId === "all"
              ? "Updating Inbox..."
              : "Mark All Read"}
          </button>
        </div>
      </section>

      <div className="workspaceResultsGroup">
        {groups.map((group) => (
          <section className="studentNotificationGroup" key={group.key}>
            <div className="studentNotificationGroupHeader">
              <strong>{group.label}</strong>
              <span>{group.items.length} notifications</span>
            </div>
            <div className="studentNotificationGrid">
              {group.items.map((notification) => (
                <article
                  className={`contentCard studentNotificationSurface ${
                    notification.is_read
                      ? "studentNotificationRead"
                      : "studentNotificationUnread"
                  }`}
                  key={notification.id}
                >
                  <div className="studentResultSurfaceHead">
                    <div>
                      <strong>{notification.title}</strong>
                      <span>{relativeTimeLabel(notification.created_at)}</span>
                    </div>
                    <span
                      className={`statusPill ${notificationTone(notification.notification_type)}`}
                    >
                      {formatNotificationType(notification.notification_type)}
                    </span>
                  </div>

                  <p className="studentNotificationMessage">{notification.message}</p>

                  <div className="studentResultFooter">
                    <div className="studentResultHelper">
                      <span>Related object</span>
                      <strong>
                        {notification.related_object_type
                          ? formatNotificationType(notification.related_object_type)
                          : "General"}
                        {notification.related_object_id
                          ? ` · ${notification.related_object_id}`
                          : ""}
                      </strong>
                      <small>
                        {notification.is_read
                          ? "Already acknowledged by the learner."
                          : "Unread and waiting for learner action."}
                      </small>
                    </div>
                    <div className="studentInsightHeroActions">
                      <span
                        className={`statusPill ${
                          notification.is_read ? "statusLive" : "statusWarning"
                        }`}
                      >
                        {notification.is_read ? "Read" : "Unread"}
                      </span>
                      {notification.is_read ? (
                        <span className="button buttonGhost questionBankButtonDisabled">
                          Mark Read
                        </span>
                      ) : (
                        <button
                          className="button buttonGhost"
                          disabled={isPending}
                          onClick={() => {
                            void markNotificationRead(notification.id);
                          }}
                          type="button"
                        >
                          {pendingNotificationId === notification.id
                            ? "Marking..."
                            : "Mark Read"}
                        </button>
                      )}
                      <Link
                        className="button buttonSecondary"
                        href={notificationHref(notification)}
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="studentNotificationPagination">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="questionBankButtonRow">
          {page > 1 ? (
            <Link
              className="button buttonGhost"
              href={buildNotificationsHref({
                ...linkState,
                page: page - 1,
              })}
            >
              Previous
            </Link>
          ) : (
            <span className="button buttonGhost questionBankButtonDisabled">Previous</span>
          )}
          {initialPage.next ? (
            <Link
              className="button buttonSecondary"
              href={buildNotificationsHref({
                ...linkState,
                page: page + 1,
              })}
            >
              Next
            </Link>
          ) : (
            <span className="button buttonSecondary questionBankButtonDisabled">Next</span>
          )}
        </div>
      </section>
    </>
  );
}
