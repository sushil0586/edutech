"use server";

import { AuthenticationError, createSupportRequest } from "@/lib/auth/session";

export type SupportState = { message: string; success: boolean };
export const initialSupportState: SupportState = { message: "", success: false };

export async function createSupportRequestAction(_state: SupportState, formData: FormData): Promise<SupportState> {
  const category = String(formData.get("category") ?? "other");
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (subject.length < 3 || description.length < 10) return { message: "Add a short subject and enough detail for support to investigate.", success: false };
  try {
    const request = await createSupportRequest({ category, subject, description });
    return { message: `Request ${request.id} was recorded. Support will follow up through your verified account email.`, success: true };
  } catch (error) {
    return { message: error instanceof AuthenticationError ? error.message : "Support request could not be recorded.", success: false };
  }
}
