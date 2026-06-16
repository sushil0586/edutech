import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { isApiConfigured } from "@/lib/config";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

export default function RoleGateScreen() {
  const router = useRouter();
  const profile = useSessionStore((state) => state.profile);
  const { hydrated, bootError } = useSessionBootstrap();

  if (!hydrated) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Role Gate"
          badge="Secure restore"
          title="Restoring mobile session"
          description="Checking secure storage and validating the current account profile before choosing the correct app lane."
        />
      </ScreenShell>
    );
  }

  if (profile?.role === "student") {
    return <Redirect href="/(student)/(tabs)/dashboard" />;
  }

  if (profile) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Role Gate"
          badge={profile.role}
          title="This mobile build supports only the student lane"
          description="The architecture is role-ready, but only student register, login, dashboard, take-exam, and analytics are in first-release scope."
          helper={`Authenticated role: ${profile.role}`}
        />
        <SectionBlock
          title="Use the currently supported lane"
          subtitle="This mobile build is limited intentionally during the first release cycle"
        >
          <Text style={appStyles.body}>
            Sign out here and continue with a student account, or use the web platform for this role until the mobile lane is implemented.
          </Text>
          <View style={appStyles.rowWrap}>
            <ActionButton label="Open Login" onPress={() => router.replace("/(auth)/login")} />
          </View>
        </SectionBlock>
      </ScreenShell>
    );
  }

  if (!isApiConfigured()) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Configuration"
          badge="Setup needed"
          title="Set EXPO_PUBLIC_API_BASE_URL before wiring live auth"
          description="This route is the mobile role resolver. Once the API base URL and auth integration are connected, it should decide whether the student enters the student app or sees a controlled unsupported-role state."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Role Gate"
        badge="Student mobile MVP"
        title="No active mobile session yet"
        description="When auth is connected, this route should inspect the secure session, resolve the role, and continue only into the student app for the current mobile MVP."
        helper={bootError ?? "Continue with login or registration to enter the student mobile experience."}
      />
      {bootError ? (
        <View style={appStyles.errorPanel}>
          <Text style={appStyles.errorText}>{bootError}</Text>
        </View>
      ) : null}
      <SectionBlock
        title="Continue into the student lane"
        subtitle="Choose the shortest path into the live mobile experience"
      >
        <Text style={appStyles.body}>Continue with register or login to enter the student lane.</Text>
        <View style={appStyles.rowWrap}>
          <ActionButton label="Login" onPress={() => router.push("/(auth)/login")} />
          <ActionButton label="Register" tone="secondary" onPress={() => router.push("/(auth)/register")} />
        </View>
      </SectionBlock>
    </ScreenShell>
  );
}
