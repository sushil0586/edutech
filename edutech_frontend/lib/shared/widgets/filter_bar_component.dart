import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/professional_card_component.dart';
import 'package:flutter/material.dart';

class FilterBarComponent extends StatelessWidget {
  const FilterBarComponent({
    required this.children,
    super.key,
    this.onReset,
    this.search,
  });

  final Widget? search;
  final List<Widget> children;
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context) {
    return ProfessionalCardComponent(
      padding: const EdgeInsets.all(AppSpacing.lg),
      body: Wrap(
        spacing: AppSpacing.md,
        runSpacing: AppSpacing.md,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          // ignore: use_null_aware_elements
          if (search != null) search!,
          ...children,
          if (onReset != null)
            OutlinedButton.icon(
              onPressed: onReset,
              icon: const Icon(Icons.restart_alt_rounded),
              label: const Text('Reset filters'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
              ),
            ),
        ],
      ),
    );
  }
}
