import { ReactNode } from "react";
import { Text, View } from "react-native";
import { appStyles } from "@/theme/styles";

export function InfoCard({
  title,
  body,
  subtitle,
  footer,
}: {
  title: string;
  body: string;
  subtitle?: string;
  footer?: ReactNode;
}) {
  return (
    <View style={appStyles.sectionCard}>
      <View style={appStyles.cardHeader}>
        <Text style={appStyles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={appStyles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={appStyles.body}>{body}</Text>
      {footer}
    </View>
  );
}
