import { ReactNode } from "react";
import { Text, View } from "react-native";
import { ActionButton } from "@/components/action-button";
import { appStyles } from "@/theme/styles";

export function StatePanel({
  tone = "neutral",
  title,
  body,
  action,
  footer,
}: {
  tone?: "neutral" | "success" | "warning" | "error";
  title: string;
  body: string;
  action?: {
    label: string;
    onPress?: () => void;
    tone?: "primary" | "secondary";
  };
  footer?: ReactNode;
}) {
  const panelStyle =
    tone === "success"
      ? appStyles.successPanel
      : tone === "warning"
        ? appStyles.emphasisPanel
        : tone === "error"
          ? appStyles.errorPanel
          : appStyles.mutedPanel;

  const textStyle =
    tone === "success"
      ? appStyles.successText
      : tone === "warning"
        ? appStyles.warningText
        : tone === "error"
          ? appStyles.errorText
          : appStyles.body;

  return (
    <View style={panelStyle}>
      <Text style={appStyles.sectionTitle}>{title}</Text>
      <Text style={textStyle}>{body}</Text>
      {action ? (
        <View style={appStyles.rowWrap}>
          <ActionButton
            label={action.label}
            onPress={action.onPress}
            tone={action.tone ?? "secondary"}
          />
        </View>
      ) : null}
      {footer}
    </View>
  );
}
