import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { LoginForm } from "@/components/auth/login-form";
import {
  fetchCurrentAccountProfile,
  getPostAuthRedirectPath,
  isSupportedPortalRole,
} from "@/lib/auth/session";
import { portalAccessLanes } from "@/lib/site-content";

function resolveRole(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await fetchCurrentAccountProfile();
  if (profile && isSupportedPortalRole(profile.role)) {
    redirect(getPostAuthRedirectPath(profile));
  }

  const resolvedSearchParams = await searchParams;
  const role = resolveRole(resolvedSearchParams.role);
  const classLevel = resolveRole(resolvedSearchParams.class);
  const board = resolveRole(resolvedSearchParams.board);
  const focus = resolveRole(resolvedSearchParams.focus);
  const selectedLane = portalAccessLanes.find((lane) => lane.role === role);
  const pageTitle = selectedLane ? `${selectedLane.title} sign-in` : "Welcome back";
  const pageEyebrow = selectedLane ? selectedLane.badge : "Portal access";
  const pageDescription = selectedLane
    ? "Use the matching workspace below."
    : "Sign in to continue to your workspace.";

  return (
    <div className="authPage">
      <header className="signupHeader authHeader">
        <Link className="brand" href="/">
          <span className="brandMark">N</span>
          <span className="brandText">
            <strong>Nexora</strong>
            <small>Secure workspace access</small>
          </span>
        </Link>

        <div className="navActions">
          <Link className="button buttonGhost" href="/">
            Home
          </Link>
          <Link className="button buttonSecondary" href="/signup">
            Create account
          </Link>
        </div>
      </header>

      <section className="authLandingShell">
        <aside className="authLandingIntro">
          <div className="authLandingBadgeRow">
            <span className="eyebrow">{pageEyebrow}</span>
            <span className="statusPill">Live workspace access</span>
          </div>

          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>

          <div className="registrationTagCloud authLandingTags">
            <span>Fast sign-in</span>
            <span>Role-aware routing</span>
            <span>Secure session cookies</span>
          </div>

          {selectedLane ? (
            <div className="authLandingStory">
              <div className="authLaneHint authLaneHintStrong">
                <span className="eyebrow">Matched lane</span>
                <p>{selectedLane.title} is ready for sign-in.</p>
                {classLevel || board || focus ? (
                  <div className="registrationTagCloud">
                    {classLevel ? <span>Class {classLevel}</span> : null}
                    {board ? <span>{board}</span> : null}
                    {focus ? <span>{focus}</span> : null}
                  </div>
                ) : null}
              </div>

              <div className="authStoryGrid">
                {selectedLane.highlights.map((highlight, index) => (
                  <article className="authStoryCard" key={highlight}>
                    <span>0{index + 1}</span>
                    <strong>{highlight}</strong>
                    <p>Continue into the matching workflow without switching product context.</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="authStoryGrid">
              <article className="authStoryCard">
                <span>01</span>
                <strong>Student and parent access</strong>
                <p>Resume practice, reports, and guided learning activity from the right workspace.</p>
              </article>
              <article className="authStoryCard">
                <span>02</span>
                <strong>Teacher and institute access</strong>
                <p>Return to exam operations, question workflows, and review tasks with less friction.</p>
              </article>
            </div>
          )}
        </aside>

        <div className="authCard authCardTall authLoginCard">
          <PageHeader
            eyebrow={pageEyebrow}
            title={pageTitle}
            description={pageDescription}
            className="pageHeaderCompact authPageHeader"
          />

          <LoginForm />

          <p className="authMeta">
            Need a different lane? <Link href="/signup">See access options</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
