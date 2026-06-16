import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

enum LoadingSkeletonType { card, table, list }

class LoadingSkeletonComponent extends StatelessWidget {
  const LoadingSkeletonComponent({
    required this.type,
    super.key,
    this.itemCount = 3,
  });

  final LoadingSkeletonType type;
  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(itemCount, (index) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: index == itemCount - 1 ? 0 : AppSpacing.md,
          ),
          child: _SkeletonTile(type: type),
        );
      }),
    );
  }
}

class _SkeletonTile extends StatelessWidget {
  const _SkeletonTile({required this.type});

  final LoadingSkeletonType type;

  @override
  Widget build(BuildContext context) {
    final height = switch (type) {
      LoadingSkeletonType.card => 132.0,
      LoadingSkeletonType.table => 72.0,
      LoadingSkeletonType.list => 88.0,
    };
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _bar(width: 140, height: 12),
            const SizedBox(height: AppSpacing.md),
            _bar(width: double.infinity, height: 18),
            const SizedBox(height: AppSpacing.sm),
            _bar(width: 220, height: 12),
            if (type != LoadingSkeletonType.table) ...[
              const Spacer(),
              _bar(width: 120, height: 12),
            ],
          ],
        ),
      ),
    );
  }

  Widget _bar({required double width, required double height}) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppColors.surfaceStrong,
        borderRadius: BorderRadius.circular(AppRadius.xs),
      ),
    );
  }
}
