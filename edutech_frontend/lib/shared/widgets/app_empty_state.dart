import 'package:education_frontend/shared/widgets/empty_state_component.dart';
import 'package:flutter/material.dart';

class AppEmptyState extends StatelessWidget {
  const AppEmptyState({
    required this.title,
    required this.message,
    super.key,
    this.action,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String message;
  final Widget? action;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return EmptyStateComponent(
      title: title,
      description: message,
      icon: icon,
      action: action,
    );
  }
}
