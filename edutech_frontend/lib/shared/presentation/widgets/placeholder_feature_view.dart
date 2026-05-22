import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:flutter/material.dart';

class PlaceholderFeatureView extends StatelessWidget {
  const PlaceholderFeatureView({
    required this.title,
    required this.description,
    this.highlights = const [],
    this.headerAction,
    super.key,
  });

  final String title;
  final String description;
  final List<String> highlights;
  final Widget? headerAction;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          gradient: LinearGradient(
            colors: [
              AppColors.surface,
              AppColors.subtleAccent.withValues(alpha: 0.55),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppBadge(label: 'Workspace overview'),
              const SizedBox(height: AppSpacing.lg),
              AppSectionHeader(
                title: title,
                subtitle: description,
                action: headerAction,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: highlights
              .map(
                (item) => SizedBox(
                  width: isWide ? 280 : double.infinity,
                  child: AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    gradient: LinearGradient(
                      colors: [
                        AppColors.surface,
                        AppColors.surfaceMuted,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    child: Text(
                      item,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}
