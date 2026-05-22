import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, ghost }

class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    super.key,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.variant = AppButtonVariant.primary,
    this.expand = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final AppButtonVariant variant;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final loaderColor = switch (variant) {
      AppButtonVariant.primary => Colors.white,
      AppButtonVariant.secondary => AppColors.primary,
      AppButtonVariant.ghost => AppColors.primary,
    };
    final child = isLoading
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2.2, color: loaderColor),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18),
                const SizedBox(width: AppSpacing.xs),
              ],
              Text(label),
            ],
          );

    Widget button;
    switch (variant) {
      case AppButtonVariant.primary:
        button = FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: Colors.white,
            shadowColor: AppColors.accent.withValues(alpha: 0.25),
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          child: child,
        );
      case AppButtonVariant.secondary:
        button = OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            backgroundColor: AppColors.surface,
            side: BorderSide(color: AppColors.border.withValues(alpha: 0.9)),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          child: child,
        );
      case AppButtonVariant.ghost:
        button = TextButton(
          onPressed: isLoading ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            backgroundColor: AppColors.subtleAccent,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          child: child,
        );
    }

    if (!expand) {
      return button;
    }
    return SizedBox(width: double.infinity, child: button);
  }
}
