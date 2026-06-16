import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class ResponsivePageContainer extends StatelessWidget {
  const ResponsivePageContainer({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final bool isDesktop = width >= 1440;
    final bool isLaptop = width >= 1180;
    final bool isTablet = width >= 720;
    final bool isCompact = width < 600;
    final double horizontalPadding = isDesktop
        ? 40.0
        : isLaptop
        ? 32.0
        : isTablet
        ? 20.0
        : isCompact
        ? AppSpacing.sm
        : AppSpacing.md;

    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1360),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              horizontalPadding,
              isDesktop
                  ? 32
                  : isLaptop
                  ? 28
                  : isTablet
                  ? 20
                  : isCompact
                  ? AppSpacing.sm
                  : AppSpacing.md,
              horizontalPadding,
              isCompact ? AppSpacing.lg : 32,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
