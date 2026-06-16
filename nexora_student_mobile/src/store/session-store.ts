import { create } from "zustand";
import { MobileAccountProfile } from "@/types/api";

export type MobileRole = "student" | "teacher" | "parent" | "institute_admin" | "platform_admin";

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  profile: MobileAccountProfile | null;
  hydrated: boolean;
  selectedSubject: string;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    profile: MobileAccountProfile;
  }) => void;
  clearSession: () => void;
  setSelectedSubject: (subject: string) => void;
  markHydrated: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  refreshToken: null,
  profile: null,
  hydrated: false,
  selectedSubject: "overall",
  setSession: ({ accessToken, refreshToken, profile }) =>
    set({ accessToken, refreshToken, profile }),
  clearSession: () =>
    set({
      accessToken: null,
      refreshToken: null,
      profile: null,
      selectedSubject: "overall",
    }),
  setSelectedSubject: (selectedSubject) => set({ selectedSubject }),
  markHydrated: () => set({ hydrated: true }),
}));
