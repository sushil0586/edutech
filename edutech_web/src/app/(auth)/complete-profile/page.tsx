import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileCompletionForm } from "@/components/auth/profile-completion-form";
import { PageHeader } from "@/components/ui/page-header";
import {
  clearSessionCookies,
  fetchCurrentAccountProfile,
  fetchRegistrationOptions,
  getPortalHomePath,
  needsProfileCompletion,
} from "@/lib/auth/session";

export default async function CompleteProfilePage() {
  const profile = await fetchCurrentAccountProfile();
  if (!profile || !profile.is_active) {
    await clearSessionCookies();
    redirect("/login");
  }

  if (!needsProfileCompletion(profile)) {
    redirect(getPortalHomePath(profile.role));
  }

  const registrationOptions = await fetchRegistrationOptions().catch(() => null);
  if (!registrationOptions) {
    return (
      <div className="signupPage">
        <header className="signupHeader">
          <Link className="brand" href="/">
            <span className="brandMark">N</span>
            <span className="brandText">
              <strong>Nexora</strong>
              <small>Public launch registration</small>
            </span>
          </Link>

          <div className="navActions">
            <Link className="button buttonGhost" href="/">
              Home
            </Link>
            <Link className="button buttonSecondary" href="/login">
              Login
            </Link>
          </div>
        </header>

        <section className="signupPageIntro">
          <PageHeader
            eyebrow="Profile completion"
            title="Registration options are unavailable"
            description="The completion flow depends on the live registration catalog from the backend."
            className="pageHeaderCompact"
          />
        </section>

        <div className="authCard authCardWide signupWorkspace">
          <div className="registrationWorkflow registrationWorkflowSingle">
            <div className="registrationErrorBanner">
              <p className="registrationErrorBannerTitle">We could not load the live profile-completion catalog.</p>
              <p>Please restore the registration options endpoint and reload this page.</p>
            </div>
            <div className="registrationSummaryActions">
              <Link className="button buttonSecondary" href="/login">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signupPage">
      <header className="signupHeader">
        <Link className="brand" href="/">
          <span className="brandMark">N</span>
          <span className="brandText">
            <strong>Nexora</strong>
            <small>Public launch registration</small>
          </span>
        </Link>

        <div className="navActions">
          <Link className="button buttonGhost" href="/">
            Home
          </Link>
          <Link className="button buttonSecondary" href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="signupPageIntro">
        <PageHeader
          eyebrow="Complete your profile"
          title="One last step before your dashboard"
          description="We already created the login. Now we’ll confirm the role-specific details needed for the right workspace."
          className="pageHeaderCompact"
        />

        <div className="signupInlineLaneStrip">
          <div className="signupInlineLanePill">
            <strong>Account already created</strong>
            <span>Only the guided role details are left</span>
          </div>
          <div className="signupInlineLanePill">
            <strong>Detected location retained</strong>
            <span>Country, state, city, and pincode can be confirmed here</span>
          </div>
          <div className="signupInlineLanePill">
            <strong>Dashboard opens next</strong>
            <span>This step routes the user to the correct workspace</span>
          </div>
        </div>
      </section>

      <div className="authCard authCardWide signupWorkspace">
        <ProfileCompletionForm profile={profile} registrationOptions={registrationOptions} />
      </div>
    </div>
  );
}
