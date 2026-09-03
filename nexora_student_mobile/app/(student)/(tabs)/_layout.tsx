import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  dashboard: { active: "home", inactive: "home-outline" },
  exams: { active: "document-text", inactive: "document-text-outline" },
  attempts: { active: "timer", inactive: "timer-outline" },
  results: { active: "stats-chart", inactive: "stats-chart-outline" },
  analytics: { active: "analytics", inactive: "analytics-outline" },
  profile: { active: "person-circle", inactive: "person-circle-outline" },
};

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.bgPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderDefault,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 92 : 82,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 26 : 18,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = tabIcons[route.name] ?? tabIcons.dashboard;
          return <Ionicons name={focused ? icons.active : icons.inactive} size={20} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarButtonTestID: "student-tab-dashboard" }} />
      <Tabs.Screen name="exams" options={{ title: "Exams", tabBarButtonTestID: "student-tab-exams" }} />
      <Tabs.Screen name="attempts" options={{ title: "Attempts", tabBarButtonTestID: "student-tab-attempts" }} />
      <Tabs.Screen name="results" options={{ title: "Results", tabBarButtonTestID: "student-tab-results" }} />
      <Tabs.Screen name="analytics" options={{ title: "Insights", tabBarButtonTestID: "student-tab-analytics" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarButtonTestID: "student-tab-profile" }} />
    </Tabs>
  );
}
