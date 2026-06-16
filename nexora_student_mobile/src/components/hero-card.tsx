import { ReactNode } from "react";
import { Text, View } from "react-native";
import { appStyles } from "@/theme/styles";

export function HeroCard({
  eyebrow,
  title,
  description,
  helper,
  badge,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  helper?: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <View style={appStyles.heroCard}>
      <View style={appStyles.heroMetaRow}>
        <Text style={appStyles.eyebrow}>{eyebrow}</Text>
        {badge ? (
          <View style={appStyles.heroBadge}>
            <Text style={appStyles.heroBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={appStyles.title}>{title}</Text>
      <Text style={appStyles.body}>{description}</Text>
      {helper ? <Text style={appStyles.helper}>{helper}</Text> : null}
      {actions ? <View style={appStyles.rowWrap}>{actions}</View> : null}
    </View>
  );
}
