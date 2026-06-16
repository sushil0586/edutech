import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:flutter/material.dart';

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({
    required this.title,
    super.key,
    this.subtitle,
    this.action,
    this.eyebrow,
  });

  final String title;
  final String? subtitle;
  final Widget? action;
  final String? eyebrow;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: PageHeaderComponent(
        title: title,
        subtitle: subtitle,
        eyebrow: eyebrow,
        primaryAction: action,
      ),
    );
  }
}
