import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/professional_card_component.dart';
import 'package:flutter/material.dart';

enum KpiCardVariant { neutral, success, warning, danger, info, primary }

class KpiCardComponent extends StatelessWidget {
  const KpiCardComponent({
    required this.label,
    required this.value,
    super.key,
    this.icon,
    this.variant = KpiCardVariant.primary,
    this.trendText,
    this.helper,
  });

  final String label;
  final String value;
  final IconData? icon;
  final KpiCardVariant variant;
  final String? trendText;
  final String? helper;

  Color get _tint => switch (variant) {
    KpiCardVariant.success => AppColors.success,
    KpiCardVariant.warning => AppColors.warning,
    KpiCardVariant.danger => AppColors.danger,
    KpiCardVariant.info => AppColors.info,
    KpiCardVariant.primary => AppColors.primary,
    KpiCardVariant.neutral => AppColors.textSecondary,
  };

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 220;
        return ProfessionalCardComponent(
          padding: EdgeInsets.all(compact ? AppSpacing.xs : AppSpacing.sm),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (icon != null)
                    Container(
                      width: compact ? 30 : 34,
                      height: compact ? 30 : 34,
                      decoration: BoxDecoration(
                        color: _tint.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Icon(icon, color: _tint, size: compact ? 14 : 16),
                    ),
                  if (icon != null) const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        if (trendText != null) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            trendText!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: _tint,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style:
                    (compact
                            ? Theme.of(context).textTheme.titleLarge
                            : Theme.of(context).textTheme.headlineMedium)
                        ?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                        ),
              ),
              if (helper != null) ...[
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  helper!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
