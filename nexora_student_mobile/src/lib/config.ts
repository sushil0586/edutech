export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}
