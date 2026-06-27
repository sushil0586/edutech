import { Tabs } from "expo-router";
import { colors } from "@/theme/tokens";

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.bgPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderDefault,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="exams" options={{ title: "Exams" }} />
      <Tabs.Screen name="attempts" options={{ title: "Attempts" }} />
      <Tabs.Screen name="results" options={{ title: "Results" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
