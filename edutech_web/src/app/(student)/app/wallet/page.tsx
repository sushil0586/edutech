import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { StatusPill } from "@/components/ui/status-pill";
import { StudentPageHeader } from "@/components/ui/student-page-header";
import { StudentKpiGrid } from "@/components/ui/student-kpi-grid";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { fetchCurrentAccountProfile } from "@/lib/auth/session";
import {
  createStudentStarPackOrder,
  fetchStudentPaymentOrders,
  fetchStudentRewardEvents,
  fetchStudentStarPacks,
  fetchStudentSubscriptionPlans,
  fetchStudentSubscriptions,
  fetchStudentUnlockStates,
  fetchStudentWalletLedger,
  fetchStudentWalletSummary,
  getStudentApiState,
} from "@/lib/api/student";
import {
  studentDateTimeLabel,
  titleCaseState,
} from "@/lib/student/formatters";

async function loadWalletWorkspace() {
  const state = getStudentApiState();

  if (!state.apiConfigured) {
    return {
      source: "unconfigured" as const,
      wallet: null,
      ledger: [],
      rewards: [],
      unlocks: [],
      starPacks: [],
      subscriptionPlans: [],
      orders: [],
      subscriptions: [],
    };
  }

  try {
    const [wallet, ledger, rewards, unlocks, starPacks, subscriptionPlans, orders, subscriptions] =
      await Promise.all([
        fetchStudentWalletSummary(),
        fetchStudentWalletLedger(),
        fetchStudentRewardEvents(),
        fetchStudentUnlockStates(),
        fetchStudentStarPacks(),
        fetchStudentSubscriptionPlans(),
        fetchStudentPaymentOrders(),
        fetchStudentSubscriptions(),
      ]);

    return {
      source: "live" as const,
      wallet,
      ledger,
      rewards,
      unlocks,
      starPacks,
      subscriptionPlans,
      orders,
      subscriptions,
    };
  } catch {
    return {
      source: "error" as const,
      wallet: null,
      ledger: [],
      rewards: [],
      unlocks: [],
      starPacks: [],
      subscriptionPlans: [],
      orders: [],
      subscriptions: [],
    };
  }
}

function currencyLabel(amount: string, currency: string) {
  return `${currency} ${amount}`;
}

function humanizeValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function ledgerSourceLabel(sourceType: string) {
  switch (sourceType) {
    case "signup_bonus":
      return "Signup bonus";
    case "referral_bonus":
      return "Referral reward";
    case "exam_reward":
      return "Exam reward";
    case "purchase":
      return "Star pack credit";
    case "subscription":
      return "Subscription credit";
    case "content_spend":
      return "Content unlock";
    case "admin_grant":
      return "Support grant";
    default:
      return humanizeValue(sourceType);
  }
}

function rewardRuleLabel(ruleType: string) {
  switch (ruleType) {
    case "signup":
      return "New account reward";
    case "exam_completion":
      return "Completion reward";
    case "score_threshold":
      return "Score reward";
    case "referral":
      return "Referral reward";
    default:
      return humanizeValue(ruleType);
  }
}

function transactionStateLabel(order: {
  status: string;
  transactions: Array<{
    status: string;
    processed_at: string | null;
    ledger_entry: string | null;
  }>;
}) {
  const latestTransaction = order.transactions[0] ?? null;
  if (!latestTransaction) {
    return order.status === "pending" ? "Request created" : titleCaseState(order.status);
  }
  if (latestTransaction.ledger_entry) {
    return "Credited";
  }
  if (latestTransaction.processed_at) {
    return "Processed";
  }
  return titleCaseState(latestTransaction.status);
}

function orderTone(status: string) {
  switch (status) {
    case "completed":
      return "live" as const;
    case "failed":
    case "cancelled":
    case "refunded":
      return "danger" as const;
    case "processing":
      return "demo" as const;
    default:
      return "warning" as const;
  }
}

function unlockTone(status: string) {
  switch (status) {
    case "unlocked":
      return "live" as const;
    case "locked":
      return "warning" as const;
    case "hidden":
      return "demo" as const;
    default:
      return "default" as const;
  }
}

async function createStarPackOrderAction(formData: FormData) {
  "use server";

  const starPackId = String(formData.get("star_pack_id") ?? "");
  if (!starPackId) {
    redirect("/app/wallet?error=Unable%20to%20resolve%20the%20selected%20star%20pack.");
  }

  try {
    const response = await createStudentStarPackOrder({
      star_pack: starPackId,
      metadata: {
        source: "student_wallet",
      },
    });
    redirect(
      `/app/wallet?message=${encodeURIComponent(
        `${response.data.star_pack_name || "Star pack"} order created. It will stay pending until confirmed by your institute or platform operator.`,
      )}`,
    );
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error && error.message
        ? encodeURIComponent(error.message)
        : "Unable to create this star pack order right now.";
    redirect(`/app/wallet?error=${message}`);
  }
}

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const [data, profile] = await Promise.all([
    loadWalletWorkspace(),
    fetchCurrentAccountProfile(),
  ]);
  const referralCode = profile?.student_context?.referral_code ?? null;
  const pendingOrders = data.orders.filter((order) =>
    ["pending", "processing"].includes(order.status),
  );

  return (
    <div className="studentPage studentDashboardModern studentWalletPage studentLearnerPage studentLearnerAccountPage studentLearnerWalletPage">
      <StudentPageHeader
        title="Wallet"
        description="Track your stars, understand how they move, and choose the best way to unlock premium content."
        statusLabel={
          data.source === "live"
            ? `${data.wallet?.available_stars ?? 0} stars available`
            : data.source === "unconfigured"
              ? "Backend not configured"
              : "Unable to load wallet"
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

      {data.source !== "live" || !data.wallet ? (
        <StudentStatePanel
          eyebrow={data.source === "unconfigured" ? "Setup required" : "Load issue"}
          title={
            data.source === "unconfigured"
              ? "Waiting for live wallet data"
              : "Wallet data could not be loaded"
          }
          description={
            data.source === "unconfigured"
              ? "The wallet screen only uses the economy APIs. Configure the backend and sign in with a valid student account to load real star balances, packs, subscriptions, and unlock history."
              : "The wallet screen is connected to live backend economy endpoints, but the current request did not complete successfully."
          }
          bullets={[
            "Wallet summary",
            "Ledger history",
            "Star packs and subscriptions",
          ]}
          ctaHref="/app/dashboard"
          ctaLabel="Back to Dashboard"
          statusLabel={
            data.source === "unconfigured"
              ? "Configuration required"
              : "Retry after backend check"
          }
        />
      ) : (
        <>
          <StudentKpiGrid
            items={[
              {
                label: "Available Stars",
                value: data.wallet.available_stars.toLocaleString("en-IN"),
                note: "Current spendable balance",
                tone: "primary",
              },
              {
                label: "Lifetime Earned",
                value: data.wallet.lifetime_earned_stars.toLocaleString("en-IN"),
                note: "All credits recorded in the ledger",
              },
              {
                label: "Lifetime Spent",
                value: data.wallet.lifetime_spent_stars.toLocaleString("en-IN"),
                note: "Stars already consumed for access",
              },
              {
                label: "Pending Orders",
                value: pendingOrders.length,
                note: "Requests still waiting for confirmation",
              },
            ]}
          />

          <section className="dashboardWorkspaceGrid">
            <div className="dashboardWorkspaceMain">
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>How your stars work</strong>
                </div>
                <p className="sectionDescription">
                  Stars can be earned through rewards, added through star packs, or credited
                  through subscription plans. You can then use them to unlock premium practice,
                  tests, and guided follow-up content.
                </p>
                <div className="detailGrid">
                  <article className="detailCard">
                    <span>Earn stars</span>
                    <strong>Rewards</strong>
                    <small>Signup, referrals, and performance-based rewards land here.</small>
                  </article>
                  <article className="detailCard">
                    <span>Add stars</span>
                    <strong>Buy or subscribe</strong>
                    <small>Choose one-time packs or recurring subscription value.</small>
                  </article>
                  <article className="detailCard">
                    <span>Use stars</span>
                    <strong>Unlock premium content</strong>
                    <small>Only backend-configured premium items can consume stars.</small>
                  </article>
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Balance Summary</strong>
                </div>
                <div className="detailGrid">
                  <article className="detailCard">
                    <span>Paid Stars</span>
                    <strong>{data.wallet.paid_credited_stars.toLocaleString("en-IN")}</strong>
                  </article>
                  <article className="detailCard">
                    <span>Subscription Stars</span>
                    <strong>{data.wallet.subscription_credited_stars.toLocaleString("en-IN")}</strong>
                  </article>
                  <article className="detailCard">
                    <span>Admin Grants</span>
                    <strong>{data.wallet.admin_granted_stars.toLocaleString("en-IN")}</strong>
                  </article>
                  <article className="detailCard">
                    <span>Reserved Stars</span>
                    <strong>{data.wallet.reserved_stars.toLocaleString("en-IN")}</strong>
                  </article>
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Rewards and Referral</strong>
                  {referralCode ? <StatusPill tone="live">Referral ready</StatusPill> : null}
                </div>
                <p className="sectionDescription">
                  This section shows how your stars were earned. If referral rewards are enabled
                  for your institute, your referral code can help you earn more as new students join.
                </p>
                <div className="detailGrid">
                  <article className="detailCard">
                    <span>Your Referral Code</span>
                    <strong>{referralCode ?? "Not active yet"}</strong>
                  </article>
                  <article className="detailCard">
                    <span>Reward Events</span>
                    <strong>{data.rewards.length}</strong>
                  </article>
                  <article className="detailCard">
                    <span>Latest Reward</span>
                    <strong>
                      {data.rewards[0]
                        ? `${data.rewards[0].awarded_stars > 0 ? "+" : ""}${data.rewards[0].awarded_stars} stars`
                        : "No rewards yet"}
                    </strong>
                  </article>
                </div>
                <div className="dashboardRailStack">
                  {data.rewards.slice(0, 5).map((reward) => (
                    <div className="dashboardRailRow dashboardLedgerRow" key={reward.id}>
                      <div>
                        <strong>{reward.reward_rule_name}</strong>
                        <span>
                          {rewardRuleLabel(reward.reward_rule_type)} · {studentDateTimeLabel(reward.processed_at)}
                        </span>
                      </div>
                      <span className="dashboardLedgerDelta dashboardLedgerDeltaPositive">
                        +{reward.awarded_stars}
                      </span>
                    </div>
                  ))}
                  {data.rewards.length === 0 ? (
                    <p className="emptyText">
                      Reward events will appear here when signup, referral, or exam rules credit
                      your wallet.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Recent Ledger Activity</strong>
                </div>
                <p className="sectionDescription">
                  Every balance change appears here, so you can always see whether stars were earned,
                  spent, purchased, or credited through a plan.
                </p>
                <div className="dashboardRailStack">
                  {data.ledger.slice(0, 6).map((entry) => (
                    <div className="dashboardRailRow dashboardLedgerRow" key={entry.id}>
                      <div>
                        <strong>{entry.reason}</strong>
                        <span>
                          {ledgerSourceLabel(entry.source_type)} · Balance {entry.balance_after.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span
                        className={`dashboardLedgerDelta ${entry.stars_delta > 0 ? "dashboardLedgerDeltaPositive" : "dashboardLedgerDeltaNegative"}`}
                      >
                        {entry.stars_delta > 0 ? "+" : ""}
                        {entry.stars_delta}
                      </span>
                    </div>
                  ))}
                  {data.ledger.length === 0 ? (
                    <p className="emptyText">Ledger history will appear here as soon as star activity is recorded.</p>
                  ) : null}
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Content Access History</strong>
                </div>
                <p className="sectionDescription">
                  As you unlock or attempt premium content, the current access outcome is reflected here.
                </p>
                <div className="dashboardRailStack">
                  {data.unlocks.slice(0, 5).map((unlock) => (
                    <div className="dashboardRailRow" key={unlock.id}>
                      <div>
                        <strong>{unlock.content_label || unlock.content_key}</strong>
                        <span>
                          {titleCaseState(unlock.content_type)} ·{" "}
                          {unlock.lock_reason_message ||
                            `${titleCaseState(unlock.status)} by backend policy`}
                        </span>
                      </div>
                      <StatusPill tone={unlockTone(unlock.status)}>
                        {titleCaseState(unlock.status)}
                      </StatusPill>
                    </div>
                  ))}
                  {data.unlocks.length === 0 ? (
                    <p className="emptyText">
                      Unlock decisions will appear here as you browse and unlock content from the
                      student catalog.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <aside className="dashboardWorkspaceRail">
              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>What should you do next?</strong>
                </div>
                <div className="dashboardRailStack">
                  <div className="dashboardOfferCard">
                    <strong>
                      {data.wallet.available_stars > 0 ? "You can unlock premium content now" : "You need more stars first"}
                    </strong>
                    <span>
                      {data.wallet.available_stars > 0
                        ? `${data.wallet.available_stars.toLocaleString("en-IN")} stars are available in your wallet right now.`
                        : "Your current balance is zero, so premium content will stay locked until you earn or add stars."}
                    </span>
                    <small>
                      Use the wallet for one-time packs or open subscriptions for recurring value.
                    </small>
                    <div className="buttonRow">
                      <Link className="button buttonSecondary" href="/app/exams">
                        Browse Premium Exams
                      </Link>
                      <Link className="button buttonPrimary" href="/app/subscriptions">
                        View Plans
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Star Packs</strong>
                  <Link href="/app/subscriptions">Subscriptions</Link>
                </div>
                <p className="sectionDescription">
                  These are one-time top-up options. Right now, choosing a pack creates a tracked
                  request that is later confirmed by the institute or platform operator.
                </p>
                <div className="dashboardRailStack">
                  {data.starPacks.map((pack) => (
                    <div className="dashboardOfferCard" key={pack.id}>
                      <strong>{pack.name}</strong>
                      <span>{pack.stars_credited.toLocaleString("en-IN")} stars</span>
                      <small>{currencyLabel(pack.price_amount, pack.currency)}</small>
                      <form action={createStarPackOrderAction}>
                        <input name="star_pack_id" type="hidden" value={pack.id} />
                        <ActionSubmitButton
                          className="button buttonPrimary"
                          idleLabel="Create Order"
                          pendingLabel="Creating..."
                        />
                      </form>
                    </div>
                  ))}
                  {data.starPacks.length === 0 ? (
                    <p className="emptyText">
                      Star packs will appear here once your institute configures them.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Subscription Plans</strong>
                </div>
                <p className="sectionDescription">
                  Choose a subscription when you want recurring value instead of buying stars every time.
                </p>
                <div className="dashboardRailStack">
                  {data.subscriptionPlans.map((plan) => (
                    <div className="dashboardOfferCard" key={plan.id}>
                      <strong>{plan.name}</strong>
                      <span>
                        {plan.cycles[0]
                          ? currencyLabel(plan.cycles[0].price_amount, plan.cycles[0].currency)
                          : "Plan available"}
                      </span>
                      <small>
                        {plan.cycles[0]?.star_credit_rules[0]
                          ? `${plan.cycles[0].star_credit_rules[0].stars_credited.toLocaleString("en-IN")} stars on the first configured credit rule`
                          : "Plan values are configured from the backend"}
                      </small>
                      <Link className="button buttonSecondary" href="/app/subscriptions">
                        Compare Plans
                      </Link>
                    </div>
                  ))}
                  {data.subscriptionPlans.length === 0 ? (
                    <p className="emptyText">
                      Subscription plans will appear here once your institute configures them.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Recent Requests</strong>
                </div>
                <p className="sectionDescription">
                  This is the quick view of the most recent star-pack and subscription requests.
                </p>
                <div className="dashboardRailStack">
                  {data.orders.slice(0, 4).map((order) => (
                    <div className="dashboardRailRow" key={order.id}>
                      <div>
                        <strong>
                          {order.star_pack_name ||
                            order.subscription_plan_name ||
                            titleCaseState(order.order_type)}
                        </strong>
                        <span>
                          {currencyLabel(order.amount, order.currency)} ·{" "}
                          {studentDateTimeLabel(order.created_at)}
                        </span>
                      </div>
                      <StatusPill tone={orderTone(order.status)}>
                        {transactionStateLabel(order)}
                      </StatusPill>
                    </div>
                  ))}
                  {data.orders.length === 0 ? (
                    <p className="emptyText">
                      Purchase requests will appear here once you create a pack or subscription
                      order.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="contentCard">
                <div className="sectionHeading">
                  <strong>Order Lifecycle Detail</strong>
                </div>
                <p className="sectionDescription">
                  Use this section when you want to understand whether a request is only created,
                  already processed, or fully credited into your wallet.
                </p>
                <div className="dashboardRailStack">
                  {data.orders.slice(0, 5).map((order) => {
                    const latestTransaction = order.transactions[0] ?? null;
                    return (
                      <div className="dashboardOfferCard" key={`lifecycle-${order.id}`}>
                        <div className="sectionHeading">
                          <strong>
                            {order.star_pack_name ||
                              order.subscription_plan_name ||
                              titleCaseState(order.order_type)}
                          </strong>
                          <StatusPill tone={orderTone(order.status)}>
                            {transactionStateLabel(order)}
                          </StatusPill>
                        </div>
                        <span>
                          {currencyLabel(order.amount, order.currency)} ·{" "}
                          {titleCaseState(order.order_type)}
                        </span>
                        <small>
                          Requested {studentDateTimeLabel(order.created_at)}
                          {latestTransaction?.processed_at
                            ? ` · Processed ${studentDateTimeLabel(latestTransaction.processed_at)}`
                            : ""}
                        </small>
                        <div className="detailGrid">
                          <article className="detailCard">
                            <span>Order status</span>
                            <strong>{titleCaseState(order.status)}</strong>
                          </article>
                          <article className="detailCard">
                            <span>Latest transaction</span>
                            <strong>
                              {latestTransaction
                                ? titleCaseState(latestTransaction.status)
                                : "Waiting"}
                            </strong>
                          </article>
                          <article className="detailCard">
                            <span>Wallet credit</span>
                            <strong>
                              {latestTransaction?.ledger_entry ? "Recorded" : "Pending"}
                            </strong>
                          </article>
                        </div>
                      </div>
                    );
                  })}
                  {data.orders.length === 0 ? (
                    <p className="emptyText">
                      Detailed order progress will appear here after you create a star pack or
                      subscription order.
                    </p>
                  ) : null}
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
