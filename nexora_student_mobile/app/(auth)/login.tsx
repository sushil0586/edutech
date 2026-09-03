import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { MobileApiError, getLatestMobileApiTrace } from "@/lib/api/client";
import { loginStudent } from "@/lib/api/auth";
import { API_BASE_URL, API_REQUEST_TIMEOUT_MS, SHOW_MOBILE_DEBUG_PANEL } from "@/lib/config";
import { persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function friendlyLoginError(error: MobileApiError | Error) {
  const rawMessage = error.message.toLowerCase();

  if (rawMessage.includes("network request failed") || rawMessage.includes("took too long")) {
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
  const [debugState, setDebugState] = useState("idle");
  const [debugError, setDebugError] = useState("");

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
    setDebugState("submit:start");
    setDebugError("");
    try {
      if (__DEV__) {
        console.log("[login] submit:start", { username });
      }
      setDebugState("request:loginStudent");
      const response = await loginStudent({ username, password });
      if (__DEV__) {
        console.log("[login] request:success", {
          username: response.user.username,
          role: response.user.role,
        });
      }
      setDebugState("request:success");
      await persistSession({
        accessToken: response.access,
        refreshToken: response.refresh,
        profile: response.user,
      });
      if (__DEV__) {
        console.log("[login] persistSession:success", {
          username: response.user.username,
          role: response.user.role,
        });
      }
      setDebugState("session:persisted");
      setSession({
        accessToken: response.access,
        refreshToken: response.refresh,
        profile: response.user,
      });
      if (__DEV__) {
        console.log("[login] session-store:setSession", {
          username: response.user.username,
          role: response.user.role,
        });
        console.log("[login] router:replace", { href: "/(auth)/role-gate" });
      }
      setDebugState("session:stored");
      router.replace("/(auth)/role-gate");
    } catch (error) {
      setDebugState("request:failed");
      if (error instanceof MobileApiError) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(friendlyLoginError(error));
        setDebugError(error.message);
      } else if (error instanceof Error) {
        setMessage(friendlyLoginError(error));
        setDebugError(error.message);
      } else {
        setMessage("Login failed.");
        setDebugError("Login failed.");
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
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              textContentType="username"
              placeholder="Enter username"
              style={[appStyles.input, fieldErrors.username ? appStyles.inputError : null]}
              testID="login-username-input"
              value={username}
              onChangeText={setUsername}
            />
            {fieldErrors.username ? <Text style={appStyles.fieldError}>{fieldErrors.username}</Text> : null}
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              placeholder="Enter password"
              secureTextEntry
              returnKeyType="done"
              textContentType="password"
              style={[appStyles.input, fieldErrors.password ? appStyles.inputError : null]}
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
            />
            {fieldErrors.password ? <Text style={appStyles.fieldError}>{fieldErrors.password}</Text> : null}
          </View>
        </View>
        {message ? <Text style={appStyles.errorText}>{message}</Text> : null}
        {SHOW_MOBILE_DEBUG_PANEL ? (
          <View style={appStyles.errorPanel}>
            <Text style={appStyles.label}>Dev Debug</Text>
            <Text style={appStyles.helper}>API base URL: {API_BASE_URL || "(not set)"}</Text>
            <Text style={appStyles.helper}>Request timeout: {API_REQUEST_TIMEOUT_MS}ms</Text>
            <Text style={appStyles.helper}>UI state: {debugState}</Text>
            {debugError ? <Text style={appStyles.helper}>UI error: {debugError}</Text> : null}
            {getLatestMobileApiTrace() ? (
              <>
                <Text style={appStyles.helper}>API phase: {getLatestMobileApiTrace()?.phase}</Text>
                <Text style={appStyles.helper}>API method: {getLatestMobileApiTrace()?.method}</Text>
                <Text style={appStyles.helper}>API URL: {getLatestMobileApiTrace()?.url}</Text>
                {typeof getLatestMobileApiTrace()?.status === "number" ? (
                  <Text style={appStyles.helper}>API status: {getLatestMobileApiTrace()?.status}</Text>
                ) : null}
                {getLatestMobileApiTrace()?.message ? (
                  <Text style={appStyles.helper}>API message: {getLatestMobileApiTrace()?.message}</Text>
                ) : null}
                {getLatestMobileApiTrace()?.errorName ? (
                  <Text style={appStyles.helper}>
                    API error: {getLatestMobileApiTrace()?.errorName} {getLatestMobileApiTrace()?.errorMessage ?? ""}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={appStyles.helper}>API phase: no request yet</Text>
            )}
          </View>
        ) : null}
        <ActionButton
          label={loading ? "Signing in..." : "Login"}
          onPress={() => void submit()}
          disabled={loading || !username.trim() || !password.trim()}
          testID="login-submit-button"
        />
      </View>
      <SectionBlock
        title="First time here?"
        subtitle="Registration stays student-only in the first mobile release"
        action={<ActionButton label="Register" tone="secondary" onPress={() => router.push("/(auth)/register")} testID="login-register-button" />}
      >
        <Text style={appStyles.body}>
          Create a student account, then the same role gate will bring you into the mobile dashboard, exam flow, and analytics lane.
        </Text>
      </SectionBlock>
    </ScreenShell>
  );
}
