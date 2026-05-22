import 'package:flutter/material.dart';

String localTimezoneLabel({DateTime? now}) {
  final local = (now ?? DateTime.now()).toLocal();
  final offset = local.timeZoneOffset;
  final sign = offset.isNegative ? '-' : '+';
  final totalMinutes = offset.inMinutes.abs();
  final hours = (totalMinutes ~/ 60).toString().padLeft(2, '0');
  final minutes = (totalMinutes % 60).toString().padLeft(2, '0');
  final zoneName = local.timeZoneName.trim();
  final offsetLabel = 'UTC$sign$hours:$minutes';
  if (zoneName.isEmpty || zoneName == offsetLabel) {
    return offsetLabel;
  }
  return '$zoneName ($offsetLabel)';
}

String localTimezoneHelpText() {
  return 'All times shown in your local timezone: ${localTimezoneLabel()}';
}

String formatLocalDate(DateTime? value, {String fallback = '-'}) {
  if (value == null) {
    return fallback;
  }
  final local = value.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}

String formatLocalDateTime(DateTime? value, {String fallback = 'Not scheduled'}) {
  if (value == null) {
    return fallback;
  }
  final local = value.toLocal();
  final hour = local.hour > 12 ? local.hour - 12 : local.hour;
  final safeHour = hour == 0 ? 12 : hour;
  final minutes = local.minute.toString().padLeft(2, '0');
  final period = local.hour >= 12 ? 'PM' : 'AM';
  return '${formatLocalDate(local)} $safeHour:$minutes $period';
}

String formatLocalTime(DateTime? value, {String fallback = '-'}) {
  if (value == null) {
    return fallback;
  }
  final local = value.toLocal();
  final hour = local.hour > 12 ? local.hour - 12 : local.hour;
  final safeHour = hour == 0 ? 12 : hour;
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour >= 12 ? 'PM' : 'AM';
  return '$safeHour:$minute $period';
}

String formatRelativeTime(DateTime? value, {DateTime? now}) {
  if (value == null) {
    return 'Just now';
  }
  final localNow = (now ?? DateTime.now()).toLocal();
  final difference = localNow.difference(value.toLocal());
  if (difference.inMinutes < 1) {
    return 'Just now';
  }
  if (difference.inHours < 1) {
    return '${difference.inMinutes} min ago';
  }
  if (difference.inDays < 1) {
    return '${difference.inHours} hr ago';
  }
  if (difference.inDays == 1) {
    return '1 day ago';
  }
  return '${difference.inDays} days ago';
}

String formatDateForInput(DateTime value) {
  final local = value.toLocal();
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}

String formatDateTimeForInput(DateTime value) {
  final local = value.toLocal();
  return '${formatDateForInput(local)} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

DateTime? parseDateTimeInput(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return null;
  }
  final normalized = trimmed.contains('T')
      ? trimmed
      : trimmed.contains(' ')
          ? trimmed.replaceFirst(' ', 'T')
          : trimmed;
  return DateTime.tryParse(normalized);
}

DateTime? parseDateInput(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return null;
  }
  return DateTime.tryParse(trimmed);
}

Future<DateTime?> pickLocalDate(
  BuildContext context, {
  DateTime? initialDate,
  DateTime? firstDate,
  DateTime? lastDate,
}) async {
  final now = DateTime.now();
  return showDatePicker(
    context: context,
    initialDate: (initialDate ?? now).toLocal(),
    firstDate: firstDate ?? DateTime(2000),
    lastDate: lastDate ?? DateTime(now.year + 10),
  );
}

Future<DateTime?> pickLocalDateTime(
  BuildContext context, {
  DateTime? initialDateTime,
  DateTime? firstDate,
  DateTime? lastDate,
}) async {
  final seed = (initialDateTime ?? DateTime.now()).toLocal();
  final pickedDate = await showDatePicker(
    context: context,
    initialDate: seed,
    firstDate: firstDate ?? DateTime(2000),
    lastDate: lastDate ?? DateTime(DateTime.now().year + 10),
  );
  if (pickedDate == null || !context.mounted) {
    return null;
  }
  final pickedTime = await showTimePicker(
    context: context,
    initialTime: TimeOfDay.fromDateTime(seed),
  );
  if (pickedTime == null) {
    return null;
  }
  return DateTime(
    pickedDate.year,
    pickedDate.month,
    pickedDate.day,
    pickedTime.hour,
    pickedTime.minute,
  );
}
