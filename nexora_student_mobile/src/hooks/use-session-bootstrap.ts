import { useEffect, useState } from "react";
import { fetchCurrentProfile } from "@/lib/api/auth";
import { MobileApiError } from "@/lib/api/client";
import { clearPersistedSession, loadPersistedSession, persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";

function logSessionBootstrap(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.log(`[session-bootstrap] ${message}`, details);
    return;
  }

  console.log(`[session-bootstrap] ${message}`);
}

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

function isRecoverableBootstrapError(error: unknown) {
  if (error instanceof MobileApiError) {
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network request failed") ||
      message.includes("took too long") ||
      message.includes("could not reach")
    );
  }

  return false;
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
      logSessionBootstrap("bootstrap:start", { hydrated });
      try {
        const persisted = await loadPersistedSession();
        if (!persisted) {
          logSessionBootstrap("bootstrap:no-persisted-session");
          if (active) {
            markHydrated();
          }
          return;
        }

        logSessionBootstrap("bootstrap:persisted-found", {
          role: persisted.profile.role,
          username: persisted.profile.username,
        });
        const liveProfile = await fetchCurrentProfile(persisted.accessToken);
        if (!active) {
          logSessionBootstrap("bootstrap:inactive-after-fetch");
          return;
        }

        logSessionBootstrap("bootstrap:live-profile-success", {
          role: liveProfile.role,
          username: liveProfile.username,
        });
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
        logSessionBootstrap("bootstrap:session-restored");
      } catch (error) {
        logSessionBootstrap("bootstrap:error", {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : { message: String(error) },
        });
        const persisted = await loadPersistedSession();

        if (persisted && isRecoverableBootstrapError(error)) {
          if (active) {
            setSession({
              accessToken: persisted.accessToken,
              refreshToken: persisted.refreshToken,
              profile: persisted.profile,
            });
            setBootError(
              "Using the last saved student session because Nexora could not be reached right now.",
            );
            logSessionBootstrap("bootstrap:recoverable-fallback", {
              role: persisted.profile.role,
              username: persisted.profile.username,
            });
          }
        } else {
          await clearPersistedSession();
          clearSession();
          if (active) {
            setBootError(friendlyBootstrapError(error));
          }
          logSessionBootstrap("bootstrap:cleared-session");
        }
      } finally {
        if (active) {
          markHydrated();
        }
        logSessionBootstrap("bootstrap:complete", { active });
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [clearSession, hydrated, markHydrated, setSession]);

  return { hydrated, bootError };
}
