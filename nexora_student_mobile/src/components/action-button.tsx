import { Pressable, Text } from "react-native";
import { appStyles } from "@/theme/styles";

export function ActionButton({
  label,
  tone = "primary",
  compact = false,
  onPress,
  disabled = false,
}: {
  label: string;
  tone?: "primary" | "secondary";
  compact?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        tone === "primary" ? appStyles.primaryButton : appStyles.secondaryButton,
        compact ? appStyles.navButtonPill : null,
        disabled ? { opacity: 0.6 } : null,
      ]}
    >
      <Text style={tone === "primary" ? appStyles.primaryButtonText : appStyles.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}
