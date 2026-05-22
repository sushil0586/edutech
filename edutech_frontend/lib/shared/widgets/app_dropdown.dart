import 'package:flutter/material.dart';

class AppDropdown<T> extends StatelessWidget {
  const AppDropdown({
    required this.items,
    required this.onChanged,
    super.key,
    this.value,
    this.label,
    this.hint,
  });

  final T? value;
  final String? label;
  final String? hint;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      decoration: InputDecoration(labelText: label, hintText: hint),
      borderRadius: BorderRadius.circular(18),
      icon: const Icon(Icons.expand_more_rounded),
      items: items,
      onChanged: onChanged,
    );
  }
}
