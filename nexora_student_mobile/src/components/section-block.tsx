import { ReactNode } from "react";
import { Text, View } from "react-native";
import { appStyles } from "@/theme/styles";

export function SectionBlock({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={appStyles.sectionCard}>
      <View style={appStyles.cardHeaderCompact}>
        <View style={appStyles.cardHeader}>
          <Text style={appStyles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={appStyles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}
