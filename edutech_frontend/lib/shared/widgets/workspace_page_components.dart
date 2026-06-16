import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:education_frontend/shared/widgets/professional_card_component.dart';
import 'package:flutter/material.dart';

class WorkspacePageIntro extends StatelessWidget {
  const WorkspacePageIntro({
    required this.title,
    required this.subtitle,
    super.key,
    this.eyebrow,
    this.breadcrumbs = const [],
    this.primaryAction,
    this.secondaryActions = const [],
    this.metrics = const [],
    this.bottomSpacing = AppSpacing.xs,
    this.tight = true,
  });

  final String title;
  final String subtitle;
  final String? eyebrow;
  final List<String> breadcrumbs;
  final Widget? primaryAction;
  final List<Widget> secondaryActions;
  final List<Widget> metrics;
  final double bottomSpacing;
  final bool tight;

  @override
  Widget build(BuildContext context) {
    final introCard = ProfessionalCardComponent(
      padding: EdgeInsets.fromLTRB(
        tight ? AppSpacing.md : AppSpacing.lg,
        tight ? AppSpacing.xs : AppSpacing.md,
        tight ? AppSpacing.md : AppSpacing.lg,
        tight ? AppSpacing.sm : AppSpacing.md,
      ),
      backgroundColor: AppColors.surface,
      borderColor: AppColors.border.withValues(alpha: 0.9),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PageHeaderComponent(
            eyebrow: eyebrow,
            title: title,
            subtitle: subtitle,
            breadcrumbs: breadcrumbs,
            primaryAction: primaryAction,
            secondaryActions: secondaryActions,
            compact: true,
          ),
          if (metrics.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            WorkspaceMetricStrip(children: metrics),
          ],
        ],
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        introCard,
        SizedBox(height: bottomSpacing),
      ],
    );
  }
}

class WorkspaceMetricStrip extends StatelessWidget {
  const WorkspaceMetricStrip({
    required this.children,
    super.key,
    this.minCardWidth = 160,
    this.spacing = AppSpacing.xs,
  });

  final List<Widget> children;
  final double minCardWidth;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final crossAxisCount = width >= 1120
            ? 5
            : width >= 900
            ? 4
            : width >= 680
            ? 3
            : width >= 460
            ? 2
            : 1;
        final itemWidth = crossAxisCount == 1
            ? width
            : (width - ((crossAxisCount - 1) * spacing)) / crossAxisCount;
        final effectiveWidth = itemWidth < minCardWidth && crossAxisCount > 1
            ? minCardWidth
            : itemWidth;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children)
              SizedBox(width: effectiveWidth, child: child),
          ],
        );
      },
    );
  }
}

class WorkspaceSplitView extends StatelessWidget {
  const WorkspaceSplitView({
    required this.primary,
    required this.secondary,
    super.key,
    this.breakpoint = 1180,
    this.primaryFlex = 5,
    this.secondaryFlex = 4,
    this.gap = AppSpacing.sm,
  });

  final Widget primary;
  final Widget secondary;
  final double breakpoint;
  final int primaryFlex;
  final int secondaryFlex;
  final double gap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < breakpoint) {
          return Column(
            children: [
              primary,
              SizedBox(height: gap),
              secondary,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: primaryFlex, child: primary),
            SizedBox(width: gap),
            Expanded(flex: secondaryFlex, child: secondary),
          ],
        );
      },
    );
  }
}

class WorkspaceSectionCard extends StatelessWidget {
  const WorkspaceSectionCard({
    required this.body,
    super.key,
    this.title,
    this.subtitle,
    this.eyebrow,
    this.actions,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
  });

  final Widget body;
  final String? title;
  final String? subtitle;
  final String? eyebrow;
  final List<Widget>? actions;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final hasHeader = title != null || subtitle != null || eyebrow != null;
    return ProfessionalCardComponent(
      padding: padding,
      header: hasHeader
          ? PageHeaderComponent(
              eyebrow: eyebrow,
              title: title ?? '',
              subtitle: subtitle,
            )
          : null,
      actions: actions,
      body: body,
    );
  }
}
