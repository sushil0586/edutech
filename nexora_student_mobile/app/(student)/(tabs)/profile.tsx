import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { ScreenShell } from "@/components/screen-shell";
import { HeroCard } from "@/components/hero-card";
import { ActionButton } from "@/components/action-button";
import { MetricCard } from "@/components/metric-card";
import { SectionBlock } from "@/components/section-block";
import { StatePanel } from "@/components/state-panel";
import { fetchStudentDashboardBundle } from "@/lib/api/student";
import { clearPersistedSession } from "@/lib/secure-session";
import { useSessionStore } from "@/store/session-store";
import { appStyles } from "@/theme/styles";

export default function ProfileScreen() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const profile = useSessionStore((state) => state.profile);
  const clearSession = useSessionStore((state) => state.clearSession);
  const query = useQuery({
    queryKey: ["student.profile.bundle", accessToken],
    queryFn: async () => fetchStudentDashboardBundle(accessToken as string),
    enabled: Boolean(accessToken),
  });

  const wallet = query.data?.wallet ?? null;
  const summary = query.data?.summary ?? null;
  const studentContext = profile?.student_context ?? null;

  async function handleLogout() {
    await clearPersistedSession();
    clearSession();
    router.replace("/(auth)/role-gate");
  }

  return (
    <ScreenShell>
      <HeroCard
        eyebrow="Student Profile"
        badge={profile?.role ?? "student"}
        title={studentContext?.full_name || profile?.display_name || "Student account"}
        description={
          studentContext
            ? `${studentContext.program_name} · ${studentContext.academic_year_name}${studentContext.cohort_name ? ` · ${studentContext.cohort_name}` : ""}`
            : "Profile details are restored from the live student session."
        }
        helper={profile?.email || profile?.username || "No identity details available."}
        actions={
          <View style={appStyles.rowWrap}>
            <ActionButton label="Open Dashboard" onPress={() => router.push("/(student)/(tabs)/dashboard")} />
            <ActionButton label="Logout" tone="secondary" onPress={() => void handleLogout()} />
          </View>
        }
      />
      {query.isError ? (
        <StatePanel
          tone="warning"
          title="Profile metrics unavailable"
          body={query.error instanceof Error ? query.error.message : "Core account details are available, but live profile metrics could not be loaded."}
          action={{ label: "Retry", onPress: () => void query.refetch() }}
        />
      ) : null}

      <View style={appStyles.metricGrid}>
        <MetricCard
          label="Stars"
          value={wallet ? wallet.available_stars.toLocaleString("en-IN") : "--"}
          helper="Current available balance"
          soft
        />
        <MetricCard
          label="Average"
          value={summary ? `${summary.average_percentage}%` : "--"}
          helper="Latest learning average"
        />
        <MetricCard
          label="Accuracy"
          value={summary ? `${summary.accuracy_percentage}%` : "--"}
          helper="Live accuracy signal"
          soft
        />
        <MetricCard
          label="Referral"
          value={studentContext?.referral_code || "--"}
          helper="Student referral code"
        />
      </View>

      <SectionBlock
        title="Account details"
        subtitle="Core learner identity restored from the active session"
      >
        <View style={appStyles.column}>
          <View style={appStyles.productCard}>
            <Text style={appStyles.label}>Username</Text>
            <Text style={appStyles.body}>{profile?.username || "--"}</Text>
          </View>
          <View style={appStyles.productCard}>
            <Text style={appStyles.label}>Email</Text>
            <Text style={appStyles.body}>{profile?.email || "--"}</Text>
          </View>
          <View style={appStyles.productCard}>
            <Text style={appStyles.label}>Program context</Text>
            <Text style={appStyles.body}>
              {studentContext
                ? `${studentContext.program_name} · ${studentContext.academic_year_name}${studentContext.cohort_name ? ` · ${studentContext.cohort_name}` : ""}`
                : "No student context returned."}
            </Text>
          </View>
        </View>
      </SectionBlock>

      <SectionBlock
        title="Subject access"
        subtitle="Current learner scope available for dashboard and exam lanes"
      >
        {studentContext?.subject_options?.length ? (
          <View style={appStyles.rowWrap}>
            {studentContext.subject_options.map((subject) => (
              <View key={subject.value} style={[appStyles.chip, appStyles.chipPrimary]}>
                <Text style={[appStyles.chipText, appStyles.chipTextPrimary]}>{subject.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <StatePanel
            title="No subject scope returned"
            body="No subject options were returned for this student account yet."
          />
        )}
      </SectionBlock>
    </ScreenShell>
  );
}
