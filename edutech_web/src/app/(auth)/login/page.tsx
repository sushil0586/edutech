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
    <div className="authCard">
      <PageHeader
        eyebrow={pageEyebrow}
        title={pageTitle}
        description={pageDescription}
        className="pageHeaderCompact"
      />

      {selectedLane ? (
        <div className="authLaneHint">
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
      ) : null}

      <LoginForm />

      <p className="authMeta">
        Need a different lane? <Link href="/signup">See access options</Link>
      </p>
    </div>
  );
}
