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
    this.eyebrow = 'Nexora Learn',
    this.statusLabel = 'Workspace ready',
    this.footerMessage,
    super.key,
  });

  final String title;
  final String description;
  final List<String> highlights;
  final Widget? headerAction;
  final String eyebrow;
  final String statusLabel;
  final String? footerMessage;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 900;
    final visibleHighlights = highlights.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          gradient: LinearGradient(
            colors: [
              AppColors.surface,
              AppColors.subtleAccent.withValues(alpha: 0.85),
              AppColors.surface,
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final useSplit = constraints.maxWidth >= 920;
              final heroContent = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const AppBadge(label: 'Workspace overview'),
                      const SizedBox(width: AppSpacing.sm),
                      AppBadge(
                        label: statusLabel,
                        backgroundColor: AppColors.surface.withValues(
                          alpha: 0.82,
                        ),
                        foregroundColor: AppColors.secondary,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppSectionHeader(
                    title: title,
                    subtitle: description,
                    action: headerAction,
                    eyebrow: eyebrow,
                  ),
                  if (visibleHighlights.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xl),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: visibleHighlights
                          .map(
                            (item) => AppBadge(
                              label: item,
                              backgroundColor: AppColors.surface.withValues(
                                alpha: 0.82,
                              ),
                              foregroundColor: AppColors.secondary,
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ],
              );

              final supportCard = AppCard(
                padding: const EdgeInsets.all(AppSpacing.lg),
                gradient: LinearGradient(
                  colors: [AppColors.surface, AppColors.surfaceStrong],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'What is available now',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      footerMessage ??
                          'This surface already inherits the refreshed shell, navigation, and role-aware routing, so expansion can happen without redesigning the entire workspace.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              );

              if (!useSplit) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    heroContent,
                    const SizedBox(height: AppSpacing.lg),
                    supportCard,
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 5, child: heroContent),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(flex: 3, child: supportCard),
                ],
              );
            },
          ),
        ),
        if (visibleHighlights.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: visibleHighlights
                .map(
                  (item) => SizedBox(
                    width: isWide ? 280 : double.infinity,
                    child: AppCard(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      gradient: LinearGradient(
                        colors: [AppColors.surface, AppColors.surfaceStrong],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      child: Text(
                        item,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }
}
