import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class ProfessionalCardComponent extends StatelessWidget {
  const ProfessionalCardComponent({
    required this.body,
    super.key,
    this.header,
    this.footer,
    this.actions,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.backgroundColor,
    this.borderColor,
  });

  final Widget body;
  final Widget? header;
  final Widget? footer;
  final List<Widget>? actions;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final hasHeader =
        header != null || (actions != null && actions!.isNotEmpty);
    final hasFooter = footer != null;

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: borderColor ?? AppColors.border.withValues(alpha: 0.84),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withValues(alpha: 0.04),
            blurRadius: 18,
            spreadRadius: -10,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: padding,
        child: !hasHeader && !hasFooter
            ? body
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (hasHeader) ...[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (header != null) Expanded(child: header!),
                        if (actions != null && actions!.isNotEmpty) ...[
                          if (header != null)
                            const SizedBox(width: AppSpacing.md),
                          Wrap(
                            spacing: AppSpacing.sm,
                            runSpacing: AppSpacing.sm,
                            alignment: WrapAlignment.end,
                            children: actions!,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  body,
                  if (footer != null) ...[
                    const SizedBox(height: AppSpacing.md),
                    footer!,
                  ],
                ],
              ),
      ),
    );
  }
}
