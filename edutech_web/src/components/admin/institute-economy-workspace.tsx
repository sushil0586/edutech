"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  EconomyOperatorPolicy,
  StudentPaymentOrder,
  StudentRewardEvent,
  StudentUnlockState,
  StudentWalletSummary,
} from "@/features/dashboard/types";

type StudentOption = {
  id: string;
  full_name: string;
  admission_no: string;
  is_active: boolean;
};

type WalletResponse = StudentWalletSummary;
type RewardResponse = StudentRewardEvent[];
type OrderResponse = StudentPaymentOrder[];
type UnlockRefreshResponse = {
  data?: StudentUnlockState[];
  message?: string;
};
type PolicyResponse = EconomyOperatorPolicy;

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function InstituteEconomyWorkspace({
  students,
  initialStudentId,
}: {
  students: StudentOption[];
  initialStudentId: string | null;
}) {
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [workspaceView, setWorkspaceView] = useState<"all" | "actions" | "wallet" | "activity" | "orders">("actions");
  const [supportView, setSupportView] = useState<"all" | "wallet" | "rewards" | "unlocks" | "orders">("wallet");
  const [historyRows, setHistoryRows] = useState<"4" | "6" | "10">("4");
  const [studentId, setStudentId] = useState(initialStudentId ?? students[0]?.id ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const [wallet, setWallet] = useState<StudentWalletSummary | null>(null);
  const [policy, setPolicy] = useState<EconomyOperatorPolicy | null>(null);
  const [rewards, setRewards] = useState<StudentRewardEvent[]>([]);
  const [orders, setOrders] = useState<StudentPaymentOrder[]>([]);
  const [refreshStates, setRefreshStates] = useState<StudentUnlockState[]>([]);
  const [reason, setReason] = useState("");
  const [stars, setStars] = useState("25");
  const [sourceReference, setSourceReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previousStudentIdRef = useRef(studentId);
  const filteredStudents = useMemo(() => {
    if (studentStatusFilter === "active") {
      return students.filter((student) => student.is_active);
    }
    if (studentStatusFilter === "inactive") {
      return students.filter((student) => !student.is_active);
    }
    return students;
  }, [studentStatusFilter, students]);
  const visibleHistoryRows = Number(historyRows);
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [studentId, students],
  );
  const visibleRewards = rewards.slice(0, visibleHistoryRows);
  const visibleOrders = orders.slice(0, visibleHistoryRows);
  const supportViewOptions = useMemo(() => {
    switch (workspaceView) {
      case "wallet":
        return [{ value: "wallet", label: "Wallet only" }] as const;
      case "activity":
        return [
          { value: "rewards", label: "Rewards only" },
          { value: "unlocks", label: "Unlocks only" },
          { value: "all", label: "Rewards and unlocks" },
        ] as const;
      case "orders":
        return [{ value: "orders", label: "Orders only" }] as const;
      case "actions":
        return [
          { value: "wallet", label: "Wallet context" },
          { value: "rewards", label: "Rewards context" },
          { value: "unlocks", label: "Unlock context" },
          { value: "orders", label: "Orders context" },
          { value: "all", label: "All support context" },
        ] as const;
      case "all":
      default:
        return [
          { value: "all", label: "All sections" },
          { value: "wallet", label: "Wallet only" },
          { value: "rewards", label: "Rewards only" },
          { value: "unlocks", label: "Unlocks only" },
          { value: "orders", label: "Orders only" },
        ] as const;
    }
  }, [workspaceView]);
  const supportViewLabel =
    workspaceView === "activity"
      ? "Activity detail"
      : workspaceView === "actions"
        ? "Context to keep visible"
        : "Visible data panel";
  const supportViewLocked = supportViewOptions.length === 1;
  const showWalletPanel = supportView === "all" || supportView === "wallet";
  const showRewardsPanel = supportView === "all" || supportView === "rewards";
  const showUnlocksPanel = supportView === "all" || supportView === "unlocks";
  const showOrdersPanel = supportView === "all" || supportView === "orders";
  const showActionPanel = workspaceView === "all" || workspaceView === "actions";
  const showWalletWorkspacePanel = workspaceView === "all" || workspaceView === "wallet";
  const showActivityWorkspacePanel = workspaceView === "all" || workspaceView === "activity";
  const showOrdersWorkspacePanel = workspaceView === "all" || workspaceView === "orders";

  useEffect(() => {
    if (!filteredStudents.length) {
      if (studentId) {
        setStudentId("");
      }
      return;
    }

    if (!filteredStudents.some((student) => student.id === studentId)) {
      setStudentId(filteredStudents[0]?.id ?? "");
    }
  }, [filteredStudents, studentId]);

  useEffect(() => {
    if (!supportViewOptions.some((option) => option.value === supportView)) {
      setSupportView(supportViewOptions[0]?.value ?? "all");
    }
  }, [supportView, supportViewOptions]);

  useEffect(() => {
    let cancelled = false;

    async function loadPolicy() {
      try {
        const response = await fetch("/api/admin/economy/policy", {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as PolicyResponse & {
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : `Policy request failed with status ${response.status}`,
          );
        }
        if (!cancelled) {
          setPolicy(body);
        }
      } catch {
        if (!cancelled) {
          setPolicy(null);
        }
      }
    }

    void loadPolicy();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    let cancelled = false;

    async function loadStudentEconomy() {
      setLoading(true);
      setError("");

      if (previousStudentIdRef.current !== studentId) {
        setMessage("");
        previousStudentIdRef.current = studentId;
      }

      try {
        const [walletResponse, rewardsResponse, ordersResponse] = await Promise.all([
          fetch(`/api/admin/economy/student/${studentId}/wallet`, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(`/api/admin/economy/student/${studentId}/rewards`, {
            method: "GET",
            cache: "no-store",
          }),
          fetch(`/api/admin/economy/student/${studentId}/orders`, {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        const walletBody = (await walletResponse.json().catch(() => ({}))) as WalletResponse & {
          detail?: string;
        };
        const rewardsBody = (await rewardsResponse.json().catch(() => [])) as RewardResponse & {
          detail?: string;
        };
        const ordersBody = (await ordersResponse.json().catch(() => [])) as OrderResponse & {
          detail?: string;
        };

        if (!walletResponse.ok) {
          throw new Error(
            typeof walletBody.detail === "string"
              ? walletBody.detail
              : `Wallet request failed with status ${walletResponse.status}`,
          );
        }

        if (!rewardsResponse.ok) {
          const rewardDetail =
            rewardsBody && typeof rewardsBody === "object" && "detail" in rewardsBody
              ? rewardsBody.detail
              : null;
          throw new Error(
            typeof rewardDetail === "string"
              ? rewardDetail
              : `Rewards request failed with status ${rewardsResponse.status}`,
          );
        }

        if (!ordersResponse.ok) {
          const orderDetail =
            ordersBody && typeof ordersBody === "object" && "detail" in ordersBody
              ? ordersBody.detail
              : null;
          throw new Error(
            typeof orderDetail === "string"
              ? orderDetail
              : `Orders request failed with status ${ordersResponse.status}`,
          );
        }

        if (!cancelled) {
          setWallet(walletBody);
          setRewards(Array.isArray(rewardsBody) ? rewardsBody : []);
          setOrders(Array.isArray(ordersBody) ? ordersBody : []);
          setRefreshStates([]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setWallet(null);
          setRewards([]);
          setOrders([]);
          setRefreshStates([]);
          setError(loadError instanceof Error ? loadError.message : "Unable to load student economy.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStudentEconomy();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, studentId]);

  async function handleGrantStars() {
    if (!studentId) {
      setError("Select a student before granting stars.");
      return;
    }

    if (!reason.trim()) {
      setError("Enter a clear reason for the grant.");
      return;
    }

    const starsToGrant = Number(stars);
    if (!Number.isFinite(starsToGrant) || starsToGrant <= 0) {
      setError("Stars must be a positive number.");
      return;
    }

    setGranting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/economy/grant-stars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student: studentId,
          stars: starsToGrant,
          reason: reason.trim(),
          source_reference: sourceReference.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Grant request failed with status ${response.status}`,
        );
      }

      setMessage(body.message ?? "Stars granted successfully.");
      setReason("");
      setSourceReference("");
      setRefreshStates([]);
      setReloadKey((value) => value + 1);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Unable to grant stars.");
    } finally {
      setGranting(false);
    }
  }

  async function handleRefreshUnlocks() {
    if (!studentId) {
      setError("Select a student before refreshing unlock states.");
      return;
    }

    setRefreshing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/economy/student/${studentId}/refresh-unlocks`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as UnlockRefreshResponse & {
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Refresh request failed with status ${response.status}`,
        );
      }

      setRefreshStates(Array.isArray(body.data) ? body.data : []);
      setWorkspaceView("all");
      setSupportView("all");
      setMessage(body.message ?? "Unlock states refreshed successfully.");
      setReloadKey((value) => value + 1);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "Unable to refresh unlock states.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleConfirmOrder(order: StudentPaymentOrder) {
    if (!studentId) {
      setError("Select a student before confirming an order.");
      return;
    }

    setConfirmingOrderId(order.id);
    setError("");
    setMessage("");

    try {
      const uniqueReference = `manual-${order.id}-${Date.now()}`;
      const response = await fetch(`/api/admin/economy/orders/${order.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_transaction_reference: uniqueReference,
          metadata: {
            trigger: "admin_economy_workspace",
          },
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : `Order confirmation failed with status ${response.status}`,
        );
      }

      setMessage(body.message ?? "Payment order completed successfully.");
      setReloadKey((value) => value + 1);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm the order.");
    } finally {
      setConfirmingOrderId("");
    }
  }

  const pendingOrders = orders.filter((order) => ["pending", "processing"].includes(order.status));
  const grantStarsDisabledByPolicy = policy ? !policy.can_grant_stars : false;
  const confirmOrdersDisabledByPolicy = policy ? !policy.can_confirm_orders : false;
  const grantLimitLabel =
    policy?.role === "institute_admin" && policy.max_grant_stars != null
      ? `${policy.max_grant_stars} stars per action`
      : "No institute-admin grant cap";
  const orderLimitLabel =
    policy?.role === "institute_admin" && policy.max_confirm_order_amount
      ? `${policy.max_confirm_order_amount} ${policy.max_confirm_order_currency ?? ""}`.trim()
      : "No institute-admin order cap";

  return (
    <section className="dashboardLowerGrid">
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Student support actions</span>
          <h3>Inspect wallet state and perform controlled admin actions</h3>
          <p className="academicSectionDescription">
            This workspace stays tied to live institute-scoped economy endpoints. It supports wallet visibility, reward
            inspection, star grants, and unlock refresh without hardcoded pricing assumptions.
          </p>

          {policy ? (
            <div className="featurePlaceholder">
              <p>
                Active policy:
                {" "}
                {policy.role === "platform_admin"
                  ? "Platform admin has full support-action scope. Catalog governance remains platform-owned."
                  : `Institute admin support scope is institute-only. Grant limit: ${grantLimitLabel}. Order confirmation limit: ${orderLimitLabel}. Catalog governance remains platform-owned.`}
              </p>
            </div>
          ) : null}

          {message ? <p className="feedbackBanner feedbackBannerSuccess">{message}</p> : null}
          {error ? <p className="feedbackBanner feedbackBannerError">{error}</p> : null}

          <div className="setupFormGrid setupFormGridDense" style={{ marginBottom: 16 }}>
            <label className="setupField">
              <span>Workspace view</span>
              <select
                aria-label="Institute economy workspace view"
                value={workspaceView}
                onChange={(event) =>
                  setWorkspaceView(
                    event.target.value as "all" | "actions" | "wallet" | "activity" | "orders",
                  )
                }
              >
                <option value="all">All sections</option>
                <option value="actions">Support controls only</option>
                <option value="wallet">Wallet only</option>
                <option value="activity">Rewards and unlocks</option>
                <option value="orders">Orders only</option>
              </select>
            </label>
            <label className="setupField">
              <span>Student status filter</span>
              <select
                aria-label="Student status filter"
                value={studentStatusFilter}
                onChange={(event) =>
                  setStudentStatusFilter(event.target.value as "all" | "active" | "inactive")
                }
              >
                <option value="active">Active only</option>
                <option value="all">All students</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
            <label className="setupField">
              <span>{supportViewLabel}</span>
              <select
                aria-label="Support view"
                value={supportView}
                disabled={supportViewLocked}
                onChange={(event) =>
                  setSupportView(
                    event.target.value as "all" | "wallet" | "rewards" | "unlocks" | "orders",
                  )
                }
              >
                {supportViewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="setupField">
              <span>Visible history rows</span>
              <select
                aria-label="Visible history rows"
                value={historyRows}
                onChange={(event) => setHistoryRows(event.target.value as "4" | "6" | "10")}
              >
                <option value="4">4 rows</option>
                <option value="6">6 rows</option>
                <option value="10">10 rows</option>
              </select>
            </label>
          </div>

          <div className="resultsSummaryGrid" style={{ marginBottom: 16 }}>
            <article className="metricCard dashboardHeroCard">
              <span>Students in current filter</span>
              <strong>{filteredStudents.length}</strong>
              <small>{studentStatusFilter === "active" ? "Active roster only." : studentStatusFilter === "inactive" ? "Inactive-only support list." : "Full institute roster."}</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Selected student</span>
              <strong>{selectedStudent?.full_name ?? "None"}</strong>
              <small>{selectedStudent ? selectedStudent.admission_no : "Choose a student to load support data."}</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Visible support lane</span>
              <strong>{titleCase(supportView === "all" ? "all_sections" : supportView)}</strong>
              <small>Keep the visible dataset intentionally small.</small>
            </article>
            <article className="metricCard dashboardHeroCard">
              <span>Pending orders</span>
              <strong>{pendingOrders.length}</strong>
              <small>Settlement work waiting for operator review.</small>
            </article>
          </div>

          {showActionPanel ? (
            <section className="featurePlaceholder economySubscriptionEditorPanel">
              <strong>Support control center</strong>
              <p className="academicSectionDescription">
                Choose the student first, then use the grant and refresh controls below without opening unrelated wallet
                or order sections.
              </p>

              <div className="economyCompactStats">
                <span>{filteredStudents.length} students in current roster lens</span>
                <span>{selectedStudent ? `Working on ${selectedStudent.full_name}` : "No student selected"}</span>
              </div>

              <div className="economyWorkspaceSplitGrid">
                <div className="economyFormSection">
                  <div className="economyFormSectionHeader">
                    <strong>Student scope</strong>
                    <span>Keep the support action tied to one student and one lane at a time.</span>
                  </div>
                  <div className="setupFormGrid setupFormGridDense">
                    <label className="setupField">
                      <span>Student</span>
                      <select aria-label="Student" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                        {filteredStudents.length === 0 ? <option value="">No students in scope</option> : null}
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.full_name} ({student.admission_no}){student.is_active ? "" : " - inactive"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="economyFormSection">
                  <div className="economyFormSectionHeader">
                    <strong>Grant and unlock controls</strong>
                    <span>Run the two mutable support actions from one compact area with clear reason and reference fields.</span>
                  </div>
                  <div className="setupFormGrid setupFormGridDense">
                    <label className="setupField">
                      <span>Stars to grant</span>
                      <input
                        aria-label="Stars to grant"
                        min="1"
                        type="number"
                        value={stars}
                        onChange={(event) => setStars(event.target.value)}
                      />
                    </label>
                    <label className="setupField">
                      <span>Reason</span>
                      <input
                        aria-label="Reason"
                        placeholder="Manual adjustment, referral reward, support correction"
                        type="text"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>
                    <label className="setupField">
                      <span>Reference</span>
                      <input
                        aria-label="Reference"
                        placeholder="Optional ticket or approval reference"
                        type="text"
                        value={sourceReference}
                        onChange={(event) => setSourceReference(event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="economyEditorActionBar">
                <button
                  className="button buttonPrimary"
                  disabled={granting || loading || !studentId || grantStarsDisabledByPolicy}
                  onClick={() => void handleGrantStars()}
                  type="button"
                >
                  {grantStarsDisabledByPolicy ? "Grant Stars Disabled by Policy" : granting ? "Granting..." : "Grant Stars"}
                </button>
                <button
                  className="button buttonSecondary"
                  disabled={refreshing || loading || !studentId}
                  onClick={() => void handleRefreshUnlocks()}
                  type="button"
                >
                  {refreshing ? "Refreshing..." : "Refresh Unlocks"}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </article>

      {showWalletPanel && showWalletWorkspacePanel ? (
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Live wallet state</span>
          <h3>{wallet?.student_name ?? "Select a student"}</h3>
          {loading ? (
            <div className="featurePlaceholder">
              <p>Loading student economy data...</p>
            </div>
          ) : wallet ? (
            <div className="resultsSummaryGrid">
              <article className="metricCard metricCardPrimary dashboardHeroCard">
                <span>Available stars</span>
                <strong>{wallet.available_stars}</strong>
                <small>Current wallet balance.</small>
              </article>
              <article className="metricCard dashboardHeroCard">
                <span>Lifetime earned</span>
                <strong>{wallet.lifetime_earned_stars}</strong>
                <small>Total credited stars.</small>
              </article>
              <article className="metricCard dashboardHeroCard">
                <span>Lifetime spent</span>
                <strong>{wallet.lifetime_spent_stars}</strong>
                <small>Total used for access.</small>
              </article>
              <article className="metricCard dashboardHeroCard">
                <span>Admin grants</span>
                <strong>{wallet.admin_granted_stars}</strong>
                <small>Manually granted by operators.</small>
              </article>
              <article className="metricCard dashboardHeroCard">
                <span>Paid credits</span>
                <strong>{wallet.paid_credited_stars}</strong>
                <small>Stars credited from purchases.</small>
              </article>
              <article className="metricCard dashboardHeroCard">
                <span>Subscription credits</span>
                <strong>{wallet.subscription_credited_stars}</strong>
                <small>Stars credited from subscriptions.</small>
              </article>
            </div>
          ) : (
            <div className="featurePlaceholder">
              <p>Select a student to inspect wallet activity.</p>
            </div>
          )}
        </div>
      </article>
      ) : null}

      {showRewardsPanel && showActivityWorkspacePanel ? (
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Reward timeline</span>
          <h3>Recent reward events</h3>
          {rewards.length === 0 ? (
            <div className="featurePlaceholder">
              <p>No reward events were returned for the selected student.</p>
            </div>
          ) : (
            <div className="weakTopicStack">
              {visibleRewards.map((reward) => (
                <div className="weakTopicRow" key={reward.id}>
                  <div>
                    <strong>{reward.reward_rule_name || "Reward event"}</strong>
                    <span>
                      {reward.event_key}
                      {reward.event_reference ? ` · ${reward.event_reference}` : ""}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>+{reward.awarded_stars}</strong>
                    <span>{formatDateTime(reward.processed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
      ) : null}

      {showUnlocksPanel && showActivityWorkspacePanel ? (
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Unlock refresh output</span>
          <h3>Current unlock states after recalculation</h3>
          {refreshStates.length === 0 ? (
            <div className="featurePlaceholder">
              <p>Run refresh when you need the latest exam and content unlock state evaluation.</p>
            </div>
          ) : (
            <div className="weakTopicStack">
              {refreshStates.map((state) => (
                <div className="weakTopicRow" key={state.id}>
                  <div>
                    <strong>{state.content_label}</strong>
                    <span>
                      {titleCase(state.content_type)}
                      {state.subject_name ? ` · ${state.subject_name}` : ""}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{titleCase(state.status)}</strong>
                    <span>{formatDateTime(state.last_evaluated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
      ) : null}

      {showOrdersPanel && showOrdersWorkspacePanel ? (
      <article className="dashboardPanel weakTopicsPanel">
        <div className="studentPageTight">
          <span className="studentDashboardTag">Operator queue</span>
          <h3>Pending order requests for the selected student</h3>
          <p className="academicSectionDescription">
            Confirm real pending star-pack or subscription requests here so wallet credit and
            subscription activation follow the same backend settlement flow the student sees.
          </p>

          {loading ? (
            <div className="featurePlaceholder">
              <p>Loading order requests...</p>
            </div>
          ) : pendingOrders.length ? (
            <div className="weakTopicStack">
              {pendingOrders.map((order) => (
                <div className="weakTopicRow" key={order.id}>
                  <div>
                    <strong>
                      {order.order_type === "subscription"
                        ? order.subscription_plan_name || "Subscription request"
                        : order.star_pack_name || "Star pack request"}
                    </strong>
                    <span>
                      {titleCase(order.order_type)} · {order.currency} {order.amount} · {titleCase(order.status)}
                    </span>
                  </div>
                  <div className="resultCardActions">
                    <button
                      className="button buttonPrimary"
                      disabled={confirmingOrderId === order.id || confirmOrdersDisabledByPolicy}
                      onClick={() => void handleConfirmOrder(order)}
                      type="button"
                    >
                      {confirmOrdersDisabledByPolicy
                        ? "Confirmation Disabled by Policy"
                        : confirmingOrderId === order.id
                          ? "Confirming..."
                          : "Confirm Order"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="featurePlaceholder">
              <p>No pending order requests are visible for the selected student right now.</p>
            </div>
          )}

          {orders.length ? (
            <div className="weakTopicStack">
              {visibleOrders.map((order) => (
                <div className="weakTopicRow" key={`${order.id}-history`}>
                  <div>
                    <strong>
                      {order.order_type === "subscription"
                        ? order.subscription_plan_name || "Subscription order"
                        : order.star_pack_name || "Star pack order"}
                    </strong>
                    <span>
                      {titleCase(order.status)} · {formatDateTime(order.updated_at)}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{order.currency} {order.amount}</strong>
                    <span>{titleCase(order.order_type)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </article>
      ) : null}
    </section>
  );
}
