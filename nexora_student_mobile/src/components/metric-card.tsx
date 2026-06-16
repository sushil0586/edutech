import { Text, View } from "react-native";
import { appStyles } from "@/theme/styles";

export function MetricCard({
  label,
  value,
  helper,
  soft = false,
}: {
  label: string;
  value: string;
  helper: string;
  soft?: boolean;
}) {
  return (
    <View style={[appStyles.metricCard, soft ? appStyles.metricCardSoft : null]}>
      <Text style={appStyles.metricLabel}>{label}</Text>
      <Text style={appStyles.metricValue}>{value}</Text>
      <Text style={appStyles.helper}>{helper}</Text>
    </View>
  );
}
