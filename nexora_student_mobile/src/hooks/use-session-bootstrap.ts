import { useEffect, useState } from "react";
import { fetchCurrentProfile } from "@/lib/api/auth";
import { MobileApiError } from "@/lib/api/client";
import { clearPersistedSession, loadPersistedSession, persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";

function friendlyBootstrapError(error: unknown) {
  if (error instanceof MobileApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Your previous session is no longer valid. Please sign in again.";
    }

    if (error.message.toLowerCase().includes("not configured")) {
      return "The mobile app is not connected to the backend yet. Set the API base URL and try again.";
    }

    return error.message || "We could not restore the previous mobile session.";
  }

  if (error instanceof Error) {
    if (
      error.message.toLowerCase().includes("network request failed") ||
      error.message.toLowerCase().includes("took too long")
    ) {
      return "We could not reconnect to Nexora while restoring your session. Please check your internet and sign in again if needed.";
    }

    return error.message || "We could not restore the previous mobile session.";
  }

  return "We could not restore the previous mobile session.";
}

export function useSessionBootstrap() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const markHydrated = useSessionStore((state) => state.markHydrated);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    let active = true;

    async function bootstrap() {
      try {
        const persisted = await loadPersistedSession();
        if (!persisted) {
          if (active) {
            markHydrated();
          }
          return;
        }

        const liveProfile = await fetchCurrentProfile(persisted.accessToken);
        if (!active) {
          return;
        }

        setSession({
          accessToken: persisted.accessToken,
          refreshToken: persisted.refreshToken,
          profile: liveProfile,
        });
        await persistSession({
          accessToken: persisted.accessToken,
          refreshToken: persisted.refreshToken,
          profile: liveProfile,
        });
      } catch (error) {
        await clearPersistedSession();
        clearSession();
        if (active) {
          setBootError(friendlyBootstrapError(error));
        }
      } finally {
        if (active) {
          markHydrated();
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [clearSession, hydrated, markHydrated, setSession]);

  return { hydrated, bootError };
}
