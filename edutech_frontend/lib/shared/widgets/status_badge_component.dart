import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:flutter/material.dart';

enum StatusBadgeTone {
  neutral,
  draft,
  published,
  live,
  completed,
  pending,
  failed,
  active,
  inactive,
  submitted,
  notSubmitted,
  cancelled,
}

class StatusBadgeComponent extends StatelessWidget {
  const StatusBadgeComponent({required this.label, super.key, this.tone});

  final String label;
  final StatusBadgeTone? tone;

  @override
  Widget build(BuildContext context) {
    final resolvedTone = tone ?? _toneFromLabel(label);
    final (background, foreground) = switch (resolvedTone) {
      StatusBadgeTone.live ||
      StatusBadgeTone.active ||
      StatusBadgeTone.published ||
      StatusBadgeTone.submitted => (
        AppColors.success.withValues(alpha: 0.10),
        AppColors.success,
      ),
      StatusBadgeTone.completed => (
        AppColors.info.withValues(alpha: 0.10),
        AppColors.info,
      ),
      StatusBadgeTone.pending || StatusBadgeTone.draft => (
        AppColors.warning.withValues(alpha: 0.10),
        AppColors.warning,
      ),
      StatusBadgeTone.failed ||
      StatusBadgeTone.inactive ||
      StatusBadgeTone.notSubmitted ||
      StatusBadgeTone.cancelled => (
        AppColors.danger.withValues(alpha: 0.10),
        AppColors.danger,
      ),
      StatusBadgeTone.neutral => (
        AppColors.surfaceStrong,
        AppColors.textSecondary,
      ),
    };

    return AppBadge(
      label: label,
      backgroundColor: background,
      foregroundColor: foreground,
    );
  }

  StatusBadgeTone _toneFromLabel(String raw) {
    final normalized = raw.trim().toLowerCase().replaceAll('_', ' ');
    if (normalized.contains('live')) return StatusBadgeTone.live;
    if (normalized.contains('published')) return StatusBadgeTone.published;
    if (normalized.contains('completed')) return StatusBadgeTone.completed;
    if (normalized.contains('draft')) return StatusBadgeTone.draft;
    if (normalized.contains('pass') || normalized.contains('success')) {
      return StatusBadgeTone.submitted;
    }
    if (normalized.contains('pending') || normalized.contains('scheduled')) {
      return StatusBadgeTone.pending;
    }
    if (normalized.contains('review') || normalized.contains('progress')) {
      return StatusBadgeTone.pending;
    }
    if (normalized.contains('failed')) return StatusBadgeTone.failed;
    if (normalized.contains('missed') || normalized.contains('cancel')) {
      return StatusBadgeTone.failed;
    }
    if (normalized == 'active') return StatusBadgeTone.active;
    if (normalized == 'inactive') return StatusBadgeTone.inactive;
    if (normalized.contains('submitted')) {
      return normalized.contains('not')
          ? StatusBadgeTone.notSubmitted
          : StatusBadgeTone.submitted;
    }
    if (normalized.contains('cancel')) return StatusBadgeTone.cancelled;
    return StatusBadgeTone.neutral;
  }
}
