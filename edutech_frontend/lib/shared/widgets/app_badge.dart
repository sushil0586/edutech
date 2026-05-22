import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class AppBadge extends StatelessWidget {
  const AppBadge({
    required this.label,
    super.key,
    this.backgroundColor,
    this.foregroundColor,
  });

  final String label;
  final Color? backgroundColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color:
            backgroundColor ??
            AppColors.subtleAccent,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(
          color: (foregroundColor ?? AppColors.primary).withValues(alpha: 0.12),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        child: Text(
          label.replaceAll('_', ' '),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: foregroundColor ?? AppColors.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
