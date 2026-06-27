type EconomySeedScreenProps = {
  audience: "platform" | "institute";
};

type SeedGroup = {
  name: string;
  scenarioCount: number;
  phase: string;
  executionMode: string;
  note: string;
};

type Scenario = {
  title: string;
  backendValue: string;
  liveStatus: string;
  seedStatus: string;
  adminControl: string;
};

const seedGroups: SeedGroup[] = [
  {
    name: "Reward rules",
    scenarioCount: 7,
    phase: "Phase 1 to Phase 3",
    executionMode: "Command-driven seed",
    note: "Covers signup, exam completion, score ladders, and future retention rules.",
  },
  {
    name: "Referral programs",
    scenarioCount: 1,
    phase: "Phase 1",
    executionMode: "Command-driven seed",
    note: "Dedicated referral flow already exists and should stay separate from generic reward rules.",
  },
  {
    name: "Star packs",
    scenarioCount: 3,
    phase: "Phase 1",
    executionMode: "Command-driven seed",
    note: "Student wallet purchase surfaces depend on active pack rows.",
  },
  {
    name: "Subscription plans and cycles",
    scenarioCount: 3,
    phase: "Phase 1 to Phase 2",
    executionMode: "Command-driven seed",
    note: "Needs plan, cycle, and star-credit alignment.",
  },
  {
    name: "Content access policies",
    scenarioCount: 4,
    phase: "Phase 1",
    executionMode: "Mixed: command seed plus exam mapping",
    note: "Defines how free, premium, and entitlement content is opened.",
  },
  {
    name: "Unlock rules",
    scenarioCount: 5,
    phase: "Phase 2",
    executionMode: "Command-driven seed",
    note: "Should follow after content policy shape is stable.",
  },
  {
    name: "Admin and manual actions",
    scenarioCount: 4,
    phase: "Always-on support lane",
    executionMode: "Live admin workflow",
    note: "These are operational controls, not usually static seed rows.",
  },
  {
    name: "Payment and subscription operations",
    scenarioCount: 4,
    phase: "Runtime operations",
    executionMode: "Live runtime flow",
    note: "The seed layer prepares what the runtime payment and renewal flows consume.",
  },
];

const rewardScenarios: Scenario[] = [
  {
    title: "Signup bonus",
    backendValue: "signup",
    liveStatus: "Processor live",
    seedStatus: "Seed now",
    adminControl: "Command-driven today",
  },
  {
    title: "Referral via generic reward rule",
    backendValue: "referral",
    liveStatus: "Avoid duplicate path",
    seedStatus: "Do not seed initially",
    adminControl: "Keep referral under dedicated program",
  },
  {
    title: "Exam completion reward",
    backendValue: "exam_completion",
    liveStatus: "Processor live",
    seedStatus: "Phase 2 seed",
    adminControl: "Command-driven today",
  },
  {
    title: "Score threshold ladder",
    backendValue: "score_threshold",
    liveStatus: "Processor live",
    seedStatus: "Phase 2 seed",
    adminControl: "Command-driven today",
  },
  {
    title: "Streak reward",
    backendValue: "streak",
    liveStatus: "Processor not implemented",
    seedStatus: "Phase 3 only",
    adminControl: "Wait for processor",
  },
  {
    title: "Topic mastery reward",
    backendValue: "topic_mastery",
    liveStatus: "Processor not implemented",
    seedStatus: "Phase 3 only",
    adminControl: "Wait for processor",
  },
  {
    title: "Admin campaign reward",
    backendValue: "admin_campaign",
    liveStatus: "Generic processor missing",
    seedStatus: "Phase 3 only",
    adminControl: "Wait for campaign tooling",
  },
];

const accessScenarios: Scenario[] = [
  {
    title: "Referral program",
    backendValue: "both / referrer / referee",
    liveStatus: "Flow live",
    seedStatus: "Seed now",
    adminControl: "Command-driven today",
  },
  {
    title: "Star packs",
    backendValue: "100 / 500 / 1000",
    liveStatus: "Wallet list live",
    seedStatus: "Seed now",
    adminControl: "Backend-led today",
  },
  {
    title: "Subscription plans",
    backendValue: "starter / scholar",
    liveStatus: "Plan list live",
    seedStatus: "Seed now",
    adminControl: "Backend-led today",
  },
  {
    title: "Content access policy",
    backendValue: "free / stars_only / entitlement_only / stars_or_entitlement",
    liveStatus: "Spend flow live",
    seedStatus: "Seed now",
    adminControl: "Align with real exam lanes",
  },
  {
    title: "Unlock rules",
    backendValue: "stars_balance / entitlement / exam_completion / score_threshold / admin_approval",
    liveStatus: "Most evaluators live",
    seedStatus: "Phase 2 seed",
    adminControl: "Backend-led today",
  },
  {
    title: "Composite unlocks",
    backendValue: "composite",
    liveStatus: "Placeholder only",
    seedStatus: "Do not seed now",
    adminControl: "Wait for evaluator",
  },
];

const manualActionScenarios: Scenario[] = [
  {
    title: "Admin star grant",
    backendValue: "admin_grant",
    liveStatus: "Live",
    seedStatus: "Operational action",
    adminControl: "Available now",
  },
  {
    title: "Unlock refresh",
    backendValue: "unlock recalculation",
    liveStatus: "Live",
    seedStatus: "Operational action",
    adminControl: "Available now",
  },
  {
    title: "Payment order confirmation",
    backendValue: "star pack / subscription",
    liveStatus: "Live",
    seedStatus: "Runtime action",
    adminControl: "Available now",
  },
  {
    title: "Refund / expiry policy",
    backendValue: "refund / expiry",
    liveStatus: "Partially modeled",
    seedStatus: "Future workflow",
    adminControl: "Needs policy processor",
  },
];

const commandBlueprints = [
  "python manage.py seed_master_economy <institute_code>",
  "python manage.py seed_default_geography",
  "python manage.py seed_option_catalog",
  "python manage.py seed_economy_defaults <institute_code>",
];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function audienceCopy(audience: EconomySeedScreenProps["audience"]) {
  if (audience === "institute") {
    return {
      eyebrow: "Seed Coverage",
      title: "Review every economy seed lane before premium rollout",
      description:
        "Institute admins can use this screen to understand which economy scenarios already have runtime support, which defaults should exist, and which governance lanes remain platform-controlled.",
      boundary:
        "Institute admins can review the full scenario model here, but economy imports are platform-level only for now. Pack, subscription, referral, reward-rule, and unlock catalog seeding should not be initiated from institute scope.",
    };
  }

  return {
    eyebrow: "Seed Governance",
    title: "Control the full economy seed model from one platform screen",
    description:
      "This planning screen covers all economy seed scenarios: reward ladders, referral, paid packs, subscriptions, content access, unlock rules, and admin support actions. Platform admin remains the only import owner for now.",
    boundary:
      "Platform admin owns economy imports for now, and the seed layer for packs, plans, referral programs, reward rules, and advanced policy templates should still be executed through backend commands until governance endpoints exist.",
  };
}

function ScenarioPanel({
  eyebrow,
  title,
  description,
  scenarios,
}: {
  eyebrow: string;
  title: string;
  description: string;
  scenarios: Scenario[];
}) {
  return (
    <article className="dashboardPanel weakTopicsPanel">
      <div className="studentPageTight">
        <span className="studentDashboardTag">{eyebrow}</span>
        <h3>{title}</h3>
        <p className="academicSectionDescription">{description}</p>
        <div className="weakTopicStack">
          {scenarios.map((scenario) => (
            <div className="weakTopicRow" key={`${eyebrow}-${scenario.title}`}>
              <div>
                <strong>{scenario.title}</strong>
                <span>
                  {titleCase(scenario.backendValue)} · {scenario.liveStatus}
                </span>
              </div>
              <div className="weakTopicMeta">
                <strong>{scenario.seedStatus}</strong>
                <span>{scenario.adminControl}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function EconomySeedScreen({ audience }: EconomySeedScreenProps) {
  const copy = audienceCopy(audience);
  const liveScenarios =
    rewardScenarios.filter((scenario) => scenario.liveStatus.includes("live")).length +
    accessScenarios.filter((scenario) => scenario.liveStatus.includes("live")).length +
    manualActionScenarios.filter((scenario) => scenario.liveStatus.includes("Live")).length;

  return (
    <>
      <section className="studentInsightHeroCard studentInsightHeroCardCompact">
        <div className="studentInsightHeroCopy">
          <span className="studentDashboardTag">{copy.eyebrow}</span>
          <strong>{copy.title}</strong>
          <p>{copy.description}</p>
          <small>{copy.boundary}</small>
        </div>
      </section>

      <section className="resultsSummaryGrid">
        <article className="metricCard dashboardHeroCard metricCardPrimary">
          <span>Seed groups</span>
          <strong>{seedGroups.length}</strong>
          <small>Distinct economy configuration lanes.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Scenario coverage</span>
          <strong>
            {rewardScenarios.length + accessScenarios.length + manualActionScenarios.length}
          </strong>
          <small>Concrete scenarios tracked on this screen.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Live runtime lanes</span>
          <strong>{liveScenarios}</strong>
          <small>Scenarios already backed by active processing flows.</small>
        </article>
        <article className="metricCard dashboardHeroCard">
          <span>Mandatory Phase 1 seeds</span>
          <strong>5</strong>
          <small>Referral, packs, plans, and minimum access policy baseline.</small>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Seed groups</span>
            <h3>Economy scenarios grouped by rollout lane</h3>
            <div className="weakTopicStack">
              {seedGroups.map((group) => (
                <div className="weakTopicRow" key={group.name}>
                  <div>
                    <strong>{group.name}</strong>
                    <span>
                      {group.phase} · {group.executionMode}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>{group.scenarioCount}</strong>
                    <span>{group.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Phase interpretation</span>
            <h3>How to stage the seed rollout</h3>
            <div className="weakTopicStack">
              <div className="weakTopicRow">
                <div>
                  <strong>Phase 1</strong>
                  <span>Signup bonus, referral program, star packs, starter subscriptions, and minimum free vs premium access setup.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Launch base</strong>
                  <span>Student wallet readiness</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Phase 2</strong>
                  <span>Exam completion rewards, score ladders, and first unlock-rule progression lanes.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Academic value</strong>
                  <span>Performance-driven rewards</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Phase 3</strong>
                  <span>Streaks, topic mastery, admin campaigns, and richer subscription entitlement bundles.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Retention layer</strong>
                  <span>Only after analytics maturity</span>
                </div>
              </div>
              <div className="weakTopicRow">
                <div>
                  <strong>Runtime support</strong>
                  <span>Admin grants, order confirmation, unlock refresh, and wallet inspection stay operational rather than seed-driven, even while catalog governance remains centralized.</span>
                </div>
                <div className="weakTopicMeta">
                  <strong>Always on</strong>
                  <span>Support lane</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardLowerGrid">
        <ScenarioPanel
          eyebrow="Reward rules"
          title="Reward scenarios and seed timing"
          description="This lane covers every current and planned reward-rule type so we do not hardcode stars in service logic."
          scenarios={rewardScenarios}
        />
        <ScenarioPanel
          eyebrow="Access and subscription"
          title="Referral, paid access, and unlock scenarios"
          description="These scenarios determine how stars, entitlements, plans, and premium content interact during student runtime flows."
          scenarios={accessScenarios}
        />
      </section>

      <section className="dashboardLowerGrid">
        <ScenarioPanel
          eyebrow="Admin operations"
          title="Manual and support-side economy actions"
          description="These are not usually static seed rows, but they matter because admins need a safe operating lane when wallet state and unlock state require intervention."
          scenarios={manualActionScenarios}
        />

        <article className="dashboardPanel weakTopicsPanel">
          <div className="studentPageTight">
            <span className="studentDashboardTag">Command path</span>
            <h3>Recommended seed command flow</h3>
            <p className="academicSectionDescription">
              The economy configuration layer should remain platform-controlled and command-driven until dedicated
              governance endpoints exist for packs, plans, policy templates, and unlock catalogs.
            </p>
            <div className="featurePlaceholder">
              <p>
                The preferred platform bootstrap command is
                {" "}
                <strong>`seed_master_economy`</strong>.
                {" "}
                Platform admin should run it to refresh prerequisite option catalog data and then seed reward rules,
                referral program, star packs, subscription plans, plan cycles, star-credit rules, content access
                policies, and unlock-rule templates.
              </p>
            </div>
            <div className="weakTopicStack">
              {commandBlueprints.map((command) => (
                <div className="weakTopicRow" key={command}>
                  <div>
                    <strong>{command}</strong>
                    <span>
                      {command.includes("seed_economy_defaults")
                        ? "Recommended next command to implement"
                        : "Already available today"}
                    </span>
                  </div>
                  <div className="weakTopicMeta">
                    <strong>Ready</strong>
                    <span>{command.includes("seed_master_economy") || command.includes("seed_economy_defaults") ? "Platform run" : "Run now"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
