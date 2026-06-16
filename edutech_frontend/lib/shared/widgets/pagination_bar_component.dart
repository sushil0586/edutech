import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:flutter/material.dart';

class PaginationBarComponent extends StatelessWidget {
  const PaginationBarComponent({
    required this.label,
    super.key,
    this.onPrevious,
    this.onNext,
    this.trailing,
  });

  final String label;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 720;
    final controls = [
      AppButton(
        label: 'Previous',
        onPressed: onPrevious,
        variant: AppButtonVariant.secondary,
        icon: Icons.chevron_left_rounded,
      ),
      Text(
        label,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: AppColors.textSecondary,
          fontWeight: FontWeight.w600,
        ),
      ),
      AppButton(
        label: 'Next',
        onPressed: onNext,
        variant: AppButtonVariant.secondary,
        icon: Icons.chevron_right_rounded,
      ),
    ];

    if (isCompact) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: controls,
          ),
          if (trailing != null) ...[
            const SizedBox(height: AppSpacing.sm),
            trailing!,
          ],
        ],
      );
    }

    return Row(
      children: [
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: controls,
        ),
        if (trailing != null) ...[const Spacer(), trailing!],
      ],
    );
  }
}
