import Link from "next/link";
import { notFound } from "next/navigation";
import {
  marketingPages,
  primaryNavigation,
  publicPortalAccessLanes,
  type MarketingPageSlug,
} from "@/lib/site-content";

const detailPageContent: Record<
  MarketingPageSlug,
  {
    accent: string;
    stats: { label: string; value: string; note: string }[];
    pillars: { title: string; body: string }[];
    outcomes: string[];
  }
> = {
  exams: {
    accent: "violet",
    stats: [
      { label: "Practice tracks", value: "12+", note: "School, board, Olympiad, and competitive readiness lanes." },
      { label: "Review loops", value: "3-step", note: "Attempt, summary, and weak-area recovery in one system." },
      { label: "Learning rhythm", value: "Weekly", note: "Consistent routines for chapter practice and mock readiness." },
    ],
    pillars: [
      {
        title: "Exam-first navigation",
        body: "Learners start from the exam they care about and move naturally into chapters, topics, timed mocks, and follow-up review.",
      },
      {
        title: "Visible readiness signals",
        body: "Scores, attempt quality, weak-topic indicators, and streaks stay close to the learner so progress feels concrete.",
      },
      {
        title: "Reusable preparation loops",
        body: "A repeatable cycle of practice, testing, summary, and focused revision helps students improve before the next attempt.",
      },
    ],
    outcomes: ["Topic confidence grows earlier", "Mocks feel less intimidating", "Weak areas get surfaced faster"],
  },
  schools: {
    accent: "blue",
    stats: [
      { label: "Managed rollout", value: "Scoped", note: "Assignments, sections, and result access stay under institute control." },
      { label: "Operational fit", value: "Unified", note: "Students, teachers, and admins share one connected workflow." },
      { label: "Visibility", value: "Real-time", note: "Readiness and completion metrics can be reviewed without spreadsheet drift." },
    ],
    pillars: [
      {
        title: "Institution-ready structure",
        body: "Academic setup, teacher rosters, exam policies, and results operations stay aligned inside one shared product system.",
      },
      {
        title: "Cleaner implementation",
        body: "Schools can roll out exam practice without stitching together multiple disconnected tools for content, attempts, and reporting.",
      },
      {
        title: "Role-specific control",
        body: "Teachers manage content, students focus on attempts, and institute operators govern access, visibility, and review timing.",
      },
    ],
    outcomes: ["Less admin friction", "Clearer ownership per role", "Stronger institute-wide consistency"],
  },
  professionals: {
    accent: "mint",
    stats: [
      { label: "Attempt continuity", value: "Resume-ready", note: "In-progress work can be revisited without losing context." },
      { label: "Improvement view", value: "Comparative", note: "Each attempt contributes to a clearer sense of progress over time." },
      { label: "Focus mode", value: "High", note: "The interface stays simple enough to support disciplined practice sessions." },
    ],
    pillars: [
      {
        title: "Serious practice flow",
        body: "Professionals get a distraction-light experience with structured mocks, review checkpoints, and realistic pacing.",
      },
      {
        title: "Performance memory",
        body: "Attempt summaries and weak-topic history provide a practical memory of what improved and what needs another pass.",
      },
      {
        title: "Repeat-until-ready design",
        body: "The journey is built for learners who come back often and want the system to reward steady, measurable refinement.",
      },
    ],
    outcomes: ["Higher repeat-practice confidence", "Better certification prep rhythm", "Faster recall of weak spots"],
  },
  pricing: {
    accent: "amber",
    stats: [
      { label: "Onboarding model", value: "Guided", note: "Access is shaped around institutes, programs, and supported cohorts." },
      { label: "Workspace fit", value: "Role-based", note: "Each user lands in the experience matched to their responsibilities." },
      { label: "Configuration depth", value: "Flexible", note: "Product scope can be aligned to academic, exam, and reporting needs." },
    ],
    pillars: [
      {
        title: "Program-led packaging",
        body: "Pricing aligns more naturally when the conversation starts from institute scope, learner volume, and operating complexity.",
      },
      {
        title: "No shallow self-checkout",
        body: "The platform is better positioned through guided access because setup, roles, and rollout quality matter to long-term success.",
      },
      {
        title: "Shared system economics",
        body: "Students, teachers, and operators benefit from one connected product language instead of fragmented subscriptions.",
      },
    ],
    outcomes: ["Cleaner onboarding conversations", "Better scope control", "Less mismatch between product and plan"],
  },
  resources: {
    accent: "rose",
    stats: [
      { label: "Content formats", value: "Multi-layer", note: "Guides, walkthroughs, FAQs, and readiness references can sit beside product use." },
      { label: "Support reach", value: "Always-on", note: "Learners and institutes can self-serve more confidently with the right context." },
      { label: "Product education", value: "Embedded", note: "Resources become part of activation instead of a disconnected help center." },
    ],
    pillars: [
      {
        title: "Learning support layer",
        body: "Exam strategy, onboarding help, and product education can become a calm support system around active learner workflows.",
      },
      {
        title: "Less dependence on live support",
        body: "Well-structured resources reduce repetitive questions and make new users feel guided from the first session.",
      },
      {
        title: "More confident adoption",
        body: "When help content mirrors the product language, new roles adapt faster and trust the workflow more quickly.",
      },
    ],
    outcomes: ["Faster user activation", "Lower support burden", "Stronger product clarity"],
  },
};

export default async function MarketingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = marketingPages[slug as MarketingPageSlug];

  if (!page) {
    notFound();
  }

  const pageSlug = slug as MarketingPageSlug;
  const detailContent = detailPageContent[pageSlug];
  const recommendedLanes =
    pageSlug === "schools"
      ? publicPortalAccessLanes.filter((lane) => lane.role === "teacher" || lane.role === "student")
      : pageSlug === "professionals"
        ? publicPortalAccessLanes.filter((lane) => lane.role === "student" || lane.role === "teacher")
        : publicPortalAccessLanes;

  return (
    <main className="marketingHome marketingDetailPage">
      <header className="container marketingTopbar">
        <Link className="brand" href="/">
          <span className="brandMark">N</span>
          <span className="brandText">
            <strong>Nexora</strong>
            <small>Learn. Practice. Succeed.</small>
          </span>
        </Link>

        <nav className="marketingNavLinks" aria-label="Primary">
          {primaryNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <a href="#detail-highlights">Highlights</a>
        </nav>

        <div className="navActions">
          <Link className="button buttonGhost" href="/login">
            Login
          </Link>
          <Link className="button buttonPrimary" href="/signup">
            Request Access
          </Link>
        </div>
      </header>

      <section className={`container marketingDetailHero marketingDetailHero${detailContent.accent}`}>
        <div className="marketingDetailCopy">
          <span className="eyebrow">{page.eyebrow}</span>
          <div className="marketingDetailBreadcrumb">
            <span>Nexora landing pages</span>
            <span> / </span>
            <strong>{page.eyebrow}</strong>
          </div>
          <h1>{page.title}</h1>
          <p>{page.description}</p>

          <div className="marketingBenefitRow">
            {detailContent.outcomes.map((outcome) => (
              <span className="marketingBenefitChip" key={outcome}>
                {outcome}
              </span>
            ))}
          </div>

          <div className="heroActions">
            <Link className="button buttonPrimary" href="/signup">
              Request Access
            </Link>
            <Link className="button buttonSecondary" href="/">
              Back to Home
            </Link>
          </div>
        </div>

        <aside className="marketingDetailPanel">
          <div className="marketingDetailPanelHeader">
            <span className="statusPill">Overview</span>
            <strong>Why this lane matters</strong>
            <p>Each page now has its own compact story, polished cards, and a clearer route into the product.</p>
          </div>

          <div className="marketingDetailStatGrid">
            {detailContent.stats.map((item) => (
              <article className="marketingDetailStatCard" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="container marketingDetailSection" id="detail-highlights">
        <div className="sectionIntro marketingDetailSectionIntro">
          <span className="eyebrow">Highlights</span>
          <h2>What this experience should communicate at a glance.</h2>
          <p>
            The goal here is to make each landing page feel intentional, softer, and more product-led instead of looking like a placeholder information block.
          </p>
        </div>

        <div className="marketingDetailCardGrid">
          {detailContent.pillars.map((pillar, index) => (
            <article className="marketingDetailFeatureCard" data-accent={index} key={pillar.title}>
              <span className="marketingDetailFeatureIndex">0{index + 1}</span>
              <strong>{pillar.title}</strong>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container marketingDetailSection">
        <div className="sectionIntro marketingDetailSectionIntro">
          <span className="eyebrow">In practice</span>
          <h2>Key moments we should surface on this page.</h2>
        </div>

        <div className="marketingInfoGrid marketingDetailNarrativeGrid">
          {page.bullets.map((bullet, index) => (
            <article className="categoryCard marketingNarrativeCard" data-accent={index} key={bullet}>
              <span className="categoryIcon">{index + 1}</span>
              <strong>{bullet}</strong>
              <p>
                This page can now support stronger messaging, richer product framing, and clearer conversion points without changing the information architecture.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="container marketingDetailSection">
        <div className="sectionIntro marketingDetailSectionIntro">
          <span className="eyebrow">Best for</span>
          <h2>Recommended access lanes connected to this story.</h2>
          <p>
            We can keep the public landing system coherent by showing users which product lane is the best next step from each landing page.
          </p>
        </div>

        <div className="marketingDetailLaneGrid">
          {recommendedLanes.map((lane) => (
            <article className="marketingDetailLaneCard" key={lane.role}>
              <span className="statusPill">{lane.badge}</span>
              <strong>{lane.title}</strong>
              <p>{lane.description}</p>
              <div className="marketingTrustPoints">
                {lane.highlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
              <div className="marketingDetailLaneActions">
                <Link className="button buttonSecondary" href={lane.loginHref}>
                  Login
                </Link>
                <Link className="button buttonPrimary" href={lane.signupHref}>
                  Sign up
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container marketingFinalCta marketingDetailFinalCta">
        <div className="marketingFinalCtaCopy">
          <span className="eyebrow">Ready to continue</span>
          <h2>Let&apos;s bring the same clarity from the landing page into onboarding.</h2>
          <p>
            These detail pages now sit much closer to the visual quality of the main homepage and give us a stronger base for polishing login and signup later.
          </p>
          <div className="marketingTrustPoints">
            <span>Smaller hero footprint</span>
            <span>Stronger card hierarchy</span>
            <span>Cleaner CTA flow</span>
          </div>
        </div>

        <div className="marketingFinalCtaAction">
          <Link className="button buttonPrimary marketingFinalCtaButton" href="/signup">
            Request Access
          </Link>
          <span>Explore the right workspace with one guided flow.</span>
        </div>
      </section>
    </main>
  );
}
