import 'package:flutter/material.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.textInputAction,
    this.onFieldSubmitted,
    this.validator,
    this.enabled = true,
    this.prefixIcon,
    this.suffixIcon,
    this.onChanged,
    this.helperText,
    this.required = false,
    this.minLines,
    this.expands = false,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int maxLines;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onFieldSubmitted;
  final String? Function(String?)? validator;
  final bool enabled;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final ValueChanged<String>? onChanged;
  final String? helperText;
  final bool required;
  final int? minLines;
  final bool expands;

  @override
  Widget build(BuildContext context) {
    final labelText = label == null
        ? null
        : required
        ? '$label *'
        : label;
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      maxLines: maxLines,
      minLines: expands ? null : minLines,
      expands: expands,
      enabled: enabled,
      textInputAction: textInputAction,
      onFieldSubmitted: onFieldSubmitted,
      onChanged: onChanged,
      validator: validator,
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hint,
        helperText: helperText,
        prefixIcon: prefixIcon,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: enabled
            ? AppColors.surface
            : AppColors.surfaceStrong.withValues(alpha: 0.9),
      ),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: enabled ? AppColors.textPrimary : AppColors.textSecondary,
      ),
    );
  }
}
