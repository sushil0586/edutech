import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const ACCESS_COOKIE = "nexora_access_token";
const REFRESH_COOKIE = "nexora_refresh_token";

export type AccountProfile = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
  institute: string | null;
  institute_name?: string | null;
  student_profile: string | null;
  teacher_profile: string | null;
  onboarding_status?: string;
  profile_completion_required?: boolean;
  profile_completion_completed_at?: string | null;
  onboarding_role?: string;
  onboarding_version?: string;
  registration_context?: Record<string, unknown>;
  student_context?: {
    full_name: string;
    program_name: string;
    academic_year_name: string;
    cohort_name: string;
    referral_code?: string | null;
    subject_options: Array<{
      value: string;
      label: string;
    }>;
  } | null;
  parent_context?: {
    parent_profile_id: string | null;
    linked_children_count: number;
    has_active_links: boolean;
  } | null;
  location_context?: {
    detected_country?: string;
    detected_state?: string;
    detected_city?: string;
    detected_pincode?: string;
    detected_timezone?: string;
    detection_source?: string;
    detected_at?: string | null;
    confirmed_country?: string;
    confirmed_state?: string;
    confirmed_city?: string;
    confirmed_pincode?: string;
    confirmed_timezone?: string;
    confirmed_at?: string | null;
  } | null;
  acquisition_context?: {
    signup_source?: string;
    landing_variant?: string;
    platform?: string;
    device_category?: string;
    app_version?: string;
    browser_family?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referral_channel?: string;
    referral_identifier?: string;
    invite_code?: string;
    school_name_text?: string;
    school_normalization_status?: string;
    metadata?: Record<string, unknown>;
  } | null;
  is_active: boolean;
};

export type RegistrationOptions = {
  location_catalog: Array<{
    country: string;
    states: Array<{
      name: string;
      cities: Array<{
        name: string;
        pincodes: string[];
      }>;
    }>;
  }>;
  public_institute: {
    id: string;
    name: string;
    code: string;
  };
  schools: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  class_levels: string[];
  boards: string[];
  student_exam_interests: string[];
  teacher_focus_options: string[];
  parent_focus_options: string[];
  subject_catalog: Record<string, string[]>;
  exam_catalog: Record<string, string[]>;
};

export type PortalRole =
  | "student"
  | "teacher"
  | "platform_admin"
  | "institute_admin"
  | "parent";

type LoginResponse = {
  refresh: string;
  access: string;
  user: AccountProfile;
};

type RegisterResponse = LoginResponse;

export class AuthenticationError extends Error {
  code: string;
  fieldErrors: Record<string, string>;

  constructor(message: string, code = "auth_failed", fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function formatRetryAfter(retryAfterHeader: string | null) {
  if (!retryAfterHeader) {
    return "";
  }

  const seconds = Number(retryAfterHeader);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

async function requestAuthJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL or API_BASE_URL is required.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body,
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    let message = `Auth request failed with ${response.status}`;
    let fieldErrors: Record<string, string> = {};
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      const detail = payload.detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = String(detail[0]);
      } else {
        const firstError = Object.values(payload).find((value) => {
          if (typeof value === "string" && value.trim()) return true;
          if (Array.isArray(value) && value.length > 0) return true;
          return false;
        });

        if (typeof firstError === "string") {
          message = firstError;
        } else if (Array.isArray(firstError) && firstError.length > 0) {
          message = String(firstError[0]);
        }
      }

      fieldErrors = Object.fromEntries(
        Object.entries(payload)
          .filter(([key]) => key !== "detail")
          .map(([key, value]) => {
            if (typeof value === "string") {
              return [key, value];
            }
            if (Array.isArray(value) && value.length > 0) {
              return [key, String(value[0])];
            }
            return [key, ""];
          })
          .filter(([, value]) => Boolean(value)),
      );
    } catch {
      // Fall back to the default message if the error body isn't JSON.
    }

    if (response.status === 429) {
      const retryAfter = formatRetryAfter(response.headers.get("Retry-After"));
      message = retryAfter
        ? `Too many registration attempts. Please wait about ${retryAfter} and try again, or use login if you already registered.`
        : "Too many registration attempts. Please wait a bit and try again, or use login if you already registered.";
    }

    throw new AuthenticationError(message, "request_failed", fieldErrors);
  }

  return (await response.json()) as T;
}

async function writeSessionCookies({
  access,
  refresh,
}: {
  access: string;
  refresh: string;
}) {
  const cookieStore = await cookies();

  try {
    cookieStore.set(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    cookieStore.set(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Server component renders can read cookies but cannot mutate them.
  }
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(ACCESS_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
  } catch {
    // Ignore cookie mutation errors during read-only render paths.
  }
}

export async function loginWithPassword(username: string, password: string) {
  const payload = await requestAuthJson<LoginResponse>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!payload.user.is_active) {
    throw new AuthenticationError(
      "This account is inactive. Please contact your institute administrator.",
      "inactive_account",
    );
  }

  if (!isSupportedPortalRole(payload.user.role)) {
    throw new AuthenticationError(
      "This portal currently supports student, teacher, parent, and admin accounts only.",
      "role_not_allowed",
    );
  }

  await writeSessionCookies({
    access: payload.access,
    refresh: payload.refresh,
  });

  return payload.user;
}

export async function registerWithPassword(payload: {
  role: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  school_code?: string;
  school_name?: string;
  password: string;
  confirm_password: string;
  class_level?: string;
  board?: string;
  exam_interest?: string;
  referral_code?: string;
  subject_interests?: string[];
  child_class_level?: string;
  child_board?: string;
  parent_focus?: string;
  teaching_focus?: string;
  teaching_scope?: string[];
  signup_source?: string;
  landing_variant?: string;
  platform?: string;
  device_category?: string;
  app_version?: string;
  browser_family?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  invite_code?: string;
  detected_country?: string;
  detected_state?: string;
  detected_city?: string;
  detected_pincode?: string;
  detected_timezone?: string;
  detection_source?: string;
}) {
  const response = await requestAuthJson<RegisterResponse>("/api/v1/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await writeSessionCookies({
    access: response.access,
    refresh: response.refresh,
  });

  return response.user;
}

export async function completeOnboardingProfile(payload: Record<string, unknown>) {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    throw new AuthenticationError("Your session expired. Please sign in again.", "session_missing");
  }

  return requestAuthJson<AccountProfile>("/api/v1/onboarding/profile/", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchRegistrationOptions() {
  return requestAuthJson<RegistrationOptions>("/api/v1/auth/register/options/", {
    method: "GET",
  });
}

export function isSupportedPortalRole(role: string): role is PortalRole {
  return (
    role === "student" ||
    role === "teacher" ||
    role === "platform_admin" ||
    role === "institute_admin" ||
    role === "parent"
  );
}

export function getPortalHomePath(role: string) {
  switch (role) {
    case "teacher":
      return "/teacher/dashboard";
    case "platform_admin":
      return "/admin";
    case "institute_admin":
      return "/institute/dashboard";
    case "parent":
      return "/parent/dashboard";
    case "student":
    default:
      return "/app/dashboard";
  }
}

export function needsProfileCompletion(profile: Pick<AccountProfile, "role" | "profile_completion_required" | "onboarding_status">) {
  const publicRole =
    profile.role === "student" || profile.role === "teacher" || profile.role === "parent";
  if (!publicRole) {
    return false;
  }

  if (profile.profile_completion_required) {
    return true;
  }

  return (
    profile.onboarding_status === "not_started" ||
    profile.onboarding_status === "in_progress"
  );
}

export function getPostAuthRedirectPath(profile: AccountProfile) {
  if (needsProfileCompletion(profile)) {
    return "/complete-profile";
  }

  return getPortalHomePath(profile.role);
}

async function refreshAccessToken(refresh: string) {
  const payload = await requestAuthJson<{ access: string }>(
    "/api/v1/auth/refresh/",
    {
      method: "POST",
      body: JSON.stringify({ refresh }),
    },
  );

  const cookieStore = await cookies();
  try {
    cookieStore.set(ACCESS_COOKIE, payload.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });
  } catch {
    // Refresh can still supply an access token for the current request
    // even when cookie persistence is blocked during server rendering.
  }

  return payload.access;
}

export async function getSessionAccessToken() {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value ?? "";
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value ?? "";

  if (access) {
    return access;
  }

  if (!refresh) {
    return "";
  }

  try {
    return await refreshAccessToken(refresh);
  } catch {
    await clearSessionCookies();
    return "";
  }
}

export async function fetchCurrentAccountProfile() {
  const accessToken = await getSessionAccessToken();
  if (!accessToken) {
    return null;
  }

  try {
    return await requestAuthJson<AccountProfile>("/api/v1/auth/me/", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    await clearSessionCookies();
    return null;
  }
}

export async function requireStudentSession() {
  const profile = await fetchCurrentAccountProfile();

  if (!profile || !profile.is_active || profile.role !== "student") {
    await clearSessionCookies();
    redirect("/login");
  }

  if (needsProfileCompletion(profile)) {
    redirect("/complete-profile");
  }

  return profile;
}

export async function requireTeacherSession() {
  const profile = await fetchCurrentAccountProfile();

  if (!profile || !profile.is_active || profile.role !== "teacher") {
    await clearSessionCookies();
    redirect("/login");
  }

  return profile;
}

export async function requireRoleSession(allowedRoles: string[]) {
  const profile = await fetchCurrentAccountProfile();

  if (
    !profile ||
    !profile.is_active ||
    !allowedRoles.includes(profile.role)
  ) {
    await clearSessionCookies();
    redirect("/login");
  }

  if (needsProfileCompletion(profile)) {
    redirect("/complete-profile");
  }

  return profile;
}

export async function requirePlatformAdminSession() {
  return requireRoleSession(["platform_admin"]);
}

export async function requireInstituteAdminSession() {
  return requireRoleSession(["institute_admin", "platform_admin"]);
}

export async function requireParentSession() {
  return requireRoleSession(["parent"]);
}
