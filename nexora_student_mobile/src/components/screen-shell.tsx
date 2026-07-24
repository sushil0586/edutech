import { ReactNode, RefObject } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appStyles } from "@/theme/styles";

export function ScreenShell({
  children,
  scroll = true,
  scrollRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}) {
  if (!scroll) {
    return (
      <SafeAreaView style={appStyles.screen}>
        <View style={appStyles.backgroundLayer}>
          <View style={appStyles.backgroundOrbTop} />
          <View style={appStyles.backgroundOrbMiddle} />
          <View style={appStyles.backgroundOrbBottom} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={{ flex: 1 }}
        >
          <View style={[appStyles.scrollContent, { flex: 1 }]}>{children}</View>
        </KeyboardAvoidingView>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={appStyles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
