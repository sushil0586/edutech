import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:flutter/material.dart';

class AppDialogShell extends StatelessWidget {
  const AppDialogShell({
    required this.title,
    required this.child,
    required this.onClose,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
    super.key,
    this.subtitle,
    this.eyebrow,
    this.maxWidth = 760,
    this.maxHeight = 760,
    this.isSaving = false,
    this.secondaryActionLabel = 'Cancel',
    this.onSecondaryAction,
    this.scrollable = true,
  });

  final String title;
  final String? subtitle;
  final String? eyebrow;
  final Widget child;
  final VoidCallback onClose;
  final String primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final bool isSaving;
  final String secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final double maxWidth;
  final double maxHeight;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth, maxHeight: maxHeight),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (eyebrow != null) ...[
                          AppBadge(label: eyebrow!),
                          const SizedBox(height: AppSpacing.sm),
                        ],
                        Text(
                          title,
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            subtitle!,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  IconButton(
                    onPressed: onClose,
                    icon: const Icon(Icons.close_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.surface,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Expanded(
                child: scrollable
                    ? SingleChildScrollView(child: child)
                    : child,
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  AppButton(
                    label: secondaryActionLabel,
                    onPressed: isSaving ? null : (onSecondaryAction ?? onClose),
                    variant: AppButtonVariant.ghost,
                  ),
                  const Spacer(),
                  AppButton(
                    label: primaryActionLabel,
                    onPressed: isSaving ? null : onPrimaryAction,
                    isLoading: isSaving,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
