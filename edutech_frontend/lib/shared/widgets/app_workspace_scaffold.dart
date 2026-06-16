import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppWorkspaceScaffold extends ConsumerWidget {
  const AppWorkspaceScaffold({
    required this.title,
    required this.child,
    required this.onClose,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
    super.key,
    this.subtitle,
    this.eyebrow,
    this.secondaryActionLabel = 'Cancel',
    this.onSecondaryAction,
    this.isSaving = false,
    this.maxWidth = 1320,
    this.hero,
    this.shellRoute,
    this.shellTitle,
  });

  final String title;
  final String? subtitle;
  final String? eyebrow;
  final Widget child;
  final VoidCallback onClose;
  final String primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final bool isSaving;
  final double maxWidth;
  final Widget? hero;
  final String? shellRoute;
  final String? shellTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surface = _WorkspaceScaffoldSurface(
      title: title,
      subtitle: subtitle,
      eyebrow: eyebrow,
      onClose: onClose,
      primaryActionLabel: primaryActionLabel,
      onPrimaryAction: onPrimaryAction,
      secondaryActionLabel: secondaryActionLabel,
      onSecondaryAction: onSecondaryAction,
      isSaving: isSaving,
      maxWidth: maxWidth,
      hero: hero,
      child: child,
    );

    final user = ref.watch(currentUserProvider);
    if (shellRoute != null && user != null) {
      return DashboardShell(
        title: shellTitle ?? title,
        user: user,
        currentRoute: shellRoute!,
        onLogout: () => ref.read(authControllerProvider.notifier).logout(),
        body: surface,
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(child: surface),
    );
  }
}

class _WorkspaceScaffoldSurface extends StatelessWidget {
  const _WorkspaceScaffoldSurface({
    required this.title,
    required this.child,
    required this.onClose,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
    this.subtitle,
    this.eyebrow,
    this.secondaryActionLabel = 'Cancel',
    this.onSecondaryAction,
    this.isSaving = false,
    this.maxWidth = 1320,
    this.hero,
  });

  final String title;
  final String? subtitle;
  final String? eyebrow;
  final Widget child;
  final VoidCallback onClose;
  final String primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final bool isSaving;
  final double maxWidth;
  final Widget? hero;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
          child: Row(
            children: [
              IconButton.filledTonal(
                onPressed: onClose,
                icon: const Icon(Icons.arrow_back_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
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
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              AppButton(
                label: secondaryActionLabel,
                onPressed: isSaving ? null : (onSecondaryAction ?? onClose),
                variant: AppButtonVariant.ghost,
              ),
              const SizedBox(width: AppSpacing.sm),
              AppButton(
                label: primaryActionLabel,
                onPressed: isSaving ? null : onPrimaryAction,
                isLoading: isSaving,
              ),
            ],
          ),
        ),
        Expanded(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                children: [
                  if (hero != null) ...[
                    hero!,
                    const SizedBox(height: AppSpacing.lg),
                  ],
                  AppCard(padding: const EdgeInsets.all(0), child: child),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
