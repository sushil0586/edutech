import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { MobileApiError } from "@/lib/api/client";
import { fetchRegisterOptions, registerStudent } from "@/lib/api/auth";
import { persistSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

function friendlyRegisterError(error: MobileApiError | Error) {
  const rawMessage = error.message.toLowerCase();

  if (rawMessage.includes("network request failed") || rawMessage.includes("took too long")) {
    return "We could not reach the Nexora server. Check your internet connection and try again.";
  }

  if (rawMessage.includes("email")) {
    return "This email looks unavailable or already in use. Please verify it or use a different one.";
  }

  if (rawMessage.includes("password")) {
    return "Please review the password fields and make sure they match the required rules.";
  }

  if (rawMessage.includes("school") || rawMessage.includes("institute")) {
    return "The school or institute code does not look valid for this registration flow.";
  }

  return error.message || "Registration failed. Please review the form and try again.";
}

function friendlyRegisterOptionsError(error: unknown) {
  if (error instanceof MobileApiError) {
    return friendlyRegisterError(error);
  }

  if (error instanceof Error) {
    return friendlyRegisterError(error);
  }

  return "Unable to load registration options yet.";
}

function SelectionField({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (nextValue: string) => void;
  error?: string;
}) {
  return (
    <View style={appStyles.fieldStack}>
      <Text style={appStyles.label}>{label}</Text>
      <View style={appStyles.rowWrap}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[
                appStyles.optionCard,
                selected ? appStyles.optionCardSelected : null,
                error ? appStyles.optionCardError : null,
              ]}
            >
              <View style={appStyles.optionCardHeader}>
                <Text style={appStyles.optionMeta}>{selected ? "Selected" : "Tap to choose"}</Text>
              </View>
              <Text style={appStyles.body}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={appStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

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
  const [classLevelOptions, setClassLevelOptions] = useState<string[]>([]);
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [examInterestOptions, setExamInterestOptions] = useState<string[]>([]);
  const [suggestedSchoolCode, setSuggestedSchoolCode] = useState("");
  const [helper, setHelper] = useState("Next step: connect this screen to register options and live public registration APIs.");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsLoadError, setOptionsLoadError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsLoadError("");
      try {
        const options = await fetchRegisterOptions();
        if (!active) return;
        setSuggestedSchoolCode(options.public_institute.code);
        setSchoolCode(options.public_institute.code);
        setClassLevelOptions(options.class_levels);
        setBoardOptions(options.boards);
        setExamInterestOptions(options.student_exam_interests);
        setClassLevel(options.class_levels[0] ?? "");
        setBoard(options.boards[0] ?? "");
        setExamInterest(options.student_exam_interests[0] ?? "");
        setHelper(
          `Public institute: ${options.public_institute.code} · Classes: ${options.class_levels.join(", ")} · Boards: ${options.boards.join(", ")}`,
        );
      } catch (error) {
        if (!active) return;
        const friendlyMessage = friendlyRegisterOptionsError(error);
        setOptionsLoadError(friendlyMessage);
        setHelper(friendlyMessage);
      } finally {
        if (active) {
          setOptionsLoading(false);
        }
      }
    }
    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!firstName.trim()) nextErrors.first_name = "First name is required.";
    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!schoolCode.trim()) nextErrors.school_code = "School code is required.";
    if (!classLevel.trim()) nextErrors.class_level = "Choose a class level.";
    if (!board.trim()) nextErrors.board = "Choose a board.";
    if (!examInterest.trim()) nextErrors.exam_interest = "Choose an exam interest.";
    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (password.trim().length < 8) {
      nextErrors.password = "Password should be at least 8 characters.";
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirm_password = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirm_password = "Password and confirm password must match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (!validateForm()) {
      setMessage("Please fix the highlighted fields before continuing.");
      return;
    }

    if (!classLevelOptions.length || !boardOptions.length || !examInterestOptions.length) {
      setMessage("Registration options are still loading or unavailable. Retry the setup step first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setFieldErrors({});
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
      if (error instanceof MobileApiError) {
        setFieldErrors(error.fieldErrors ?? {});
        setMessage(friendlyRegisterError(error));
      } else if (error instanceof Error) {
        setMessage(friendlyRegisterError(error));
      } else {
        setMessage("Registration failed.");
      }
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
      {optionsLoadError ? (
        <StatePanel
          tone="warning"
          title="Registration setup needs attention"
          body={optionsLoadError}
          action={{
            label: optionsLoading ? "Loading..." : "Retry setup",
            onPress: () => {
              if (!optionsLoading) {
                setOptionsLoadError("");
                setHelper("Reloading registration options...");
                void (async () => {
                  try {
                    setOptionsLoading(true);
                    const options = await fetchRegisterOptions();
                    setSuggestedSchoolCode(options.public_institute.code);
                    setSchoolCode(options.public_institute.code);
                    setClassLevelOptions(options.class_levels);
                    setBoardOptions(options.boards);
                    setExamInterestOptions(options.student_exam_interests);
                    setClassLevel(options.class_levels[0] ?? "");
                    setBoard(options.boards[0] ?? "");
                    setExamInterest(options.student_exam_interests[0] ?? "");
                    setHelper(
                      `Public institute: ${options.public_institute.code} · Classes: ${options.class_levels.join(", ")} · Boards: ${options.boards.join(", ")}`,
                    );
                    setOptionsLoadError("");
                  } catch (error) {
                    setOptionsLoadError(friendlyRegisterOptionsError(error));
                  } finally {
                    setOptionsLoading(false);
                  }
                })();
              }
            },
            tone: "secondary",
          }}
        />
      ) : null}
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
            <TextInput
              placeholder="Enter first name"
              style={[appStyles.input, fieldErrors.first_name ? appStyles.inputError : null]}
              testID="register-first-name-input"
              value={firstName}
              onChangeText={setFirstName}
            />
            {fieldErrors.first_name ? <Text style={appStyles.fieldError}>{fieldErrors.first_name}</Text> : null}
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Last name</Text>
            <TextInput placeholder="Enter last name" style={appStyles.input} value={lastName} onChangeText={setLastName} />
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter email"
              style={[appStyles.input, fieldErrors.email ? appStyles.inputError : null]}
              testID="register-email-input"
              value={email}
              onChangeText={setEmail}
            />
            {fieldErrors.email ? <Text style={appStyles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>School code</Text>
            <TextInput
              autoCapitalize="characters"
              placeholder="Enter school code"
              style={[appStyles.input, fieldErrors.school_code ? appStyles.inputError : null]}
              testID="register-school-code-input"
              value={schoolCode}
              onChangeText={setSchoolCode}
            />
            <Text style={appStyles.fieldHint}>
              This should usually match the public institute code suggested by the backend.
            </Text>
            {suggestedSchoolCode ? (
              <View style={appStyles.rowWrap}>
                <ActionButton
                  label={`Use ${suggestedSchoolCode}`}
                  tone="secondary"
                  compact
                  onPress={() => setSchoolCode(suggestedSchoolCode)}
                  testID="register-use-suggested-school-code-button"
                />
              </View>
            ) : null}
            {fieldErrors.school_code ? <Text style={appStyles.fieldError}>{fieldErrors.school_code}</Text> : null}
          </View>
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Academic profile</Text>
            <Text style={appStyles.sectionSubtitle}>These values decide the student’s learning scope from day one.</Text>
          </View>
          <SelectionField
            label="Class level"
            options={classLevelOptions}
            value={classLevel}
            onChange={setClassLevel}
            error={fieldErrors.class_level}
          />
          <SelectionField
            label="Board"
            options={boardOptions}
            value={board}
            onChange={setBoard}
            error={fieldErrors.board}
          />
          <SelectionField
            label="Exam interest"
            options={examInterestOptions}
            value={examInterest}
            onChange={setExamInterest}
            error={fieldErrors.exam_interest}
          />
        </View>
        <View style={appStyles.formSection}>
          <View style={appStyles.formSectionHeader}>
            <Text style={appStyles.label}>Secure access</Text>
            <Text style={appStyles.sectionSubtitle}>Set the credentials that the student will use for mobile sign-in.</Text>
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Password</Text>
            <TextInput
              placeholder="Create password"
              secureTextEntry
              style={[appStyles.input, fieldErrors.password ? appStyles.inputError : null]}
              testID="register-password-input"
              value={password}
              onChangeText={setPassword}
            />
            <Text style={appStyles.fieldHint}>Use at least 8 characters so the student can sign in reliably later.</Text>
            {fieldErrors.password ? <Text style={appStyles.fieldError}>{fieldErrors.password}</Text> : null}
          </View>
          <View style={appStyles.fieldStack}>
            <Text style={appStyles.label}>Confirm password</Text>
            <TextInput
              placeholder="Confirm password"
              secureTextEntry
              style={[appStyles.input, fieldErrors.confirm_password ? appStyles.inputError : null]}
              testID="register-confirm-password-input"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {fieldErrors.confirm_password ? <Text style={appStyles.fieldError}>{fieldErrors.confirm_password}</Text> : null}
          </View>
        </View>
        {message ? <Text style={appStyles.errorText}>{message}</Text> : null}
        <ActionButton
          label={optionsLoading ? "Loading setup..." : loading ? "Registering..." : "Register Student"}
          onPress={() => void submit()}
          disabled={
            optionsLoading ||
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
          testID="register-submit-button"
        />
        {!loading && !optionsLoading && !message && helper.toLowerCase().includes("unable to load") ? (
          <Text style={appStyles.warningText}>
            Registration options did not fully load. You can still try registering if you know the required values.
          </Text>
        ) : null}
      </View>
      <SectionBlock
        title="Already registered?"
        subtitle="Use your existing student account to continue on mobile"
        action={<ActionButton label="Go to Login" tone="secondary" onPress={() => router.push("/(auth)/login")} testID="register-go-to-login-button" />}
      >
        <Text style={appStyles.body}>
          If the learner already exists in Nexora, there is no need to create a duplicate account. Login will restore the mobile session securely.
        </Text>
      </SectionBlock>
    </ScreenShell>
  );
}
