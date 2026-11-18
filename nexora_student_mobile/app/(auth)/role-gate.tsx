import { Redirect, useRouter } from "expo-router";
import { Linking, Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { isApiConfigured, WEB_PORTAL_URL } from "@/lib/config";
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
          eyebrow="Welcome back"
          badge="Secure session"
          title="Restoring mobile session"
          description="Checking your saved account so you can continue where you left off."
        />
      </ScreenShell>
    );
  }

  const needsWebProfileCompletion = Boolean(
    profile?.profile_completion_required ||
      profile?.onboarding_status === "not_started" ||
      profile?.onboarding_status === "in_progress",
  );

  if (profile?.role === "student" && !needsWebProfileCompletion) {
    return <Redirect href="/(student)/(tabs)/dashboard" />;
  }

  if (profile?.role === "student" && needsWebProfileCompletion) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Finish setup"
          badge="Student account"
          title="Complete your student profile on the web"
          description="This login is valid, but the learner profile still needs required school and program details before mobile exams can open."
        />
        <SectionBlock title="Complete profile" subtitle="Return here after finishing the required details">
          <Text style={appStyles.body}>
            Open the secure web profile form, complete setup, then sign in again on this app.
          </Text>
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Open Web Profile"
              onPress={() => void Linking.openURL(`${WEB_PORTAL_URL}/complete-profile`)}
              testID="role-gate-complete-profile-button"
            />
            <ActionButton
              label="Back to Login"
              tone="secondary"
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        </SectionBlock>
      </ScreenShell>
    );
  }

  if (profile) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Account access"
          badge={profile.role}
          title="Use the web portal for this account"
          description="This account role is available on the Nexora web portal. The mobile app currently supports student accounts."
          helper={`Signed in as: ${profile.role}`}
        />
        <SectionBlock
          title="Continue with a student account"
          subtitle="Sign in on the web portal to use this role"
        >
          <Text style={appStyles.body}>
            Return to login to use a student account, or continue on the web portal with this account.
          </Text>
          <View style={appStyles.rowWrap}>
            <ActionButton
              label="Open Web Portal"
              onPress={() =>
                void Linking.openURL(`${WEB_PORTAL_URL}/login?role=${profile.role}`)
              }
              testID="role-gate-open-web-button"
            />
            <ActionButton
              label="Open Login"
              tone="secondary"
              onPress={() => router.replace("/(auth)/login")}
              testID="role-gate-open-login-button"
            />
          </View>
        </SectionBlock>
      </ScreenShell>
    );
  }

  if (!isApiConfigured()) {
    return (
      <ScreenShell>
        <HeroCard
          eyebrow="Service unavailable"
          badge="Connection needed"
          title="Nexora mobile is not configured"
          description="The app cannot reach the account service. Contact your administrator or try again after the service is configured."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student access"
        badge="Nexora Mobile"
        title="No active mobile session yet"
        description="Sign in to open your assigned exams, results, and learning progress."
        helper={bootError ?? "Log in with an existing student account or register a new one."}
      />
      {bootError ? (
        <View style={appStyles.errorPanel}>
          <Text style={appStyles.errorText}>{bootError}</Text>
        </View>
      ) : null}
      <SectionBlock
        title="Continue as a student"
        subtitle="Choose login or create a new account"
      >
        <Text style={appStyles.body}>Use your student credentials to continue securely.</Text>
        <View style={appStyles.rowWrap}>
          <ActionButton
            label="Login"
            onPress={() => router.push("/(auth)/login")}
            testID="role-gate-login-button"
          />
          <ActionButton
            label="Register"
            tone="secondary"
            onPress={() => router.push("/(auth)/register")}
            testID="role-gate-register-button"
          />
        </View>
      </SectionBlock>
    </ScreenShell>
  );
}
