import { Text, View } from "react-native";
import { SkeletonLine } from "@/components/skeleton";
import { appStyles } from "@/theme/styles";

export function MetricCard({
  label,
  value,
  helper,
  soft = false,
  loading = false,
}: {
  label: string;
  value: string;
  helper: string;
  soft?: boolean;
  loading?: boolean;
}) {
  return (
    <View style={[appStyles.metricCard, soft ? appStyles.metricCardSoft : null]}>
      {loading ? (
        <>
          <SkeletonLine width="64%" height={13} />
          <SkeletonLine width="52%" height={28} soft />
          <SkeletonLine width="88%" height={12} />
        </>
      ) : (
        <>
          <Text style={appStyles.metricLabel}>{label}</Text>
          <Text style={appStyles.metricValue}>{value}</Text>
          <Text numberOfLines={3} style={appStyles.helper}>{helper}</Text>
        </>
      )}
    </View>
  );
}
