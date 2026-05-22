import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class AppCard extends StatelessWidget {
  const AppCard({
    required this.child,
    super.key,
    this.padding = const EdgeInsets.all(AppSpacing.xl),
    this.backgroundColor,
    this.borderColor,
    this.gradient,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? borderColor;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: gradient == null ? (backgroundColor ?? AppColors.surface) : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: borderColor ?? AppColors.border.withValues(alpha: 0.82),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.06),
            blurRadius: 34,
            spreadRadius: -12,
            offset: const Offset(0, 18),
          ),
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.55),
            blurRadius: 0,
            spreadRadius: 0,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}
