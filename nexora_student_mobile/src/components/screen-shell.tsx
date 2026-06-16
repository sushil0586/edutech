import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appStyles } from "@/theme/styles";

export function ScreenShell({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) {
    return (
      <SafeAreaView style={appStyles.screen}>
        <View style={appStyles.backgroundLayer}>
          <View style={appStyles.backgroundOrbTop} />
          <View style={appStyles.backgroundOrbMiddle} />
          <View style={appStyles.backgroundOrbBottom} />
        </View>
        <View style={[appStyles.scrollContent, { flex: 1 }]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={appStyles.screen}>
      <View style={appStyles.backgroundLayer}>
        <View style={appStyles.backgroundOrbTop} />
        <View style={appStyles.backgroundOrbMiddle} />
        <View style={appStyles.backgroundOrbBottom} />
      </View>
      <ScrollView contentContainerStyle={appStyles.scrollContent}>{children}</ScrollView>
    </SafeAreaView>
  );
}
