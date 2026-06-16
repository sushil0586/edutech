import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:flutter/material.dart';

class CompactActionMenuItem {
  const CompactActionMenuItem({
    required this.value,
    required this.label,
    required this.icon,
    this.onSelected,
    this.enabled = true,
    this.isDestructive = false,
    this.disabledReason,
  });

  final String value;
  final String label;
  final IconData icon;
  final VoidCallback? onSelected;
  final bool enabled;
  final bool isDestructive;
  final String? disabledReason;
}

class CompactActionMenuComponent extends StatelessWidget {
  const CompactActionMenuComponent({
    required this.items,
    super.key,
    this.tooltip = 'Row actions',
  });

  final List<CompactActionMenuItem> items;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    final visibleItems = items
        .where((item) => item.onSelected != null)
        .toList();
    if (visibleItems.isEmpty) {
      return const SizedBox.shrink();
    }

    return PopupMenuButton<String>(
      tooltip: tooltip,
      surfaceTintColor: Colors.transparent,
      constraints: const BoxConstraints(minWidth: 220),
      itemBuilder: (context) => visibleItems.map((item) {
        final foreground = item.isDestructive
            ? AppColors.danger
            : item.enabled
            ? AppColors.textPrimary
            : AppColors.textMuted;
        return PopupMenuItem<String>(
          value: item.enabled ? item.value : null,
          enabled: item.enabled,
          child: Row(
            children: [
              Icon(item.icon, size: 18, color: foreground),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: foreground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (!item.enabled &&
                        item.disabledReason != null &&
                        item.disabledReason!.trim().isNotEmpty)
                      Text(
                        item.disabledReason!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
      onSelected: (value) {
        for (final item in visibleItems) {
          if (item.value == value && item.enabled) {
            item.onSelected?.call();
            break;
          }
        }
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.border),
        ),
        child: const Icon(
          Icons.more_horiz_rounded,
          color: AppColors.textSecondary,
          size: 20,
        ),
      ),
    );
  }
}
