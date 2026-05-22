import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
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
    final accent = tint ?? AppColors.primary;
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          accent.withValues(alpha: 0.045),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null)
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                  child: Icon(icon, color: accent),
                ),
              const Spacer(),
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.35),
                      blurRadius: 14,
                      spreadRadius: -2,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(label, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          if (helper != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              helper!,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}
