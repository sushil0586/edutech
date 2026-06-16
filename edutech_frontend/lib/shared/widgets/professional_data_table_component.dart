import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/empty_state_component.dart';
import 'package:education_frontend/shared/widgets/loading_skeleton_component.dart';
import 'package:flutter/material.dart';

class ProfessionalDataTableComponent extends StatelessWidget {
  const ProfessionalDataTableComponent({
    required this.table,
    super.key,
    this.minWidth = 960,
    this.compactContent,
    this.isCompact = false,
    this.isLoading = false,
    this.loadingType = LoadingSkeletonType.table,
    this.loadingItemCount = 4,
    this.isEmpty = false,
    this.emptyTitle = 'No records to show',
    this.emptyDescription = 'Try adjusting the filters or come back later.',
    this.emptyAction,
    this.padding = const EdgeInsets.all(AppSpacing.md),
  });

  final Widget table;
  final double minWidth;
  final Widget? compactContent;
  final bool isCompact;
  final bool isLoading;
  final LoadingSkeletonType loadingType;
  final int loadingItemCount;
  final bool isEmpty;
  final String emptyTitle;
  final String emptyDescription;
  final Widget? emptyAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    Widget content;
    if (isLoading) {
      content = LoadingSkeletonComponent(
        type: loadingType,
        itemCount: loadingItemCount,
      );
    } else if (isEmpty) {
      content = EmptyStateComponent(
        title: emptyTitle,
        description: emptyDescription,
        action: emptyAction,
      );
    } else if (isCompact && compactContent != null) {
      content = compactContent!;
    } else {
      content = SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: minWidth),
          child: table,
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(padding: padding, child: content),
    );
  }
}
