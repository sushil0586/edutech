import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { MobileApiError } from "@/lib/api/client";
import { loginStudent } from "@/lib/api/auth";
import { persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await loginStudent({ username, password });
      await persistSession({
        accessToken: response.access,
        refreshToken: response.refresh,
        profile: response.user,
      });
      setSession({
        accessToken: response.access,
        refreshToken: response.refresh,
        profile: response.user,
      });
      router.replace("/(auth)/role-gate");
    } catch (error) {
      setMessage(
        error instanceof MobileApiError || error instanceof Error
          ? error.message
          : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Login"
        badge="Nexora Mobile"
        title="Sign in and continue learning"
        description="The student lane is the only mobile implementation in scope right now. Role branching will happen after authentication through a shared role gate."
        helper="Use your existing student credentials. After sign-in, the role gate restores the right mobile lane automatically."
      />
      <View style={appStyles.formCard}>
        <View style={appStyles.cardHeader}>
          <Text style={appStyles.sectionTitle}>Welcome back</Text>
          <Text style={appStyles.sectionSubtitle}>Minimal friction, live authentication, and direct entry into the student workspace.</Text>
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Account access</Text>
            <Text style={appStyles.sectionSubtitle}>Use the same credentials the student already uses in Nexora.</Text>
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Username</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Enter username"
              style={appStyles.input}
              value={username}
              onChangeText={setUsername}
            />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Password</Text>
            <TextInput
              placeholder="Enter password"
              secureTextEntry
              style={appStyles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>
        {message ? <Text style={appStyles.errorText}>{message}</Text> : null}
        <ActionButton
          label={loading ? "Signing in..." : "Login"}
          onPress={() => void submit()}
          disabled={loading || !username.trim() || !password.trim()}
        />
      </View>
      <SectionBlock
        title="First time here?"
        subtitle="Registration stays student-only in the first mobile release"
        action={<ActionButton label="Register" tone="secondary" onPress={() => router.push("/(auth)/register")} />}
      >
        <Text style={appStyles.body}>
          Create a student account, then the same role gate will bring you into the mobile dashboard, exam flow, and analytics lane.
        </Text>
      </SectionBlock>
    </ScreenShell>
  );
}
