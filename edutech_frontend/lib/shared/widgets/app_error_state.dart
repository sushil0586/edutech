import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:flutter/material.dart';

class AppErrorState extends StatelessWidget {
  const AppErrorState({required this.message, super.key, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      borderColor: AppColors.error.withValues(alpha: 0.18),
      backgroundColor: AppColors.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 40, color: AppColors.error),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Something went wrong',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(message, textAlign: TextAlign.center),
          if (onRetry != null) ...[
            const SizedBox(height: AppSpacing.lg),
            AppButton(
              label: 'Try again',
              onPressed: onRetry,
              variant: AppButtonVariant.secondary,
            ),
          ],
        ],
      ),
    );
  }
}
