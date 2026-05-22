import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class ResponsivePageContainer extends StatelessWidget {
  const ResponsivePageContainer({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final horizontalPadding = width >= 1280
        ? AppSpacing.xxxl
        : width >= 900
        ? AppSpacing.xxl
        : AppSpacing.md;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1360),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              horizontalPadding,
              width >= 900 ? AppSpacing.xl : AppSpacing.md,
              horizontalPadding,
              AppSpacing.xl,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
