import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class AppLoader extends StatelessWidget {
  const AppLoader({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.surface, AppColors.surfaceMuted],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(999),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  blurRadius: 24,
                  spreadRadius: -8,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: const Padding(
              padding: EdgeInsets.all(AppSpacing.md),
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          ),
          if (label != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(label!, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}
