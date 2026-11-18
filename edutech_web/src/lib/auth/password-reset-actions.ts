"use server";

import { confirmPasswordReset, requestPasswordReset, AuthenticationError } from "@/lib/auth/session";

export type PasswordResetState = { message: string; success: boolean; fieldErrors: Record<string, string> };
export const initialPasswordResetState: PasswordResetState = { message: "", success: false, fieldErrors: {} };

export async function requestPasswordResetAction(_state: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { message: "Enter your username or email.", success: false, fieldErrors: { identifier: "Required." } };
  try {
    const response = await requestPasswordReset(identifier);
    return { message: response.detail, success: true, fieldErrors: {} };
  } catch (error) {
    return { message: error instanceof AuthenticationError ? error.message : "Recovery is temporarily unavailable. Contact your institute support team.", success: false, fieldErrors: {} };
  }
}

export async function confirmPasswordResetAction(_state: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
  const request = String(formData.get("request") ?? "");
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (!newPassword || !confirmPassword) return { message: "Enter and confirm your new password.", success: false, fieldErrors: {} };
  try {
    const response = await confirmPasswordReset({ request, token, new_password: newPassword, confirm_password: confirmPassword });
    return { message: response.detail, success: true, fieldErrors: {} };
  } catch (error) {
    return { message: error instanceof AuthenticationError ? error.message : "The reset could not be completed.", success: false, fieldErrors: error instanceof AuthenticationError ? error.fieldErrors : {} };
  }
}
