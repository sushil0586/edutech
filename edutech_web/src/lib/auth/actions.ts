"use server";

import { redirect } from "next/navigation";
import {
  AuthenticationError,
  clearSessionCookies,
  completeOnboardingProfile,
  getPostAuthRedirectPath,
  loginWithPassword,
  registerWithPassword,
} from "@/lib/auth/session";
import { LoginActionState } from "@/lib/auth/login-state";
import {
  initialRegistrationActionState,
  RegistrationActionState,
} from "@/lib/auth/registration-state";
import {
  initialProfileCompletionActionState,
  ProfileCompletionActionState,
} from "@/lib/auth/profile-completion-state";

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const nextState: LoginActionState = {
    message: "",
    username,
    fieldErrors: {},
  };

  if (!username) {
    nextState.fieldErrors.username = "Enter your username or email.";
  }

  if (!password) {
    nextState.fieldErrors.password = "Enter your password.";
  }

  if (nextState.fieldErrors.username || nextState.fieldErrors.password) {
    nextState.message = "Enter both username and password to continue.";
    return nextState;
  }

  let profile;
  try {
    profile = await loginWithPassword(username, password);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return {
        ...nextState,
        message: error.message,
        fieldErrors: {
          ...nextState.fieldErrors,
          ...error.fieldErrors,
        },
      };
    }

    return {
      ...nextState,
      message: "We could not sign you in right now. Please try again.",
    };
  }

  redirect(getPostAuthRedirectPath(profile));
}

export async function registerAction(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const role = String(formData.get("role") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const schoolCode = String(formData.get("school_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const referralCode = String(formData.get("referral_code") ?? "").trim();
  const signupSource = String(formData.get("signup_source") ?? "").trim();
  const landingVariant = String(formData.get("landing_variant") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const deviceCategory = String(formData.get("device_category") ?? "").trim();
  const appVersion = String(formData.get("app_version") ?? "").trim();
  const browserFamily = String(formData.get("browser_family") ?? "").trim();
  const detectedTimezone = String(formData.get("detected_timezone") ?? "").trim();
  const detectionSource = String(formData.get("detection_source") ?? "").trim();
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  const nextState: RegistrationActionState = {
    message: "",
    role: role || initialRegistrationActionState.role,
    fieldErrors: {},
  };

  if (!role) {
    nextState.fieldErrors.role = "Choose a registration lane.";
  }
  if (!firstName) {
    nextState.fieldErrors.first_name = "Enter your first name.";
  }
  if (!email) {
    nextState.fieldErrors.email = "Enter your email address.";
  }
  if (!phone) {
    nextState.fieldErrors.phone = "Enter your phone number.";
  }
  if (!password) {
    nextState.fieldErrors.password = "Create a password.";
  }
  if (!confirmPassword) {
    nextState.fieldErrors.confirm_password = "Confirm your password.";
  }

  if (Object.keys(nextState.fieldErrors).length > 0) {
    nextState.message = "Complete the highlighted fields to continue.";
    return nextState;
  }

  let user;
  try {
    user = await registerWithPassword({
      role,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      school_code: schoolCode,
      password,
      confirm_password: confirmPassword,
      referral_code: referralCode,
      signup_source: signupSource,
      landing_variant: landingVariant,
      platform,
      device_category: deviceCategory,
      app_version: appVersion,
      browser_family: browserFamily,
      detected_timezone: detectedTimezone,
      detection_source: detectionSource,
      invite_code: inviteCode,
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return {
        ...nextState,
        message: error.message,
        fieldErrors: {
          ...nextState.fieldErrors,
          ...error.fieldErrors,
        },
      };
    }

    return {
      ...nextState,
      message: "We could not create your account right now. Please try again.",
    };
  }

  redirect(getPostAuthRedirectPath(user));
}

export async function completeProfileAction(
  _previousState: ProfileCompletionActionState,
  formData: FormData,
): Promise<ProfileCompletionActionState> {
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const schoolCode = String(formData.get("school_code") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const classLevel = String(formData.get("class_level") ?? "").trim();
  const board = String(formData.get("board") ?? "").trim();
  const examInterest = String(formData.get("exam_interest") ?? "").trim();
  const subjectInterests = String(formData.get("subject_interests") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const childClassLevel = String(formData.get("child_class_level") ?? "").trim();
  const childBoard = String(formData.get("child_board") ?? "").trim();
  const parentFocus = String(formData.get("parent_focus") ?? "").trim();
  const teachingFocus = String(formData.get("teaching_focus") ?? "").trim();
  const teachingScope = String(formData.get("teaching_scope") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const nextState: ProfileCompletionActionState = {
    ...initialProfileCompletionActionState,
    role,
  };

  if (!country) nextState.fieldErrors.country = "Country is required.";
  if (!state) nextState.fieldErrors.state = "State is required.";
  if (!city) nextState.fieldErrors.city = "City is required.";
  if (!pincode) nextState.fieldErrors.pincode = "Pincode is required.";

  if (role === "student") {
    if (!classLevel) nextState.fieldErrors.class_level = "Class level is required.";
    if (!board) nextState.fieldErrors.board = "Board is required.";
    if (!examInterest) nextState.fieldErrors.exam_interest = "Exam interest is required.";
  }

  if (role === "teacher") {
    if (!teachingFocus) nextState.fieldErrors.teaching_focus = "Teaching focus is required.";
  }

  if (role === "parent") {
    if (!childClassLevel) nextState.fieldErrors.child_class_level = "Child class level is required.";
    if (!childBoard) nextState.fieldErrors.child_board = "Child board is required.";
  }

  if (Object.keys(nextState.fieldErrors).length > 0) {
    nextState.message = "Review the highlighted details before continuing.";
    return nextState;
  }

  let profile;
  try {
    profile = await completeOnboardingProfile({
      phone,
      school_code: schoolCode,
      country,
      state,
      city,
      pincode,
      timezone,
      class_level: classLevel,
      board,
      exam_interest: examInterest,
      subject_interests: subjectInterests,
      child_class_level: childClassLevel,
      child_board: childBoard,
      parent_focus: parentFocus,
      teaching_focus: teachingFocus,
      teaching_scope: teachingScope,
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return {
        ...nextState,
        message: error.message,
        fieldErrors: {
          ...nextState.fieldErrors,
          ...error.fieldErrors,
        },
      };
    }

    return {
      ...nextState,
      message: "We could not complete your profile right now. Please try again.",
    };
  }

  redirect(getPostAuthRedirectPath(profile));
}

export async function logoutAction() {
  await clearSessionCookies();
  redirect("/login");
}
