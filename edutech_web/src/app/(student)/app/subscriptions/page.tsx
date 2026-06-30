import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import {
  createStudentSubscriptionOrder,
  fetchStudentPaymentOrders,
  fetchStudentSubscriptionPlans,
  fetchStudentSubscriptions,
  fetchStudentWalletSummary,
  getStudentApiState,
} from "@/lib/api/student";
import { studentDateTimeLabel } from "@/lib/student/formatters";

async function loadSubscriptions() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      wallet: null,
      plans: [],
      orders: [],
      subscriptions: [],
    };
  }

  try {
    const [wallet, plans, orders, subscriptions] = await Promise.all([
      fetchStudentWalletSummary(),
      fetchStudentSubscriptionPlans(),
      fetchStudentPaymentOrders(),
      fetchStudentSubscriptions(),
    ]);
    return {
      source: "live" as const,
      wallet,
      plans,
      orders,
      subscriptions,
    };
  } catch {
    return {
      source: "error" as const,
      wallet: null,
      plans: [],
      orders: [],
      subscriptions: [],
    };
  }
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function orderTone(status: string) {
  switch (status) {
    case "completed":
    case "active":
      return "live" as const;
    case "pending":
    case "processing":
    case "draft":
      return "warning" as const;
    case "cancelled":
    case "expired":
    case "failed":
    case "past_due":
      return "danger" as const;
    default:
      return "demo" as const;
  }
}

function titleCaseOrFallback(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return titleCase(value);
}

function planValueSummary(
  creditAmount: number | null,
  billingInterval: string,
  intervalCount: number,
) {
  if (!creditAmount || creditAmount <= 0) {
    return `Recurring ${titleCase(billingInterval)} plan`;
  }

  return `${creditAmount.toLocaleString("en-IN")} stars every ${titleCase(billingInterval).toLowerCase()}${intervalCount > 1 ? ` x ${intervalCount}` : ""}`;
}

type SubscriptionWorkspaceSection = "all" | "guidance" | "subscriptions" | "orders" | "plans";
type SubscriptionRows = "3" | "6" | "10";

function resolveSection(value: string | undefined): SubscriptionWorkspaceSection {
  if (value === "guidance" || value === "subscriptions" || value === "orders" || value === "plans") {
    return value;
  }
  return "all";
}

function resolveRows(value: string | undefined): SubscriptionRows {
  if (value === "3" || value === "6" || value === "10") {
    return value;
  }
  return "6";
}

async function createSubscriptionOrderAction(formData: FormData) {
  "use server";

  const cycleId = String(formData.get("subscription_plan_cycle_id") ?? "");
  if (!cycleId) {
    redirect("/app/subscriptions?error=Unable%20to%20resolve%20the%20selected%20subscription%20cycle.");
  }

  try {
    const response = await createStudentSubscriptionOrder({
      subscription_plan_cycle: cycleId,
      metadata: {
        source: "student_subscriptions",
      },
    });
    redirect(
      `/app/subscriptions?message=${encodeURIComponent(
        `${response.data.subscription_plan_name || "Subscription"} order created. It will remain pending until confirmed through the operator settlement flow.`,
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to create this subscription order right now.";
    redirect(`/app/subscriptions?error=${message}`);
  }
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; section?: string; rows?: string }>;
}) {
  const { error, message, section, rows } = await searchParams;
  const data = await loadSubscriptions();
  const subscriptionOrders = data.orders.filter(
    (order) => order.order_type === "subscription",
  );
  const activeSection = resolveSection(section);
  const rowLimit = Number(resolveRows(rows));
  const showGuidance = activeSection === "all" || activeSection === "guidance";
  const showSubscriptions = activeSection === "all" || activeSection === "subscriptions";
  const showOrders = activeSection === "all" || activeSection === "orders";
  const showPlans = activeSection === "all" || activeSection === "plans";
  const visibleSubscriptions = data.subscriptions.slice(0, rowLimit);
  const visibleSubscriptionOrders = subscriptionOrders.slice(0, rowLimit);
  const visiblePlans = data.plans.slice(0, rowLimit);

  return (
    <div className="studentPage studentDashboardModern studentLearnerPage studentLearnerAccountPage studentLearnerSubscriptionsPage">
      <StudentPageHeader
        title="Subscriptions"
        description="Compare recurring plans, track visible subscription records, and create subscription requests where the configured settlement flow supports them."
        statusLabel={
          data.source === "live"
            ? `${data.subscriptions.length} active records visible`
            : data.source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load subscriptions"
        }
        statusTone={
          data.source === "live"
            ? "live"
            : data.source === "unconfigured"
              ? "warning"
              : "demo"
        }
      />

      {message ? (
        <p className="feedbackBanner feedbackBannerSuccess">{decodeURIComponent(message)}</p>
      ) : null}
      {error ? (
        <p className="feedbackBanner feedbackBannerError">{decodeURIComponent(error)}</p>
      ) : null}

      {data.source !== "live" ? (
        <StudentStatePanel
          eyebrow={data.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            data.source === "unconfigured"
              ? "Waiting for live subscription data"
              : "Subscription data could not be loaded"
          }
          description="This screen depends on the economy subscription plan and student subscription endpoints."
          bullets={["Subscription plans", "Student subscriptions", "Star credit rules"]}
          ctaHref="/app/wallet"
          ctaLabel="Open Wallet"
        />
      ) : (
        <>
          <section className="studentInsightHeroCard studentInsightHeroCardCompact">
            <div className="studentInsightHeroCopy">
              <span className="studentDashboardTag">Subscription State</span>
              <strong>
                {data.subscriptions.length
                  ? "Recurring plans are already visible on this account"
                  : "No active subscription is visible yet"}
              </strong>
              <small>
                {subscriptionOrders.filter((order) => ["pending", "processing"].includes(order.status)).length} pending request
                {subscriptionOrders.filter((order) => ["pending", "processing"].includes(order.status)).length === 1 ? "" : "s"} ·{" "}
                {data.plans.reduce((count, plan) => count + plan.cycles.length, 0)} available cycle
                {data.plans.reduce((count, plan) => count + plan.cycles.length, 0) === 1 ? "" : "s"}
              </small>
              <p className="sectionDescription">
                This page is a truthful plan-selection and tracking surface. It can create real subscription order requests and show live subscription records, but final activation and credit timing still depend on the configured settlement flow.
              </p>
            </div>
            <div className="studentInsightHeroActions">
              <Link className="button buttonPrimary" href="/app/wallet">
                Open Wallet
              </Link>
              <Link className="button buttonSecondary" href="/app/exams">
                Browse Premium Exams
              </Link>
              <Link className="button buttonGhost" href="/app/practice">
                Open Practice
              </Link>
            </div>
          </section>

          <StudentKpiGrid
            items={[
              {
                label: "Available Stars",
                value: (data.wallet?.available_stars ?? 0).toLocaleString("en-IN"),
                note: "Current wallet balance",
                tone: "primary",
              },
              {
                label: "Active Plans",
                value: data.subscriptions.length,
                note: "Subscriptions already visible on your account",
              },
              {
                label: "Pending Orders",
                value: subscriptionOrders.filter((order) => ["pending", "processing"].includes(order.status)).length,
                note: "Requests still waiting for settlement",
              },
              {
                label: "Available Cycles",
                value: data.plans.reduce((count, plan) => count + plan.cycles.length, 0),
                note: "Plan choices currently configured for you",
              },
            ]}
          />

          <section className="contentCard">
            <div className="sectionHeading">
              <strong>Subscription workspace filters</strong>
            </div>
            <p className="sectionDescription">
              Focus on one subscription area at a time so the page stays smaller and easier to scan.
            </p>
            <form action="/app/subscriptions" className="workspaceFiltersForm" method="get">
              <div className="detailGrid">
                <label className="setupField">
                  <span>Section</span>
                  <select aria-label="Student subscription section" defaultValue={activeSection} name="section">
                    <option value="all">All sections</option>
                    <option value="guidance">Guidance only</option>
                    <option value="subscriptions">Active subscriptions only</option>
                    <option value="orders">Orders only</option>
                    <option value="plans">Available plans only</option>
                  </select>
                </label>
                <label className="setupField">
                  <span>Rows to show</span>
                  <select aria-label="Student subscription rows to show" defaultValue={String(rowLimit)} name="rows">
                    <option value="3">3 rows</option>
                    <option value="6">6 rows</option>
                    <option value="10">10 rows</option>
                  </select>
                </label>
              </div>
              <div className="buttonRow">
                <button className="button buttonPrimary" type="submit">
                  Apply Filters
                </button>
                <Link className="button buttonSecondary" href="/app/subscriptions">
                  Reset Filters
                </Link>
              </div>
            </form>
          </section>

          <section className="dashboardWorkspaceGrid">
            <div className="dashboardWorkspaceMain">
              {showGuidance ? (
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>When should you choose a subscription?</strong>
                </div>
                <p className="sectionDescription">
                  Choose a subscription when you expect to unlock premium content regularly and want
                  recurring star credits instead of buying one-time packs again and again.
                </p>
                <div className="detailGrid">
                  <article className="detailCard">
                    <span>Best for</span>
                    <strong>Regular learners</strong>
                    <small>Use this route if you practice every week and want predictable value.</small>
                  </article>
                  <article className="detailCard">
                    <span>Plan benefit</span>
                    <strong>Recurring credits</strong>
                    <small>Stars can be credited again on renewal when that rule is configured.</small>
                  </article>
                  <article className="detailCard">
                    <span>Alternative</span>
                    <strong>One-time packs</strong>
                    <small>Use wallet packs if you only need occasional premium unlocks.</small>
                  </article>
                </div>
              </section>
              ) : null}

              {showGuidance ? (
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>What This Page Can And Cannot Do</strong>
                </div>
                <div className="detailGrid">
                  <article className="detailCard">
                    <span>Visible here</span>
                    <strong>Plan comparison</strong>
                    <small>Review real cycles, recurring intervals, and configured star-credit rules from the backend.</small>
                  </article>
                  <article className="detailCard">
                    <span>Visible here</span>
                    <strong>Request tracking</strong>
                    <small>See whether a chosen plan is still only requested, already processed, or linked to wallet credit activity.</small>
                  </article>
                  <article className="detailCard">
                    <span>Not guaranteed here</span>
                    <strong>Immediate activation</strong>
                    <small>Choosing a plan does not promise instant subscription activation or instant wallet credit.</small>
                  </article>
                  <article className="detailCard">
                    <span>Best next route</span>
                    <strong>Wallet or premium content</strong>
                    <small>Use wallet to compare one-time value, then return to exams or practice when you are ready to spend stars.</small>
                  </article>
                </div>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>A safe order is: compare cycles here, confirm whether a request is still pending or already credited, then go back to wallet, exams, or practice to use the resulting value.</p>
                  </div>
                </div>
              </section>
              ) : null}

              {showSubscriptions ? (
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Active Student Subscriptions</strong>
                {data.wallet ? (
                  <StatusPill tone="live">
                    {data.wallet.available_stars.toLocaleString("en-IN")} stars available
                  </StatusPill>
                ) : null}
              </div>
              <p className="sectionDescription">
                Once a plan is confirmed, it can credit stars through the configured billing rules.
                Those stars then flow into the same wallet used for premium unlocks across the student app.
              </p>
              <div className="dashboardRailStack">
                {data.subscriptions.length ? (
                  visibleSubscriptions.map((subscription) => (
                    <div className="dashboardOfferCard" key={subscription.id}>
                      <div className="sectionHeading">
                        <strong>{subscription.plan_name}</strong>
                        <StatusPill tone={orderTone(subscription.status)}>
                          {titleCase(subscription.status)}
                        </StatusPill>
                      </div>
                      <span>
                        {titleCase(subscription.billing_interval)} x {subscription.interval_count}
                      </span>
                      <small>
                        {subscription.current_period_start
                          ? `Current period ${studentDateTimeLabel(subscription.current_period_start)}`
                          : "Current period starts when activation is confirmed"}
                        {subscription.current_period_end
                          ? ` to ${studentDateTimeLabel(subscription.current_period_end)}`
                          : ""}
                      </small>
                      <div className="detailGrid">
                        <article className="detailCard">
                          <span>Activation</span>
                          <strong>
                            {subscription.activated_at
                              ? studentDateTimeLabel(subscription.activated_at)
                              : "Pending"}
                          </strong>
                        </article>
                        <article className="detailCard">
                          <span>Billing events</span>
                          <strong>{subscription.billing_events.length}</strong>
                        </article>
                        <article className="detailCard">
                          <span>Latest credit state</span>
                          <strong>
                            {subscription.billing_events[0]?.ledger_entry
                              ? "Credited"
                              : subscription.billing_events.length
                                ? "Processed"
                                : "Waiting"}
                          </strong>
                        </article>
                      </div>
                      <div className="dashboardRailStack">
                        {subscription.billing_events.slice(0, 3).map((event) => (
                          <div className="dashboardRailRow" key={event.id}>
                            <div>
                              <strong>{titleCase(event.event_type)}</strong>
                              <span>
                                {event.currency} {event.amount} ·{" "}
                                {studentDateTimeLabel(event.event_at)}
                              </span>
                            </div>
                            <StatusPill tone={event.ledger_entry ? "live" : "demo"}>
                              {event.ledger_entry ? "Credited" : "Recorded"}
                            </StatusPill>
                          </div>
                        ))}
                        {subscription.billing_events.length === 0 ? (
                          <p className="emptyText">
                            Billing events will appear here after the subscription is confirmed and
                            credited.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">No active student subscriptions are visible yet.</p>
                )}
              </div>
            </section>
              ) : null}

              {showOrders ? (
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Subscription Orders</strong>
                </div>
                <p className="sectionDescription">
                  This section shows whether your chosen plan is still only requested, already processed,
                  or fully linked to wallet credit activity.
                </p>
                <div className="dashboardRailStack">
                {subscriptionOrders.length ? (
                  visibleSubscriptionOrders.map((order) => (
                    <div className="dashboardOfferCard" key={order.id}>
                      <div className="sectionHeading">
                        <strong>{order.subscription_plan_name || "Subscription Order"}</strong>
                        <StatusPill tone={orderTone(order.status)}>
                          {titleCase(order.status)}
                        </StatusPill>
                      </div>
                      <span>
                        {order.subscription_cycle_label || order.order_type} ·{" "}
                        {order.currency} {order.amount}
                      </span>
                      <small>Requested {studentDateTimeLabel(order.created_at)}</small>
                      <div className="dashboardRailStack">
                        {order.transactions.length ? (
                          order.transactions.slice(0, 2).map((transaction) => (
                            <div className="dashboardRailRow" key={transaction.id}>
                              <div>
                                <strong>{titleCaseOrFallback(transaction.status, "Recorded")}</strong>
                                <span>
                                  {transaction.provider_name || "Manual"} ·{" "}
                                  {transaction.processed_at
                                    ? studentDateTimeLabel(transaction.processed_at)
                                    : "Awaiting processing"}
                                </span>
                              </div>
                              <StatusPill tone={transaction.ledger_entry ? "live" : "demo"}>
                                {transaction.ledger_entry ? "Linked to credit" : "Pending credit"}
                              </StatusPill>
                            </div>
                          ))
                        ) : (
                          <p className="emptyText">
                            No payment transaction has been attached yet. This order is still in the
                            request stage.
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="emptyText">
                    Subscription order requests will appear here after you choose a plan cycle.
                  </p>
                )}
              </div>
            </section>
              ) : null}
            </div>

            {showPlans ? (
            <aside className="dashboardWorkspaceRail">
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Available Plans</strong>
                  <Link href="/app/wallet">Wallet</Link>
                </div>
                <p className="sectionDescription">
                  Review the available cycles and choose the plan that matches how often you expect
                  to unlock premium content.
                </p>
                <div className="studentInsightMessageStack">
                  <div className="studentInsightMessage">
                    <span className="placeholderDot" aria-hidden="true" />
                    <p>Choosing a plan here creates a real request, but activation and wallet credit still depend on the configured settlement flow.</p>
                  </div>
                </div>
                <div className="dashboardRailStack">
                  {visiblePlans.map((plan) => (
                    <div className="dashboardOfferCard" key={plan.id}>
                      <strong>{plan.name}</strong>
                      <span>{plan.description || "Plan details are configured from the backend."}</span>
                      <div className="dashboardRailStack">
                        {plan.cycles.map((cycle) => {
                          const firstCreditRule = cycle.star_credit_rules[0] ?? null;
                          const cycleLabel = `${titleCase(cycle.billing_interval)} x ${cycle.interval_count}`;
                          return (
                            <div className="dashboardRailRow" key={cycle.id}>
                              <div>
                                <strong>{cycleLabel}</strong>
                                <span>
                                  {cycle.currency} {cycle.price_amount}
                                  {" · "}
                                  {planValueSummary(
                                    firstCreditRule?.stars_credited ?? null,
                                    cycle.billing_interval,
                                    cycle.interval_count,
                                  )}
                                </span>
                              </div>
                          <form action={createSubscriptionOrderAction}>
                                <input
                                  name="subscription_plan_cycle_id"
                                  type="hidden"
                                  value={cycle.id}
                                />
                                <ActionSubmitButton
                                  className="button buttonPrimary"
                                  idleLabel="Request Plan"
                                  pendingLabel="Creating..."
                                />
                              </form>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {data.plans.length === 0 ? (
                    <p className="emptyText">
                      Subscription plans will appear here once your institute configures them.
                    </p>
                  ) : null}
                </div>
              </section>
            </aside>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
