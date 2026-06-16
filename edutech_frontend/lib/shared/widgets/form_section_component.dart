import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/page_header_component.dart';
import 'package:education_frontend/shared/widgets/professional_card_component.dart';
import 'package:flutter/material.dart';

class FormSectionComponent extends StatelessWidget {
  const FormSectionComponent({
    required this.title,
    required this.child,
    super.key,
    this.subtitle,
    this.eyebrow,
    this.actions = const [],
    this.padding = const EdgeInsets.all(AppSpacing.lg),
  });

  final String title;
  final String? subtitle;
  final String? eyebrow;
  final Widget child;
  final List<Widget> actions;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ProfessionalCardComponent(
      padding: padding,
      header: PageHeaderComponent(
        title: title,
        subtitle: subtitle,
        eyebrow: eyebrow,
      ),
      actions: actions,
      body: child,
    );
  }
}
