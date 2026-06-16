import { requestJson } from "@/lib/api/client";
import { LoginResponse, MobileAccountProfile, RegisterOptionsResponse } from "@/types/api";

export async function fetchRegisterOptions() {
  return requestJson<RegisterOptionsResponse>("/api/v1/auth/register/options/");
}

export async function registerStudent(payload: {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  school_code?: string;
  password: string;
  confirm_password: string;
  class_level: string;
  board: string;
  exam_interest: string;
}) {
  return requestJson<LoginResponse>("/api/v1/auth/register/", {
    method: "POST",
    body: JSON.stringify({
      role: "student",
      ...payload,
    }),
  });
}

export async function loginStudent(payload: {
  username: string;
  password: string;
}) {
  return requestJson<LoginResponse>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentProfile(accessToken: string) {
  return requestJson<MobileAccountProfile>("/api/v1/auth/me/", undefined, accessToken);
}
