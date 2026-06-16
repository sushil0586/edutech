import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class ActionButtonGroupItem {
  const ActionButtonGroupItem({
    required this.label,
    this.onPressed,
    this.icon,
    this.disabledReason,
    this.isPrimary = false,
    this.isDestructive = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final String? disabledReason;
  final bool isPrimary;
  final bool isDestructive;
}

class ActionButtonGroupComponent extends StatelessWidget {
  const ActionButtonGroupComponent({
    required this.items,
    super.key,
    this.expand = false,
    this.maxVisibleActions,
  });

  final List<ActionButtonGroupItem> items;
  final bool expand;
  final int? maxVisibleActions;

  @override
  Widget build(BuildContext context) {
    final visibleItems = maxVisibleActions == null
        ? items
        : items.take(maxVisibleActions!).toList();
    final overflowItems =
        maxVisibleActions == null || items.length <= maxVisibleActions!
        ? const <ActionButtonGroupItem>[]
        : items.skip(maxVisibleActions!).toList();

    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        ...visibleItems.map((item) {
          final button = AppButton(
            label: item.label,
            icon: item.icon,
            onPressed: item.onPressed,
            expand: expand,
            variant: item.isPrimary
                ? AppButtonVariant.primary
                : item.isDestructive
                ? AppButtonVariant.destructive
                : AppButtonVariant.secondary,
          );
          final wrapped = SizedBox(
            width: expand ? double.infinity : null,
            child: item.disabledReason != null && item.onPressed == null
                ? Tooltip(message: item.disabledReason!, child: button)
                : button,
          );

          return expand
              ? ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 180),
                  child: wrapped,
                )
              : wrapped;
        }),
        if (overflowItems.isNotEmpty)
          _ActionOverflowMenu(items: overflowItems, expand: expand),
      ],
    );
  }
}

class _ActionOverflowMenu extends StatelessWidget {
  const _ActionOverflowMenu({required this.items, required this.expand});

  final List<ActionButtonGroupItem> items;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final button = PopupMenuButton<ActionButtonGroupItem>(
      tooltip: 'More actions',
      onSelected: (item) => item.onPressed?.call(),
      itemBuilder: (context) => items
          .map(
            (item) => PopupMenuItem<ActionButtonGroupItem>(
              value: item,
              enabled: item.onPressed != null,
              child: Row(
                children: [
                  if (item.icon != null) ...[
                    Icon(
                      item.icon,
                      size: 18,
                      color: item.isDestructive ? Colors.red : null,
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(child: Text(item.label)),
                ],
              ),
            ),
          )
          .toList(),
      child: AppButton(
        label: 'More',
        icon: Icons.more_horiz_rounded,
        onPressed: () {},
        expand: expand,
        variant: AppButtonVariant.ghost,
      ),
    );

    return expand
        ? ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 180),
            child: button,
          )
        : button;
  }
}
