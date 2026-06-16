import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { MobileApiError } from "@/lib/api/client";
import { fetchRegisterOptions, registerStudent } from "@/lib/api/auth";
import { persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [board, setBoard] = useState("");
  const [examInterest, setExamInterest] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [helper, setHelper] = useState("Next step: connect this screen to register options and live public registration APIs.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const options = await fetchRegisterOptions();
        if (!active) return;
        setSchoolCode(options.public_institute.code);
        setClassLevel(options.class_levels[0] ?? "");
        setBoard(options.boards[0] ?? "");
        setExamInterest(options.student_exam_interests[0] ?? "");
        setHelper(
          `Public institute: ${options.public_institute.code} · Classes: ${options.class_levels.join(", ")} · Boards: ${options.boards.join(", ")}`,
        );
      } catch (error) {
        if (!active) return;
        setHelper(
          error instanceof Error
            ? error.message
            : "Unable to load registration options yet.",
        );
      }
    }
    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const response = await registerStudent({
        first_name: firstName,
        last_name: lastName,
        email,
        school_code: schoolCode,
        password,
        confirm_password: confirmPassword,
        class_level: classLevel,
        board,
        exam_interest: examInterest,
      });
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
          : "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Register"
        badge="Student-only release"
        title="Create your Nexora student account"
        description="This mobile MVP will register only student users, but the app architecture remains role-ready for future teacher, parent, institute, and admin lanes."
        helper={helper}
      />
      <View style={appStyles.formCard}>
        <View style={appStyles.cardHeader}>
          <Text style={appStyles.sectionTitle}>Quick onboarding</Text>
          <Text style={appStyles.sectionSubtitle}>Keep the form simple now, but still fully live and scalable for future role expansion.</Text>
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Student identity</Text>
            <Text style={appStyles.sectionSubtitle}>Capture the minimum learner profile required by the live registration flow.</Text>
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>First name</Text>
            <TextInput placeholder="Enter first name" style={appStyles.input} value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Last name</Text>
            <TextInput placeholder="Enter last name" style={appStyles.input} value={lastName} onChangeText={setLastName} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Email</Text>
            <TextInput autoCapitalize="none" placeholder="Enter email" style={appStyles.input} value={email} onChangeText={setEmail} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>School code</Text>
            <TextInput autoCapitalize="characters" placeholder="Enter school code" style={appStyles.input} value={schoolCode} onChangeText={setSchoolCode} />
          </View>
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Academic profile</Text>
            <Text style={appStyles.sectionSubtitle}>These values decide the student’s learning scope from day one.</Text>
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Class level</Text>
            <TextInput placeholder="Enter class level" style={appStyles.input} value={classLevel} onChangeText={setClassLevel} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Board</Text>
            <TextInput placeholder="Enter board" style={appStyles.input} value={board} onChangeText={setBoard} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Exam interest</Text>
            <TextInput placeholder="Enter exam interest" style={appStyles.input} value={examInterest} onChangeText={setExamInterest} />
          </View>
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Secure access</Text>
            <Text style={appStyles.sectionSubtitle}>Set the credentials that the student will use for mobile sign-in.</Text>
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Password</Text>
            <TextInput placeholder="Create password" secureTextEntry style={appStyles.input} value={password} onChangeText={setPassword} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Confirm password</Text>
            <TextInput placeholder="Confirm password" secureTextEntry style={appStyles.input} value={confirmPassword} onChangeText={setConfirmPassword} />
          </View>
        </View>
        {message ? <Text style={appStyles.errorText}>{message}</Text> : null}
        <ActionButton
          label={loading ? "Registering..." : "Register Student"}
          onPress={() => void submit()}
          disabled={
            loading ||
            !firstName.trim() ||
            !email.trim() ||
            !schoolCode.trim() ||
            !classLevel.trim() ||
            !board.trim() ||
            !examInterest.trim() ||
            !password.trim() ||
            !confirmPassword.trim()
          }
        />
        {!loading && !message && helper.toLowerCase().includes("unable to load") ? (
          <Text style={appStyles.warningText}>
            Registration options did not fully load. You can still try registering if you know the required values.
          </Text>
        ) : null}
      </View>
      <SectionBlock
        title="Already registered?"
        subtitle="Use your existing student account to continue on mobile"
        action={<ActionButton label="Go to Login" tone="secondary" onPress={() => router.push("/(auth)/login")} />}
      >
        <Text style={appStyles.body}>
          If the learner already exists in Nexora, there is no need to create a duplicate account. Login will restore the mobile session securely.
        </Text>
      </SectionBlock>
    </ScreenShell>
  );
}
