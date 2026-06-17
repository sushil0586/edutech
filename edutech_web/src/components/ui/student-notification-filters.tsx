"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { FilterSummaryPills } from "@/components/ui/filter-summary-pills";
import type { StudentNotificationFacetOption } from "@/features/dashboard/types";
import { buildNotificationsHref } from "@/lib/student/notifications";
import { formatFilterValue } from "@/lib/workspace/filter-utils";

type Props = {
  pageSize: number;
  status: string;
  notificationType: string;
  relatedObjectType: string;
  ordering: string;
  groupBy: string;
  search: string;
  notificationTypes: StudentNotificationFacetOption[];
  relatedObjectTypes: StudentNotificationFacetOption[];
};

export function StudentNotificationFilters({
  pageSize,
  status,
  notificationType,
  relatedObjectType,
  ordering,
  groupBy,
  search,
  notificationTypes,
  relatedObjectTypes,
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    pageSize: String(pageSize),
    status,
    notificationType,
    relatedObjectType,
    ordering,
    search,
  });
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(filters.search);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }

    const nextHref = buildNotificationsHref({
      page: 1,
      pageSize: Number.parseInt(filters.pageSize, 10) || 24,
      status: filters.status,
      notificationType: filters.notificationType,
      relatedObjectType: filters.relatedObjectType,
      ordering: filters.ordering,
      groupBy,
      search: deferredSearch.trim(),
    });

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
    }, deferredSearch === search ? 0 : 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    deferredSearch,
    filters.notificationType,
    filters.ordering,
    filters.pageSize,
    filters.relatedObjectType,
    filters.status,
    groupBy,
    router,
    search,
  ]);

  return (
    <section className="contentCard workspaceFiltersCard studentNotificationFiltersCard">
      <div className="studentNotificationFiltersHeader">
        <strong>Inbox filters</strong>
        <small>{isPending ? "Refreshing inbox..." : "Changes apply automatically"}</small>
      </div>

      <div className="workspaceFiltersForm">
        <label className="workspaceFilterField workspaceFilterFieldWide">
          <span>Search</span>
          <input
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                search: value,
              }));
            }}
            placeholder="Search titles, messages, or alert categories"
            type="search"
            value={filters.search}
          />
        </label>

        <label className="workspaceFilterField">
          <span>Status</span>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                status: value,
              }));
            }}
            value={filters.status}
          >
            <option value="all">All</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Category</span>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                notificationType: value,
              }));
            }}
            value={filters.notificationType}
          >
            <option value="">All categories</option>
            {notificationTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Related object</span>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                relatedObjectType: value,
              }));
            }}
            value={filters.relatedObjectType}
          >
            <option value="">All objects</option>
            {relatedObjectTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Sort by</span>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                ordering: value,
              }));
            }}
            value={filters.ordering}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="unread_first">Unread first</option>
            <option value="type">Category</option>
          </select>
        </label>

        <label className="workspaceFilterField">
          <span>Page size</span>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setFilters((current) => ({
                ...current,
                pageSize: value,
              }));
            }}
            value={filters.pageSize}
          >
            {[12, 24, 48, 96].map((value) => (
              <option key={value} value={value}>
                {value} per page
              </option>
            ))}
          </select>
        </label>

        <div className="workspaceFilterActions">
          <Link className="button buttonGhost" href="/app/notifications">
            Reset
          </Link>
        </div>
      </div>

      <FilterSummaryPills
        items={[
          { label: "Search", value: filters.search },
          { label: "Status", value: filters.status !== "all" ? formatFilterValue(filters.status) : null },
          {
            label: "Category",
            value: filters.notificationType
              ? filters.notificationType.replaceAll("_", " ")
              : null,
          },
          {
            label: "Object",
            value: filters.relatedObjectType
              ? filters.relatedObjectType.replaceAll("_", " ")
              : null,
          },
          { label: "Sort", value: filters.ordering !== "newest" ? formatFilterValue(filters.ordering) : null },
          { label: "Page size", value: filters.pageSize !== "24" ? filters.pageSize : null },
        ]}
      />
    </section>
  );
}
