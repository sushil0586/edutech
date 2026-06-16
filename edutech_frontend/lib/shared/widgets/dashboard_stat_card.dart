import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/widgets/kpi_card_component.dart';
import 'package:flutter/material.dart';

class DashboardStatCard extends StatelessWidget {
  const DashboardStatCard({
    required this.label,
    required this.value,
    super.key,
    this.helper,
    this.icon,
    this.tint,
  });

  final String label;
  final String value;
  final String? helper;
  final IconData? icon;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    return KpiCardComponent(
      label: label,
      value: value,
      icon: icon,
      helper: helper,
      variant: _variantFromColor(tint ?? AppColors.accent),
    );
  }

  KpiCardVariant _variantFromColor(Color color) {
    if (color == AppColors.success || color == AppColors.teal) {
      return KpiCardVariant.success;
    }
    if (color == AppColors.warning || color == AppColors.amber) {
      return KpiCardVariant.warning;
    }
    if (color == AppColors.danger || color == AppColors.rose) {
      return KpiCardVariant.danger;
    }
    if (color == AppColors.info || color == AppColors.secondary) {
      return KpiCardVariant.info;
    }
    if (color == AppColors.textSecondary) {
      return KpiCardVariant.neutral;
    }
    return KpiCardVariant.primary;
  }
}
