import { Platform } from "react-native";

function resolveApiBaseUrl() {
  if (Platform.OS === "android") {
    return (
      process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      ""
    );
  }

  if (Platform.OS === "ios") {
    return (
      process.env.EXPO_PUBLIC_IOS_API_BASE_URL ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      ""
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
}

export const API_BASE_URL = resolveApiBaseUrl();

function parseTimeout(value: string | undefined) {
  if (!value) {
    return 20_000;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20_000;
  }

  return parsed;
}

export const API_REQUEST_TIMEOUT_MS = parseTimeout(
  process.env.EXPO_PUBLIC_API_REQUEST_TIMEOUT_MS,
);

export const SHOW_MOBILE_DEBUG_PANEL =
  process.env.EXPO_PUBLIC_SHOW_MOBILE_DEBUG_PANEL === "true";

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}
