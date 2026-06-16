"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { PendingButton } from "@/components/ui/pending-button";
import { registerAction } from "@/lib/auth/actions";
import { fetchLocationPrefill } from "@/lib/auth/location-prefill";
import { initialRegistrationActionState } from "@/lib/auth/registration-state";
import type { RegistrationOptions } from "@/lib/auth/session";

type RegistrationLane = {
  role: string;
  badge: string;
  title: string;
  description: string;
  loginHref: string;
  signupHref: string;
  ctaLabel: string;
  note: string;
  highlights: readonly string[];
};

type RegistrationHubProps = {
  lanes: readonly RegistrationLane[];
  registrationOptions: RegistrationOptions;
  initialRole?: string;
};

function buildLoginHref(baseHref: string, role?: string) {
  if (baseHref.includes("?")) {
    return baseHref;
  }

  if (!role) {
    return "/login";
  }

  const params = new URLSearchParams({ role });
  return `${baseHref}?${params.toString()}`;
}

function getCompletionLabel(role: string) {
  if (role === "student") {
    return "Class, board, exam preferences, and location";
  }
  if (role === "teacher") {
    return "Teaching focus, subject scope, and location";
  }
  return "Child details, parent focus, and location";
}

function detectBrowserFamily() {
  if (typeof navigator === "undefined") {
    return "web";
  }

  const agent = navigator.userAgent.toLowerCase();
  if (agent.includes("edg")) return "edge";
  if (agent.includes("chrome")) return "chrome";
  if (agent.includes("safari")) return "safari";
  if (agent.includes("firefox")) return "firefox";
  return "web";
}

function detectDeviceCategory() {
  if (typeof window === "undefined") {
    return "desktop";
  }

  return window.innerWidth < 768 ? "mobile" : window.innerWidth < 1120 ? "tablet" : "desktop";
}

export function RegistrationHub({
  lanes,
  registrationOptions,
  initialRole,
}: RegistrationHubProps) {
  const [state, formAction] = useActionState(registerAction, initialRegistrationActionState);
  const [selectedRole, setSelectedRole] = useState(initialRole ?? "student");
  const [schoolCode, setSchoolCode] = useState("");
  const [browserFamily] = useState(() => detectBrowserFamily());
  const [deviceCategory] = useState(() => detectDeviceCategory());
  const [detectedTimezone] = useState(() =>
    typeof Intl === "undefined" ? "" : (Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""),
  );
  const [detectedCountry, setDetectedCountry] = useState("");
  const [detectedState, setDetectedState] = useState("");
  const [detectedCity, setDetectedCity] = useState("");
  const [detectedPincode, setDetectedPincode] = useState("");
  const [detectionSource, setDetectionSource] = useState("browser_timezone");

  const selectedLane = useMemo(
    () => lanes.find((lane) => lane.role === selectedRole) ?? lanes[0],
    [lanes, selectedRole],
  );

  const selectedSchool =
    registrationOptions.schools.find((school) => school.code === schoolCode) ?? null;
  const selectedSchoolName =
    selectedSchool?.name ?? registrationOptions.public_institute.name;
  const loginHref = buildLoginHref(selectedLane.loginHref, selectedRole);

  useEffect(() => {
    let isCancelled = false;

    async function loadLocationPrefill() {
      const result = await fetchLocationPrefill();
      if (isCancelled || !result.available || !result.detected) {
        return;
      }

      setDetectedCountry(result.detected.country);
      setDetectedState(result.detected.state);
      setDetectedCity(result.detected.city);
      setDetectedPincode(result.detected.pincode);
      setDetectionSource(result.detected.detectionSource || "ip_provider");
    }

    void loadLocationPrefill();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="registrationHub registrationHubCompact">
      <form action={formAction} className="registrationWorkflow registrationWorkflowSingle" noValidate>
        <input name="role" type="hidden" value={selectedRole} />
        <input name="signup_source" type="hidden" value="public_web" />
        <input name="landing_variant" type="hidden" value="quick_signup_v1" />
        <input name="platform" type="hidden" value="web" />
        <input name="device_category" type="hidden" value={deviceCategory} />
        <input name="browser_family" type="hidden" value={browserFamily} />
        <input name="detected_timezone" type="hidden" value={detectedTimezone} />
        <input name="detected_country" type="hidden" value={detectedCountry} />
        <input name="detected_state" type="hidden" value={detectedState} />
        <input name="detected_city" type="hidden" value={detectedCity} />
        <input name="detected_pincode" type="hidden" value={detectedPincode} />
        <input name="detection_source" type="hidden" value={detectionSource} />

        <div className="registrationTopIntro">
          <div className="registrationTopIntroCopy">
            <span className="eyebrow">Quick signup</span>
            <h1>Create your shared Nexora account in one minute</h1>
            <p>
              Pick a role, complete the login essentials, and continue to one guided
              profile completion step after login.
            </p>
          </div>

          <div className="registrationTopIntroMeta">
            <span>Fast account creation</span>
            <span>Corporate-ready onboarding</span>
            <span>Profile details come next</span>
          </div>
        </div>

        <div className="registrationWorkflowHeader">
          <div>
            <span className="eyebrow">{selectedLane.badge}</span>
            <h2>{selectedLane.title} quick registration</h2>
            <p>
              Only the login essentials are asked here. The next screen will
              collect {getCompletionLabel(selectedRole).toLowerCase()}.
            </p>
            <div className="registrationWorkflowMeta">
              <span>Role-aware next step</span>
              <span>{selectedSchoolName}</span>
            </div>
          </div>
          <div className="registrationLaneSelector" aria-label="Choose role">
            {lanes.map((lane) => {
              const active = lane.role === selectedRole;

              return (
                <button
                  className={`registrationLaneTab ${active ? "registrationLaneTabActive" : ""}`}
                  key={lane.role}
                  aria-pressed={active}
                  onClick={() => setSelectedRole(lane.role)}
                  type="button"
                >
                  <span>{lane.badge}</span>
                  <strong>{lane.title}</strong>
                </button>
              );
            })}
          </div>
        </div>

        {state.message || Object.keys(state.fieldErrors).length > 0 ? (
          <div className="registrationErrorBanner" aria-live="polite" tabIndex={-1}>
            <p className="registrationErrorBannerTitle">Please review the highlighted details before continuing.</p>
            {state.message ? <p>{state.message}</p> : null}
            {Object.entries(state.fieldErrors)
              .filter(([, value]) => Boolean(value))
              .map(([field, message]) => (
                <p key={field}>
                  <strong>{field.replaceAll("_", " ")}:</strong> {message}
                </p>
              ))}
          </div>
        ) : null}

        <div className="registrationWorkflowGrid registrationWorkflowGridQuick">
          <article className="registrationWorkflowPanel featurePlaceholder registrationQuickFormPanel">
            <div className="registrationFormStack registrationFormStackCompact">
              <label className="registrationField">
                <span>School / institute</span>
                <select
                  name="school_code"
                  onChange={(event) => setSchoolCode(event.target.value)}
                  value={schoolCode}
                >
                  <option value="">Use the default public institute</option>
                  {registrationOptions.schools.map((school) => (
                    <option key={school.id} value={school.code}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <small className="registrationFieldHint">
                  Leave this blank if the learner is coming directly from the public site.
                </small>
              </label>

              <div className="registrationFormRow">
                <label className="registrationField">
                  <span>First name</span>
                  <input
                    aria-invalid={Boolean(state.fieldErrors.first_name)}
                    name="first_name"
                    placeholder="Aarav"
                    required
                    type="text"
                  />
                  {state.fieldErrors.first_name ? (
                    <small className="authFieldError">{state.fieldErrors.first_name}</small>
                  ) : null}
                </label>

                <label className="registrationField">
                  <span>Last name</span>
                  <input name="last_name" placeholder="Sharma" type="text" />
                </label>
              </div>

              <div className="registrationFormRow">
                <label className="registrationField">
                  <span>Email</span>
                  <input
                    aria-invalid={Boolean(state.fieldErrors.email)}
                    autoComplete="email"
                    name="email"
                    placeholder="aarav@example.com"
                    required
                    type="email"
                  />
                  {state.fieldErrors.email ? (
                    <small className="authFieldError">{state.fieldErrors.email}</small>
                  ) : null}
                </label>

                <label className="registrationField">
                  <span>Phone</span>
                  <input
                    aria-invalid={Boolean(state.fieldErrors.phone)}
                    autoComplete="tel"
                    name="phone"
                    placeholder="9876543210"
                    required
                    type="tel"
                  />
                  {state.fieldErrors.phone ? (
                    <small className="authFieldError">{state.fieldErrors.phone}</small>
                  ) : (
                    <small className="registrationFieldHint">Referral and alerts can use this later.</small>
                  )}
                </label>
              </div>

              <div className="registrationFormRow">
                <label className="registrationField">
                  <span>Password</span>
                  <input
                    aria-invalid={Boolean(state.fieldErrors.password)}
                    autoComplete="new-password"
                    name="password"
                    placeholder="Create a strong password"
                    required
                    type="password"
                  />
                  {state.fieldErrors.password ? (
                    <small className="authFieldError">{state.fieldErrors.password}</small>
                  ) : null}
                </label>

                <label className="registrationField">
                  <span>Confirm password</span>
                  <input
                    aria-invalid={Boolean(state.fieldErrors.confirm_password)}
                    autoComplete="new-password"
                    name="confirm_password"
                    placeholder="Repeat your password"
                    required
                    type="password"
                  />
                  {state.fieldErrors.confirm_password ? (
                    <small className="authFieldError">{state.fieldErrors.confirm_password}</small>
                  ) : null}
                </label>
              </div>

              <label className="registrationField">
                <span>Referral code</span>
                <input
                  aria-invalid={Boolean(state.fieldErrors.referral_code)}
                  name="referral_code"
                  placeholder="Optional"
                  type="text"
                />
                {state.fieldErrors.referral_code ? (
                  <small className="authFieldError">{state.fieldErrors.referral_code}</small>
                ) : (
                  <small className="registrationFieldHint">
                    Keep this ready if you were referred by email today, or by phone/WhatsApp in future flows.
                  </small>
                )}
              </label>
            </div>
          </article>

          <aside className="registrationWorkflowPanel featurePlaceholder registrationQuickPreviewPanel">
            <span className="eyebrow">What happens next</span>
            <h3>One account first, profile details after login</h3>
            <p className="registrationPanelHint">
              This keeps registration fast while still preserving the structured
              data needed for class, location, teacher links, and analytics.
            </p>

            <div className="registrationPreviewRoleCard">
              <strong>{selectedLane.title}</strong>
              <p>{selectedLane.description}</p>
              <div className="registrationLaneHighlights">
                {selectedLane.highlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
            </div>

            <div className="registrationChecklistCard">
              <div>
                <strong>Step 1</strong>
                <p>Create the shared account with role, email, phone, and password.</p>
              </div>
              <div>
                <strong>Step 2</strong>
                <p>Land on a guided complete-profile screen for {selectedLane.title.toLowerCase()}.</p>
              </div>
              <div>
                <strong>Step 3</strong>
                <p>Enter the matching dashboard with plan exams and sample content.</p>
              </div>
            </div>

            <div className="registrationTagCloud">
              <span>{selectedLane.title}</span>
              <span>{selectedSchoolName}</span>
              <span>{getCompletionLabel(selectedRole)}</span>
              {detectedCity || detectedState ? (
                <span>
                  {detectedCity ? `${detectedCity}, ` : ""}
                  {detectedState || detectedCountry}
                </span>
              ) : null}
            </div>

            <div className="registrationSummaryActions registrationSummaryActionsStack">
              <PendingButton
                className="button buttonPrimary"
                idleLabel="Create account"
                pendingLabel="Creating account..."
                disabled={!selectedRole}
              />
              <Link className="button buttonSecondary" href={loginHref}>
                I already have a login
              </Link>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
