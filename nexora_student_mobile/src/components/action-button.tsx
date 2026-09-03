import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { appStyles } from "@/theme/styles";
import { colors } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const actionIconRules: Array<[RegExp, IconName]> = [
  [/resume/i, "play-circle-outline"],
  [/submit/i, "checkmark-circle-outline"],
  [/save/i, "save-outline"],
  [/open.*dashboard|dashboard/i, "home-outline"],
  [/open.*exam|exam/i, "document-text-outline"],
  [/attempt/i, "timer-outline"],
  [/result|summary/i, "stats-chart-outline"],
  [/review|mark/i, "flag-outline"],
  [/continue|next/i, "arrow-forward-outline"],
  [/previous|back/i, "arrow-back-outline"],
  [/clear|discard/i, "close-circle-outline"],
  [/logout/i, "log-out-outline"],
  [/register/i, "person-add-outline"],
  [/retry/i, "refresh-outline"],
];

function inferIcon(label: string): IconName | undefined {
  return actionIconRules.find(([pattern]) => pattern.test(label))?.[1];
}

export function ActionButton({
  label,
  tone = "primary",
  compact = false,
  icon,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  tone?: "primary" | "secondary";
  compact?: boolean;
  icon?: IconName | null;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const resolvedIcon = icon === null ? undefined : icon ?? inferIcon(label);
  const foregroundColor = tone === "primary" ? colors.textOnPrimary : colors.textPrimary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        tone === "primary" ? appStyles.primaryButton : appStyles.secondaryButton,
        compact ? appStyles.navButtonPill : null,
        disabled ? { opacity: 0.6 } : null,
        pressed && !disabled ? { opacity: 0.86, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={appStyles.buttonContent}>
        {resolvedIcon ? (
          <Ionicons
            name={resolvedIcon}
            size={compact ? 14 : 17}
            color={foregroundColor}
            style={appStyles.buttonIcon}
          />
        ) : null}
        <Text style={tone === "primary" ? appStyles.primaryButtonText : appStyles.secondaryButtonText}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
