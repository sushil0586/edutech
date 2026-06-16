import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { MobileAccountProfile } from "@/types/api";

const ACCESS_TOKEN_KEY = "nexora.mobile.access";
const REFRESH_TOKEN_KEY = "nexora.mobile.refresh";
const PROFILE_KEY = "nexora.mobile.profile";

function canUseWebStorage() {
  return Platform.OS === "web" && typeof window !== "undefined" && !!window.localStorage;
}

async function setItem(key: string, value: string) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function persistSession(payload: {
  accessToken: string;
  refreshToken: string;
  profile: MobileAccountProfile;
}) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, payload.accessToken),
    setItem(REFRESH_TOKEN_KEY, payload.refreshToken),
    setItem(PROFILE_KEY, JSON.stringify(payload.profile)),
  ]);
}

export async function loadPersistedSession() {
  const [accessToken, refreshToken, profileString] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(PROFILE_KEY),
  ]);

  if (!accessToken || !refreshToken || !profileString) {
    return null;
  }

  try {
    return {
      accessToken,
      refreshToken,
      profile: JSON.parse(profileString) as MobileAccountProfile,
    };
  } catch {
    return null;
  }
}

export async function clearPersistedSession() {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
    removeItem(PROFILE_KEY),
  ]);
}
