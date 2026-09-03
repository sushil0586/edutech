import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { MobileAccountProfile } from "@/types/api";

const ACCESS_TOKEN_KEY = "nexora.mobile.access";
const REFRESH_TOKEN_KEY = "nexora.mobile.refresh";
const PROFILE_KEY = "nexora.mobile.profile";

function logSecureSession(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.log(`[secure-session] ${message}`, details);
    return;
  }

  console.log(`[secure-session] ${message}`);
}

function isWebPlatform() {
  return Platform.OS === "web";
}

async function setItem(key: string, value: string) {
  if (isWebPlatform()) {
    // Avoid persisting bearer tokens in browser storage where XSS can read them.
    logSecureSession("setItem:skip-web", { key });
    return;
  }

  logSecureSession("setItem:start", { key, length: value.length });
  await SecureStore.setItemAsync(key, value);
  logSecureSession("setItem:success", { key });
}

async function getItem(key: string) {
  if (isWebPlatform()) {
    logSecureSession("getItem:skip-web", { key });
    return null;
  }

  logSecureSession("getItem:start", { key });
  const value = await SecureStore.getItemAsync(key);
  logSecureSession("getItem:success", { key, exists: Boolean(value), length: value?.length ?? 0 });
  return value;
}

async function removeItem(key: string) {
  if (isWebPlatform()) {
    logSecureSession("removeItem:skip-web", { key });
    return;
  }

  logSecureSession("removeItem:start", { key });
  await SecureStore.deleteItemAsync(key);
  logSecureSession("removeItem:success", { key });
}

export async function persistSession(payload: {
  accessToken: string;
  refreshToken: string;
  profile: MobileAccountProfile;
}) {
  logSecureSession("persistSession:start", {
    role: payload.profile.role,
    username: payload.profile.username,
  });
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, payload.accessToken),
    setItem(REFRESH_TOKEN_KEY, payload.refreshToken),
    setItem(PROFILE_KEY, JSON.stringify(payload.profile)),
  ]);
  logSecureSession("persistSession:success", {
    role: payload.profile.role,
    username: payload.profile.username,
  });
}

export async function loadPersistedSession() {
  const [accessToken, refreshToken, profileString] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(PROFILE_KEY),
  ]);

  if (!accessToken || !refreshToken || !profileString) {
    logSecureSession("loadPersistedSession:missing", {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      hasProfile: Boolean(profileString),
    });
    return null;
  }

  try {
    const payload = {
      accessToken,
      refreshToken,
      profile: JSON.parse(profileString) as MobileAccountProfile,
    };
    logSecureSession("loadPersistedSession:success", {
      role: payload.profile.role,
      username: payload.profile.username,
    });
    return payload;
  } catch {
    logSecureSession("loadPersistedSession:parse-failed");
    return null;
  }
}

export async function clearPersistedSession() {
  logSecureSession("clearPersistedSession:start");
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
    removeItem(PROFILE_KEY),
  ]);
  logSecureSession("clearPersistedSession:success");
}
