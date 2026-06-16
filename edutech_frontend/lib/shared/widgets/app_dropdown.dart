import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:flutter/material.dart';

class AppDropdown<T> extends StatelessWidget {
  const AppDropdown({
    required this.items,
    required this.onChanged,
    super.key,
    this.value,
    this.label,
    this.hint,
    this.helperText,
    this.required = false,
    this.enabled = true,
    this.emptyLabel = 'No options available',
  });

  final T? value;
  final String? label;
  final String? hint;
  final String? helperText;
  final bool required;
  final bool enabled;
  final String emptyLabel;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    final labelText = label == null
        ? null
        : required
        ? '$label *'
        : label;
    final hasItems = items.isNotEmpty;

    return DropdownButtonFormField<T>(
      initialValue: value,
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hasItems ? hint : emptyLabel,
        helperText: helperText,
      ),
      borderRadius: BorderRadius.circular(16),
      icon: const Icon(Icons.expand_more_rounded, size: 20),
      isExpanded: true,
      menuMaxHeight: 320,
      selectedItemBuilder: hasItems
          ? null
          : (_) => [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                child: Text(
                  emptyLabel,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
                ),
              ),
            ],
      items: hasItems
          ? items
          : [
              DropdownMenuItem<T>(
                enabled: false,
                value: null,
                child: Text(
                  emptyLabel,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
                ),
              ),
            ],
      onChanged: enabled && hasItems ? onChanged : null,
    );
  }
}
