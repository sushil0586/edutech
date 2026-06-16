import { useEffect, useState } from "react";
import { fetchCurrentProfile } from "@/lib/api/auth";
import { clearPersistedSession, loadPersistedSession, persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";

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
          setBootError(error instanceof Error ? error.message : "Unable to restore mobile session.");
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
