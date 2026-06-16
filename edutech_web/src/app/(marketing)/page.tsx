import Link from "next/link";
import {
  homePageContent,
  primaryNavigation,
  publicPortalAccessLanes,
} from "@/lib/site-content";

function renderAvatarSeed(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  const {
    hero,
    heroPanel,
    statsBand,
    features,
    showcase,
    testimonials,
    finalCta,
    roleCards,
  } = homePageContent;

  return (
    <main className="marketingHome">
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
          <a href="#features">Features</a>
        </nav>

        <div className="navActions">
          <Link className="button buttonGhost" href="/login">
            Login
          </Link>
          <Link className="button buttonPrimary" href={hero.primaryCta.href}>
            {hero.primaryCta.label}
          </Link>
        </div>
      </header>

      <section className="container marketingHero">
        <div className="marketingHeroCopy">
          <span className="eyebrow">{hero.eyebrow}</span>
          <h1>
            {hero.titleLeading}
            <span>{hero.titleAccent}</span>
          </h1>
          <p>{hero.description}</p>

          <div className="marketingBenefitRow">
            {hero.benefits.map((benefit) => (
              <span className="marketingBenefitChip" key={benefit}>
                {benefit}
              </span>
            ))}
          </div>

          <div className="heroActions">
            <Link className="button buttonPrimary" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </Link>
            <Link className="button buttonSecondary" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
            </Link>
          </div>

          <div className="marketingTrustPoints">
            {hero.trustPoints.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>

        <div className="marketingHeroVisual">
          <div className="marketingAppMock">
            <div className="marketingAppSidebar">
              <div className="marketingAppSidebarBrand">
                <span className="brandMark brandMarkMini">N</span>
              </div>
              <div className="marketingAppNav">
                {heroPanel.navigation.map((item, index) => (
                  <span
                    className={`marketingAppNavItem ${index === 0 ? "marketingAppNavItemActive" : ""}`}
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="marketingAppMain">
              <div className="marketingAppTopbar">
                <div>
                  <strong>{heroPanel.greeting}</strong>
                  <p>{heroPanel.subtext}</p>
                </div>
                <div className="marketingAppUser">
                  <span className="statusPill">{heroPanel.status}</span>
                  <span className="marketingAvatar">AS</span>
                </div>
              </div>

              <div className="marketingAppStats">
                {heroPanel.stats.map((stat) => (
                  <article className="marketingAppStatCard" key={stat.label}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <small>{stat.note}</small>
                  </article>
                ))}
              </div>

              <div className="marketingAppContent">
                <section className="marketingPlanCard">
                  <div className="marketingSectionHeading">
                    <strong>Today&apos;s plan</strong>
                    <span>Stay on schedule</span>
                  </div>
                  <div className="marketingTaskList">
                    {heroPanel.todayPlan.map((item) => (
                      <article className="marketingTaskRow" key={item.title}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>
                        <span className={`marketingTaskStatus marketingTaskStatus${item.status}`}>
                          {item.status === "done" ? "Done" : item.status === "current" ? "Now" : "Next"}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="marketingSideStack">
                  <section className="marketingUpcomingCard">
                    <div className="marketingSectionHeading">
                      <strong>Upcoming test</strong>
                    </div>
                    <strong className="marketingUpcomingTitle">{heroPanel.upcoming.title}</strong>
                    <span className="marketingUpcomingTime">{heroPanel.upcoming.schedule}</span>
                    <button className="button buttonPrimary" type="button">
                      {heroPanel.upcoming.cta}
                    </button>
                  </section>

                  <section className="marketingProgressCard">
                    <div className="marketingSectionHeading">
                      <strong>Subject progress</strong>
                    </div>
                    <div className="marketingProgressList">
                      {heroPanel.subjectProgress.map((item) => (
                        <div className="marketingProgressRow" key={item.subject}>
                          <div>
                            <span>{item.subject}</span>
                            <strong>{item.score}</strong>
                          </div>
                          <div className="marketingProgressTrack">
                            <span
                              className={`marketingProgressBar marketingProgressBar${item.tone}`}
                              style={{ width: item.width }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container marketingStatsBand">
        {statsBand.map((item) => (
          <article className="marketingStatBandItem" key={item.label}>
            <span className={`marketingStatBandIcon marketingStatBandIcon${item.tone}`} />
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="container marketingFeaturesSection" id="features">
        <div className="sectionIntro">
          <span className="eyebrow">{features.eyebrow}</span>
          <h2>{features.title}</h2>
        </div>

        <div className="marketingFeatureGrid">
          {features.items.map((item, index) => (
            <article className="marketingFeatureCard" data-accent={index} key={item.title}>
              <span className="marketingFeatureIcon">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container marketingShowcaseSection">
        <div className="sectionIntro">
          <span className="eyebrow">{showcase.eyebrow}</span>
          <h2>{showcase.title}</h2>
        </div>

        <div className="marketingPreviewGrid">
          {showcase.cards.map((card) => (
            <article className={`marketingPreviewCard marketingPreviewCard${card.accent}`} key={card.title}>
              <div className="marketingSectionHeading">
                <strong>{card.title}</strong>
              </div>
              <div className="marketingPreviewMock">
                <div className="marketingPreviewChart" />
                <div className="marketingPreviewStats">
                  {card.stats.map((stat) => (
                    <div className="marketingPreviewStat" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container accessLanesSection">
        <div className="sectionIntro">
          <span className="eyebrow">{roleCards.eyebrow}</span>
          <h2>{roleCards.title}</h2>
          <p>{roleCards.description}</p>
        </div>

        <div className="accessLaneGrid">
          {publicPortalAccessLanes.map((lane) => (
            <article className="featurePlaceholder accessLaneCard" key={lane.role}>
              <span className="eyebrow">{lane.badge}</span>
              <h3>{lane.title}</h3>
              <p>{lane.description}</p>
              <div className="accessLaneHighlights">
                {lane.highlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
              <div className="accessLaneActions">
                <Link className="button buttonPrimary" href={lane.signupHref}>
                  Open lane
                </Link>
                <Link className="button buttonSecondary" href={lane.loginHref}>
                  Login
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container marketingTestimonialsSection">
        <div className="sectionIntro">
          <span className="eyebrow">{testimonials.eyebrow}</span>
          <h2>Stories from every lane</h2>
        </div>

        <div className="marketingTestimonialsGrid">
          {testimonials.items.map((item) => (
            <article className="marketingTestimonialCard" key={item.author}>
              <span className="marketingQuoteMark">“</span>
              <p>{item.quote}</p>
              <div className="marketingTestimonialFooter">
                <span className="marketingAvatar">{renderAvatarSeed(item.author)}</span>
                <div>
                  <strong>{item.author}</strong>
                  <span>{item.role}</span>
                </div>
              </div>
            </article>
          ))}

          <aside className="marketingCommunityCard">
            <span className="marketingCommunityBadge">{testimonials.community.stat}</span>
            <strong>{testimonials.community.title}</strong>
            <div className="marketingCommunityAvatars">
              {testimonials.items.map((item) => (
                <span key={item.author}>{renderAvatarSeed(item.author)}</span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="container marketingFinalCta">
        <div className="marketingFinalCtaCopy">
          <span className="eyebrow">Start today</span>
          <h2>{finalCta.title}</h2>
          <p>{finalCta.description}</p>
          <div className="marketingTrustPoints">
            {finalCta.bullets.map((bullet) => (
              <span key={bullet}>{bullet}</span>
            ))}
          </div>
        </div>

        <div className="marketingFinalCtaAction">
          <Link className="button buttonSecondary marketingFinalCtaButton" href={finalCta.primaryCta.href}>
            {finalCta.primaryCta.label}
          </Link>
          <span>{finalCta.trust}</span>
        </div>
      </section>
    </main>
  );
}
