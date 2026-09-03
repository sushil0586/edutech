import type { DimensionValue } from "react-native";
import { View } from "react-native";
import { appStyles } from "@/theme/styles";
import { spacing } from "@/theme/tokens";

export function SkeletonLine({
  width = "100%",
  height = 14,
  soft = false,
}: {
  width?: DimensionValue;
  height?: number;
  soft?: boolean;
}) {
  return (
    <View
      style={[
        appStyles.skeletonBlock,
        soft ? appStyles.skeletonBlockSoft : null,
        { width, height },
      ]}
    />
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={appStyles.metricGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          // Static skeleton content has no backend id; index is stable for this placeholder count.
          key={index}
          style={[appStyles.metricCard, index % 2 === 0 ? appStyles.metricCardSoft : null]}
        >
          <SkeletonLine width="64%" height={13} />
          <SkeletonLine width="52%" height={28} soft />
          <SkeletonLine width="88%" height={12} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={appStyles.skeletonListBody}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={appStyles.productCard}>
          <View style={appStyles.rowBetween}>
            <SkeletonLine width="58%" height={16} />
            <SkeletonLine width={90} height={30} soft />
          </View>
          <SkeletonLine width="72%" height={14} />
          <SkeletonLine width="92%" height={12} soft />
          <View style={appStyles.skeletonListActions}>
            <SkeletonLine width={112} height={38} />
            <SkeletonLine width={92} height={38} soft />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonFormFields({ count = 2 }: { count?: number }) {
  return (
    <View style={[appStyles.column, { gap: spacing.md }]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={appStyles.fieldStack}>
          <SkeletonLine width="34%" height={13} />
          <SkeletonLine width="100%" height={52} soft />
        </View>
      ))}
    </View>
  );
}
