import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/form_action_footer_component.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppDialogShell extends ConsumerWidget {
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
    this.fullPage = false,
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
  final bool isSaving;
  final String secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final double maxWidth;
  final double maxHeight;
  final bool scrollable;
  final bool fullPage;
  final String? shellRoute;
  final String? shellTitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final size = MediaQuery.sizeOf(context);
    final isCompact = size.width < 720;
    final effectiveMaxWidth = isCompact ? size.width - 24 : maxWidth;
    final effectiveMaxHeight = isCompact
        ? size.height - 24
        : maxHeight.clamp(0, size.height - 48);
    final header = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: PageHeaderComponent(
            title: title,
            subtitle: subtitle,
            eyebrow: eyebrow,
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        IconButton(
          onPressed: onClose,
          icon: Icon(fullPage ? Icons.arrow_back_rounded : Icons.close_rounded),
          style: IconButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.surface,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
          ),
        ),
      ],
    );

    final footer = FormActionFooterComponent(
      child: Row(
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
    );

    if (fullPage) {
      final surface = _FullPageDialogSurface(
        header: header,
        footer: footer,
        isCompact: isCompact,
        scrollable: scrollable,
        size: size,
        maxWidth: maxWidth,
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
      return Scaffold(body: SafeArea(child: surface));
    }

    return Dialog(
      insetPadding: EdgeInsets.all(isCompact ? 12 : 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: effectiveMaxWidth,
          maxHeight: effectiveMaxHeight.toDouble(),
        ),
        child: Padding(
          padding: EdgeInsets.all(isCompact ? AppSpacing.md : AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              header,
              const SizedBox(height: AppSpacing.lg),
              Expanded(
                child: scrollable ? SingleChildScrollView(child: child) : child,
              ),
              const SizedBox(height: AppSpacing.lg),
              footer,
            ],
          ),
        ),
      ),
    );
  }
}

class _FullPageDialogSurface extends StatelessWidget {
  const _FullPageDialogSurface({
    required this.header,
    required this.footer,
    required this.child,
    required this.isCompact,
    required this.scrollable,
    required this.size,
    required this.maxWidth,
  });

  final Widget header;
  final Widget footer;
  final Widget child;
  final bool isCompact;
  final bool scrollable;
  final Size size;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: isCompact ? size.width : maxWidth + 240,
        ),
        child: Padding(
          padding: EdgeInsets.all(isCompact ? AppSpacing.md : AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              header,
              const SizedBox(height: AppSpacing.lg),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(AppRadius.xl),
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(
                      isCompact ? AppSpacing.md : AppSpacing.xl,
                    ),
                    child: scrollable
                        ? SingleChildScrollView(child: child)
                        : child,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              footer,
            ],
          ),
        ),
      ),
    );
  }
}
