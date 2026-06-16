import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:flutter/material.dart';

class PageHeaderComponent extends StatelessWidget {
  const PageHeaderComponent({
    required this.title,
    super.key,
    this.subtitle,
    this.primaryAction,
    this.secondaryActions = const [],
    this.breadcrumbs = const [],
    this.eyebrow,
    this.compact = false,
  });

  final String title;
  final String? subtitle;
  final Widget? primaryAction;
  final List<Widget> secondaryActions;
  final List<String> breadcrumbs;
  final String? eyebrow;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final stackActions = constraints.maxWidth < 840;
        final titleStyle =
            (compact
                    ? Theme.of(context).textTheme.headlineMedium
                    : Theme.of(context).textTheme.headlineSmall)
                ?.copyWith(fontWeight: FontWeight.w700);
        final subtitleStyle =
            (compact
                    ? Theme.of(context).textTheme.bodySmall
                    : Theme.of(context).textTheme.bodyMedium)
                ?.copyWith(color: AppColors.textSecondary);
        final heading = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (breadcrumbs.isNotEmpty)
              Padding(
                padding: EdgeInsets.only(
                  bottom: compact ? AppSpacing.xxs : AppSpacing.xs,
                ),
                child: Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    for (var i = 0; i < breadcrumbs.length; i++) ...[
                      Text(
                        breadcrumbs[i],
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              color: i == breadcrumbs.length - 1
                                  ? AppColors.textSecondary
                                  : AppColors.textMuted,
                              fontWeight: i == breadcrumbs.length - 1
                                  ? FontWeight.w600
                                  : FontWeight.w500,
                            ),
                      ),
                      if (i != breadcrumbs.length - 1)
                        const Icon(
                          Icons.chevron_right_rounded,
                          size: 16,
                          color: AppColors.textMuted,
                        ),
                    ],
                  ],
                ),
              ),
            if (eyebrow != null) ...[
              AppBadge(label: eyebrow!),
              SizedBox(height: compact ? AppSpacing.xxs : AppSpacing.xs),
            ],
            Text(title, style: titleStyle),
            if (subtitle != null) ...[
              SizedBox(height: compact ? AppSpacing.xxs : AppSpacing.xs),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Text(subtitle!, style: subtitleStyle),
              ),
            ],
          ],
        );

        final actionRow = Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          alignment: WrapAlignment.end,
          children: [
            ...secondaryActions,
            // ignore: use_null_aware_elements
            if (primaryAction != null) primaryAction!,
          ],
        );

        if (stackActions) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              heading,
              if (primaryAction != null || secondaryActions.isNotEmpty) ...[
                SizedBox(height: compact ? AppSpacing.xs : AppSpacing.sm),
                actionRow,
              ],
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: heading),
            if (primaryAction != null || secondaryActions.isNotEmpty) ...[
              SizedBox(width: compact ? AppSpacing.sm : AppSpacing.md),
              Flexible(child: actionRow),
            ],
          ],
        );
      },
    );
  }
}
