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

function friendlyLoginError(error: MobileApiError | Error) {
  const rawMessage = error.message.toLowerCase();

  if (rawMessage.includes("network request failed")) {
    return "We could not reach the Nexora server. Check your internet connection and try again.";
  }

  if (rawMessage.includes("invalid") || rawMessage.includes("credential") || rawMessage.includes("password")) {
    return "The username or password does not match. Please check the student credentials and try again.";
  }

  if (rawMessage.includes("inactive")) {
    return "This account is currently inactive. Please contact your institute or platform administrator.";
  }

  return error.message || "Login failed. Please try again.";
}

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!username.trim()) nextErrors.username = "Username is required.";
    if (!password.trim()) nextErrors.password = "Password is required.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (!validateForm()) {
      setMessage("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});
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
      if (error instanceof MobileApiError) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(friendlyLoginError(error));
      } else if (error instanceof Error) {
        setMessage(friendlyLoginError(error));
      } else {
        setMessage("Login failed.");
      }
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
              style={[appStyles.input, fieldErrors.username ? appStyles.inputError : null]}
              value={username}
              onChangeText={setUsername}
            />
            {fieldErrors.username ? <Text style={appStyles.fieldError}>{fieldErrors.username}</Text> : null}
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Password</Text>
            <TextInput
              placeholder="Enter password"
              secureTextEntry
              style={[appStyles.input, fieldErrors.password ? appStyles.inputError : null]}
              value={password}
              onChangeText={setPassword}
            />
            {fieldErrors.password ? <Text style={appStyles.fieldError}>{fieldErrors.password}</Text> : null}
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
