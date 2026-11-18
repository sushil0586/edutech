import Link from "next/link";
import { PublicPolicyLinks } from "@/components/ui/public-policy-links";
import { redirect } from "next/navigation";
import { StudentStatePanel } from "@/components/ui/student-state-panel";
import { RegistrationHub } from "@/components/auth/registration-hub";
import {
  fetchCurrentAccountProfile,
  fetchRegistrationOptions,
  getPostAuthRedirectPath,
} from "@/lib/auth/session";
import { launchScopeStatement, publicPortalAccessLanes } from "@/lib/site-content";

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveRole(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const profile = await fetchCurrentAccountProfile();
  if (profile) {
    redirect(getPostAuthRedirectPath(profile));
  }

  const resolvedSearchParams = await searchParams;
  const role = resolveRole(resolvedSearchParams.role);
  const initialRole = publicPortalAccessLanes.some((lane) => lane.role === role)
    ? role
    : undefined;
  const registrationOptions = await fetchRegistrationOptions().catch(() => null);

  if (!registrationOptions) {
    return (
      <div className="signupPage authPage">
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

        <div className="authCard authCardWide signupWorkspace">
          <StudentStatePanel
            eyebrow="Setup required"
            title="Registration options are unavailable right now"
            description="This signup flow no longer falls back to hardcoded institutes, classes, boards, or exam catalogs. Bring the registration options endpoint back and reload the page."
            bullets={[
              "Public registration options endpoint",
              "Institute and academic catalog setup",
              "Live role-based registration lanes",
            ]}
            ctaHref="/login"
            ctaLabel="Back to Login"
            statusLabel="Waiting for live registration configuration"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="signupPage authPage">
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

      <div className="authCard authCardWide signupWorkspace">
        <RegistrationHub
          initialRole={initialRole}
          lanes={publicPortalAccessLanes}
          registrationOptions={registrationOptions}
        />
        <PublicPolicyLinks />
      </div>
    </div>
  );
}
