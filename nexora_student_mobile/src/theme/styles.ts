import { Platform, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/theme/tokens";

const heroShadow = Platform.select({
  web: {
    boxShadow: "0px 12px 24px rgba(185, 202, 239, 0.18)",
  },
  default: {
    shadowColor: "#b9caef",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
});

const sectionShadow = Platform.select({
  web: {
    boxShadow: "0px 8px 18px rgba(202, 214, 240, 0.12)",
  },
  default: {
    shadowColor: "#cad6f0",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

const primaryButtonShadow = Platform.select({
  web: {
    boxShadow: "0px 8px 14px rgba(142, 176, 239, 0.24)",
  },
  default: {
    shadowColor: "#8eb0ef",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});

const formCardShadow = Platform.select({
  web: {
    boxShadow: "0px 8px 20px rgba(199, 213, 239, 0.12)",
  },
  default: {
    shadowColor: "#c7d5ef",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});

export const appStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
  },
  backgroundOrbTop: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.bgCanvasTint,
  },
  backgroundOrbMiddle: {
    position: "absolute",
    top: 240,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.bgWarmSoft,
    opacity: 0.55,
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.bgPrimarySoft,
    opacity: 0.75,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  pageStack: {
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.md,
    ...heroShadow,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgPrimarySoft,
    color: colors.bgPrimary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgWarmSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  column: {
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.md,
    ...sectionShadow,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  cardHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 118,
  },
  metricCardSoft: {
    backgroundColor: colors.bgSurfaceSoft,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgSurfaceSoft,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipPrimary: {
    backgroundColor: colors.bgPrimarySoft,
    borderColor: "#cfe0ff",
  },
  chipWarm: {
    backgroundColor: colors.bgWarmSoft,
    borderColor: "#f2dfb9",
  },
  chipSuccess: {
    backgroundColor: colors.bgSuccessSoft,
    borderColor: "#cfead7",
  },
  chipDanger: {
    backgroundColor: colors.bgDangerSoft,
    borderColor: "#f3d0ca",
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextPrimary: {
    color: colors.bgPrimary,
  },
  chipTextWarm: {
    color: colors.warning,
  },
  chipTextSuccess: {
    color: colors.success,
  },
  chipTextDanger: {
    color: colors.danger,
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    ...primaryButtonShadow,
  },
  secondaryButton: {
    minHeight: 50,
    backgroundColor: colors.bgSurfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: "#efb4aa",
    backgroundColor: colors.bgDangerSoft,
  },
  fieldStack: {
    gap: spacing.xs,
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    gap: spacing.md,
    ...formCardShadow,
  },
  formGrid: {
    gap: spacing.md,
  },
  formSection: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  formSectionHeader: {
    gap: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  listItem: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.xs,
  },
  listItemSoft: {
    backgroundColor: colors.bgSurfaceSoft,
  },
  productCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  optionCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionCardSelected: {
    backgroundColor: colors.bgPrimarySoft,
    borderColor: "#bfd4ff",
  },
  optionCardError: {
    borderColor: "#efb4aa",
    backgroundColor: colors.bgDangerSoft,
  },
  optionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  optionStateText: {
    color: colors.bgPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  optionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  questionStem: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
  },
  navButtonPill: {
    minHeight: 40,
    borderRadius: radius.full,
  },
  mutedPanel: {
    backgroundColor: colors.bgSurfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emphasisPanel: {
    backgroundColor: colors.bgPrimarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#cfe0ff",
    padding: spacing.md,
    gap: spacing.xs,
  },
  successPanel: {
    backgroundColor: colors.bgSuccessSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#cfead7",
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorPanel: {
    backgroundColor: colors.bgDangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#f3d0ca",
    padding: spacing.md,
    gap: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  mutedTextBlock: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
