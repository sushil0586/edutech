import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/utils/web_download.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/academics/data/repositories/academic_setup_repository.dart';
import 'package:education_frontend/features/academics/domain/models/academic_setup_models.dart';
import 'package:education_frontend/features/academics/presentation/helpers/academic_setup_refresh.dart';
import 'package:education_frontend/features/academics/presentation/providers/academic_setup_providers.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/shared/presentation/widgets/placeholder_feature_view.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AcademicSetupPage extends ConsumerStatefulWidget {
  const AcademicSetupPage({super.key});

  @override
  ConsumerState<AcademicSetupPage> createState() => _AcademicSetupPageState();
}

class _AcademicSetupPageState extends ConsumerState<AcademicSetupPage> {
  late final TextEditingController _searchController;
  final Set<String> _selectedStudentIds = <String>{};
  final Set<String> _selectedTeacherIds = <String>{};

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: ref.read(academicSetupSearchProvider),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(currentUserProvider);
      if (user != null && user.role == AppRole.instituteAdmin) {
        ref
            .read(academicSetupInstituteFilterProvider.notifier)
            .setInstitute(user.instituteId);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applySearch() {
    ref
        .read(academicSetupSearchProvider.notifier)
        .setSearch(_searchController.text);
  }

  void _invalidateCurrentSection() {
    invalidateAcademicSetupSection(ref, ref.read(academicSetupSectionProvider));
  }

  void _invalidateCredentialSections() {
    invalidateAcademicCredentialSections(ref);
  }

  void _toggleStudentSelection(String id, bool selected) {
    setState(() {
      if (selected) {
        _selectedStudentIds.add(id);
      } else {
        _selectedStudentIds.remove(id);
      }
    });
  }

  void _toggleTeacherSelection(String id, bool selected) {
    setState(() {
      if (selected) {
        _selectedTeacherIds.add(id);
      } else {
        _selectedTeacherIds.remove(id);
      }
    });
  }

  void _toggleAllStudentSelections(List<StudentProfileAdminModel> items, bool selected) {
    setState(() {
      if (selected) {
        _selectedStudentIds.addAll(items.map((item) => item.id));
      } else {
        _selectedStudentIds.removeAll(items.map((item) => item.id));
      }
    });
  }

  void _toggleAllTeacherSelections(List<TeacherProfileAdminModel> items, bool selected) {
    setState(() {
      if (selected) {
        _selectedTeacherIds.addAll(items.map((item) => item.id));
      } else {
        _selectedTeacherIds.removeAll(items.map((item) => item.id));
      }
    });
  }

  Future<void> _bulkToggleStudentLogins(
    List<StudentProfileAdminModel> items, {
    required bool enable,
  }) async {
    final selectedRows = items
        .where((item) => _selectedStudentIds.contains(item.id))
        .where((item) => item.accountUserId != null && item.hasLogin)
        .toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            enable
                ? 'Select students with inactive logins to enable them.'
                : 'Select students with active logins to disable them.',
          ),
        ),
      );
      return;
    }
    if (!enable) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Disable selected student logins?'),
          content: Text(
            'This will disable login access for ${selectedRows.length} selected students. Academic profiles remain active.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Disable'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }
    final repo = ref.read(academicSetupRepositoryProvider);
    try {
      for (final item in selectedRows) {
        if (enable) {
          await repo.enableUserLogin(item.accountUserId!);
        } else {
          await repo.disableUserLogin(item.accountUserId!);
        }
      }
      setState(() => _selectedStudentIds.clear());
      _invalidateCredentialSections();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            enable
                ? 'Enabled ${selectedRows.length} student logins.'
                : 'Disabled ${selectedRows.length} student logins.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _bulkToggleTeacherLogins(
    List<TeacherProfileAdminModel> items, {
    required bool enable,
  }) async {
    final selectedRows = items
        .where((item) => _selectedTeacherIds.contains(item.id))
        .where((item) => item.accountUserId != null && item.hasLogin)
        .toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            enable
                ? 'Select teachers with inactive logins to enable them.'
                : 'Select teachers with active logins to disable them.',
          ),
        ),
      );
      return;
    }
    if (!enable) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Disable selected teacher logins?'),
          content: Text(
            'This will disable login access for ${selectedRows.length} selected teachers. Academic profiles remain active.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Disable'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }
    final repo = ref.read(academicSetupRepositoryProvider);
    try {
      for (final item in selectedRows) {
        if (enable) {
          await repo.enableUserLogin(item.accountUserId!);
        } else {
          await repo.disableUserLogin(item.accountUserId!);
        }
      }
      setState(() => _selectedTeacherIds.clear());
      _invalidateCredentialSections();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            enable
                ? 'Enabled ${selectedRows.length} teacher logins.'
                : 'Disabled ${selectedRows.length} teacher logins.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _bulkCreateStudentLogins(List<StudentProfileAdminModel> items) async {
    final selectedRows = items
        .where((item) => _selectedStudentIds.contains(item.id))
        .where((item) => !item.hasLogin)
        .toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Select students without existing logins to create accounts in bulk.',
          ),
        ),
      );
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create selected student logins?'),
        content: Text(
          'This will auto-generate credentials for ${selectedRows.length} selected students. '
          'Generated passwords will be shown only once.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Create logins'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final repo = ref.read(academicSetupRepositoryProvider);
    final credentials = <Map<String, dynamic>>[];
    int createdCount = 0;
    int failedCount = 0;
    final errors = <Map<String, dynamic>>[];

    for (final item in selectedRows) {
      try {
        final result = await repo.createStudentLogin(item.id, {
          'auto_generate': true,
        });
        createdCount += 1;
        credentials.add({
          'profile_id': item.id,
          'full_name': item.fullName,
          'identifier': item.admissionNo,
          'username': result.username,
          'generated_password': result.generatedPassword,
        });
      } catch (error) {
        failedCount += 1;
        errors.add({
          'profile_id': item.id,
          'full_name': item.fullName,
          'detail': readApiErrorMessage(error),
        });
      }
    }

    setState(() => _selectedStudentIds.clear());
    _invalidateCredentialSections();
    await _showBulkImportResult(
      BulkImportResult(
        createdCount: createdCount,
        failedCount: failedCount,
        errors: errors,
        credentials: credentials,
      ),
    );
  }

  Future<void> _bulkCreateTeacherLogins(List<TeacherProfileAdminModel> items) async {
    final selectedRows = items
        .where((item) => _selectedTeacherIds.contains(item.id))
        .where((item) => !item.hasLogin)
        .toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Select teachers without existing logins to create accounts in bulk.',
          ),
        ),
      );
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create selected teacher logins?'),
        content: Text(
          'This will auto-generate credentials for ${selectedRows.length} selected teachers. '
          'Generated passwords will be shown only once.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Create logins'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    final repo = ref.read(academicSetupRepositoryProvider);
    final credentials = <Map<String, dynamic>>[];
    int createdCount = 0;
    int failedCount = 0;
    final errors = <Map<String, dynamic>>[];

    for (final item in selectedRows) {
      try {
        final result = await repo.createTeacherLogin(item.id, {
          'auto_generate': true,
        });
        createdCount += 1;
        credentials.add({
          'profile_id': item.id,
          'full_name': item.fullName,
          'identifier': item.employeeCode,
          'username': result.username,
          'generated_password': result.generatedPassword,
        });
      } catch (error) {
        failedCount += 1;
        errors.add({
          'profile_id': item.id,
          'full_name': item.fullName,
          'detail': readApiErrorMessage(error),
        });
      }
    }

    setState(() => _selectedTeacherIds.clear());
    _invalidateCredentialSections();
    await _showBulkImportResult(
      BulkImportResult(
        createdCount: createdCount,
        failedCount: failedCount,
        errors: errors,
        credentials: credentials,
      ),
    );
  }

  Future<void> _exportSelectedStudents(List<StudentProfileAdminModel> items) async {
    final selectedRows = items.where((item) => _selectedStudentIds.contains(item.id)).toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select one or more students first.')),
      );
      return;
    }
    final lines = <String>[
      'full_name,admission_no,login_username,login_status',
      ...selectedRows.map(
        (item) =>
            '"${item.fullName.replaceAll('"', '""')}","${item.admissionNo}","${item.loginUsername ?? ''}","${item.hasLogin ? (item.loginIsActive ? 'active' : 'inactive') : 'no_login'}"',
      ),
    ];
    await downloadTextFile(
      filename: 'selected_students_roster.csv',
      content: '${lines.join('\n')}\n',
      mimeType: 'text/csv',
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Exported ${selectedRows.length} selected students.')),
    );
  }

  Future<void> _exportSelectedTeachers(List<TeacherProfileAdminModel> items) async {
    final selectedRows = items.where((item) => _selectedTeacherIds.contains(item.id)).toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select one or more teachers first.')),
      );
      return;
    }
    final lines = <String>[
      'full_name,employee_code,login_username,login_status',
      ...selectedRows.map(
        (item) =>
            '"${item.fullName.replaceAll('"', '""')}","${item.employeeCode}","${item.loginUsername ?? ''}","${item.hasLogin ? (item.loginIsActive ? 'active' : 'inactive') : 'no_login'}"',
      ),
    ];
    await downloadTextFile(
      filename: 'selected_teachers_roster.csv',
      content: '${lines.join('\n')}\n',
      mimeType: 'text/csv',
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Exported ${selectedRows.length} selected teachers.')),
    );
  }

  Future<void> _showBulkImportResult(BulkImportResult result) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Import completed'),
        content: SizedBox(
          width: 620,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Created ${result.createdCount} records with ${result.failedCount} failures.',
                ),
                if (result.credentials.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Generated credentials',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  ...result.credentials.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        '${item['full_name'] ?? '-'} • ${item['username'] ?? '-'}'
                        '${item['generated_password'] == null ? '' : ' • ${item['generated_password']}'}',
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Share these credentials securely. Password will not be shown again.',
                  ),
                ],
              ],
            ),
          ),
        ),
        actions: [
          if (result.credentials.isNotEmpty)
            TextButton(
              onPressed: () async {
                final text = result.credentials
                    .map(
                      (item) =>
                          '${item['full_name'] ?? '-'} | ${item['username'] ?? '-'} | ${item['generated_password'] ?? ''}',
                    )
                    .join('\n');
                await Clipboard.setData(ClipboardData(text: text));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Credentials copied safely.')),
                  );
                }
              },
              child: const Text('Copy credentials'),
            ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _showCredentialResult(CredentialActionResult result) async {
    if (!mounted) {
      return;
    }
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Credentials ready'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Username: ${result.username ?? '-'}'),
            const SizedBox(height: 8),
            Text(
              result.generatedPassword == null
                  ? 'Password updated successfully. Share it securely if needed.'
                  : 'Temporary password: ${result.generatedPassword}',
            ),
            const SizedBox(height: 12),
            const Text(
              'Share these credentials securely. Password will not be shown again.',
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              final text = result.generatedPassword == null
                  ? 'Username: ${result.username ?? '-'}'
                  : 'Username: ${result.username ?? '-'}\nPassword: ${result.generatedPassword}';
              await Clipboard.setData(ClipboardData(text: text));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Credentials copied safely.')),
                );
              }
            },
            child: const Text('Copy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _createStudentLogin(StudentProfileAdminModel item) async {
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CreateLoginDialog(
        title: 'Create student login',
        suggestedUsername: item.admissionNo,
      ),
    );
    if (payload == null) return;
    try {
      final result = await ref
          .read(academicSetupRepositoryProvider)
          .createStudentLogin(item.id, payload);
      _invalidateCredentialSections();
      await _showCredentialResult(result);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _createTeacherLogin(TeacherProfileAdminModel item) async {
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CreateLoginDialog(
        title: 'Create teacher login',
        suggestedUsername: item.employeeCode,
      ),
    );
    if (payload == null) return;
    try {
      final result = await ref
          .read(academicSetupRepositoryProvider)
          .createTeacherLogin(item.id, payload);
      _invalidateCredentialSections();
      await _showCredentialResult(result);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _resetUserPassword({
    required String userId,
    required String title,
  }) async {
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ResetPasswordDialog(title: title),
    );
    if (payload == null) return;
    try {
      final result = await ref
          .read(academicSetupRepositoryProvider)
          .resetUserPassword(userId, payload);
      await _showCredentialResult(result);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _toggleLogin({
    required String userId,
    required bool enable,
    required String label,
  }) async {
    if (!enable) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Disable $label login?'),
          content: const Text(
            'This only disables login access. The academic profile remains active.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Disable'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (enable) {
        await repo.enableUserLogin(userId);
      } else {
        await repo.disableUserLogin(userId);
      }
      _invalidateCredentialSections();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(enable ? 'Login enabled.' : 'Login disabled.')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(readApiErrorMessage(error))),
      );
    }
  }

  Future<void> _openStudentImportDialog(AppUser user) async {
    final instituteId = ref.read(academicSetupInstituteFilterProvider) ?? user.instituteId;
    if (instituteId == null || instituteId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select an institute first to import students.')),
      );
      return;
    }
    final result = await showDialog<BulkImportResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _RosterImportDialog(
        title: 'Bulk import students',
        subtitle:
            'Upload an Excel-friendly CSV to create student profiles and optional login credentials in one step.',
        instituteId: instituteId,
        fetchTemplate: ref.read(academicSetupRepositoryProvider).fetchStudentImportTemplate,
        previewImport: (file) => ref
            .read(academicSetupRepositoryProvider)
            .previewStudentImport(instituteId: instituteId, file: file),
        finalizeImport: (preview) => ref
            .read(academicSetupRepositoryProvider)
            .finalizeStudentImport(instituteId: instituteId, preview: preview),
      ),
    );
    if (result == null) return;
    _invalidateCredentialSections();
    await _showBulkImportResult(result);
  }

  Future<void> _openTeacherImportDialog(AppUser user) async {
    final instituteId = ref.read(academicSetupInstituteFilterProvider) ?? user.instituteId;
    if (instituteId == null || instituteId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select an institute first to import teachers.')),
      );
      return;
    }
    final result = await showDialog<BulkImportResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _RosterImportDialog(
        title: 'Bulk import teachers',
        subtitle:
            'Upload an Excel-friendly CSV to create teacher profiles and optional login credentials in one step.',
        instituteId: instituteId,
        fetchTemplate: ref.read(academicSetupRepositoryProvider).fetchTeacherImportTemplate,
        previewImport: (file) => ref
            .read(academicSetupRepositoryProvider)
            .previewTeacherImport(instituteId: instituteId, file: file),
        finalizeImport: (preview) => ref
            .read(academicSetupRepositoryProvider)
            .finalizeTeacherImport(instituteId: instituteId, preview: preview),
      ),
    );
    if (result == null) return;
    _invalidateCredentialSections();
    await _showBulkImportResult(result);
  }

  Future<void> _openCreateDialog(AppUser user) async {
    await _openEditDialog(user: user);
  }

  Future<void> _openEditDialog({required AppUser user, Object? entity}) async {
    final didSave = await _showSectionDialog(user: user, entity: entity);

    if (!mounted) {
      return;
    }

    if (didSave ?? false) {
      _invalidateCurrentSection();
      invalidateAcademicLookupCaches(ref, user.instituteId);
    }
  }

  Future<bool?> _showSectionDialog({required AppUser user, Object? entity}) {
    final section = ref.read(academicSetupSectionProvider);
    return switch (section) {
      AcademicSetupSection.academicYears => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _AcademicYearDialog(
          user: user,
          initial: entity as AcademicYearAdminModel?,
        ),
      ),
      AcademicSetupSection.programs => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) =>
            _ProgramDialog(user: user, initial: entity as ProgramAdminModel?),
      ),
      AcademicSetupSection.cohorts => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) =>
            _CohortDialog(user: user, initial: entity as CohortAdminModel?),
      ),
      AcademicSetupSection.subjects => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) =>
            _SubjectDialog(user: user, initial: entity as SubjectAdminModel?),
      ),
      AcademicSetupSection.topics => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) =>
            _TopicDialog(user: user, initial: entity as TopicAdminModel?),
      ),
      AcademicSetupSection.students => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _StudentDialog(
          user: user,
          initial: entity as StudentProfileAdminModel?,
        ),
      ),
      AcademicSetupSection.teachers => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _TeacherDialog(
          user: user,
          initial: entity as TeacherProfileAdminModel?,
        ),
      ),
      AcademicSetupSection.teacherAssignments => showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _TeacherAssignmentDialog(
          user: user,
          initial: entity as TeacherAssignmentAdminModel?,
        ),
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }

    if (user.role != AppRole.platformAdmin &&
        user.role != AppRole.instituteAdmin) {
      return DashboardShell(
        title: 'Academic Setup',
        user: user,
        currentRoute: AppRoutes.academicSetup,
        onLogout: () => ref.read(authControllerProvider.notifier).logout(),
        body: const PlaceholderFeatureView(
          title: 'Academic setup restricted',
          description:
              'Academic master data management is only available for platform admin and institute admin roles.',
        ),
      );
    }

    final section = ref.watch(academicSetupSectionProvider);
    final isPlatformAdmin = user.role == AppRole.platformAdmin;
    final activeFilter = ref.watch(academicSetupActiveFilterProvider);
    final instituteFilter = ref.watch(academicSetupInstituteFilterProvider);
    final instituteOptions = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );

    return DashboardShell(
      title: 'Academic Setup',
      user: user,
      currentRoute: AppRoutes.academicSetup,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: ListView(
        children: [
          AppCard(
            child: Padding(
              padding: const EdgeInsets.all(0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppSectionHeader(
                    title: 'Academic setup',
                    subtitle:
                        'Manage academic years, programs, cohorts, subjects, topics, students, teachers, and teacher assignments from a single admin workspace.',
                    action: AppButton(
                      label: _buttonLabelForSection(section),
                      onPressed: () => _openCreateDialog(user),
                      icon: Icons.add,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      SizedBox(
                        width: 260,
                        child: AppTextField(
                          controller: _searchController,
                          onFieldSubmitted: (_) => _applySearch(),
                          label: 'Search records',
                          hint: 'Search by name, code, email, or phone',
                          suffixIcon: IconButton(
                            onPressed: _applySearch,
                            icon: const Icon(Icons.search),
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 180,
                        child: DropdownButtonFormField<bool?>(
                          initialValue: activeFilter,
                          decoration: const InputDecoration(
                            labelText: 'Active filter',
                          ),
                          items: const [
                            DropdownMenuItem<bool?>(
                              value: null,
                              child: Text('All'),
                            ),
                            DropdownMenuItem<bool?>(
                              value: true,
                              child: Text('Active'),
                            ),
                            DropdownMenuItem<bool?>(
                              value: false,
                              child: Text('Inactive'),
                            ),
                          ],
                          onChanged: (value) {
                            ref
                                .read(
                                  academicSetupActiveFilterProvider.notifier,
                                )
                                .setActiveFilter(value);
                          },
                        ),
                      ),
                      if (isPlatformAdmin)
                        SizedBox(
                          width: 260,
                          child: DropdownButtonFormField<String?>(
                            initialValue: instituteFilter,
                            decoration: const InputDecoration(
                              labelText: 'Institute',
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('All institutes'),
                              ),
                              ...instituteOptions.map(
                                (item) => DropdownMenuItem<String?>(
                                  value: item.id,
                                  child: Text(item.name),
                                ),
                              ),
                            ],
                            onChanged: (value) {
                              ref
                                  .read(
                                    academicSetupInstituteFilterProvider
                                        .notifier,
                                  )
                                  .setInstitute(value);
                            },
                          ),
                        )
                      else
                        _StaticInfoPill(
                          label: 'Scope',
                          value: user.instituteLabel,
                        ),
                      OutlinedButton(
                        onPressed: () {
                          _searchController.clear();
                          ref
                              .read(academicSetupSearchProvider.notifier)
                              .setSearch('');
                          ref
                              .read(academicSetupActiveFilterProvider.notifier)
                              .setActiveFilter(true);
                          if (isPlatformAdmin) {
                            ref
                                .read(
                                  academicSetupInstituteFilterProvider.notifier,
                                )
                                .setInstitute(null);
                          }
                        },
                        child: const Text('Clear filters'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 14,
            runSpacing: 14,
            children: [
              for (final item in _sectionCards)
                _SectionSelectorCard(
                  item: item,
                  selected: item.section == section,
                  onTap: () {
                    ref
                        .read(academicSetupSectionProvider.notifier)
                        .setSection(item.section);
                  },
                ),
            ],
          ),
          const SizedBox(height: 20),
          _buildSectionBody(user, section),
        ],
      ),
    );
  }

  Widget _buildSectionBody(AppUser user, AcademicSetupSection section) {
    switch (section) {
      case AcademicSetupSection.academicYears:
        return _AsyncSection<AcademicYearAdminModel>(
          title: 'Academic years',
          subtitle:
              'Control year windows, current year status, and institute-level academic timelines.',
          value: ref.watch(setupAcademicYearsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: item.name,
            subtitle: '${item.startDate} to ${item.endDate}',
            chips: [
              if (item.isCurrent) 'Current',
              item.isActive ? 'Active' : 'Inactive',
            ],
          ),
        );
      case AcademicSetupSection.programs:
        return _AsyncSection<ProgramAdminModel>(
          title: 'Programs',
          subtitle:
              'Set up classes, courses, or training programs with scalable naming and ordering.',
          value: ref.watch(setupProgramsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: item.name,
            subtitle:
                '${item.code} • ${item.category.isEmpty ? 'Uncategorized' : item.category}',
            chips: [
              'Order ${item.sortOrder}',
              item.isActive ? 'Active' : 'Inactive',
            ],
            description: item.description,
          ),
        );
      case AcademicSetupSection.cohorts:
        final programs = ref
            .watch(lookupProgramsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <ProgramAdminModel>[],
            );
        final years = ref
            .watch(lookupAcademicYearsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <AcademicYearAdminModel>[],
            );
        return _AsyncSection<CohortAdminModel>(
          title: 'Cohorts',
          subtitle:
              'Manage batches, sections, and timetable-ready groupings linked to program and academic year.',
          value: ref.watch(setupCohortsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: item.name,
            subtitle:
                '${_lookupName(programs, item.programId)} • ${_lookupName(years, item.academicYearId)}',
            chips: [
              if (item.capacity != null) 'Cap ${item.capacity}',
              item.isActive ? 'Active' : 'Inactive',
            ],
            description: item.code,
          ),
        );
      case AcademicSetupSection.subjects:
        final programs = ref
            .watch(lookupProgramsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <ProgramAdminModel>[],
            );
        return _AsyncSection<SubjectAdminModel>(
          title: 'Subjects',
          subtitle:
              'Maintain subject masters that teachers, question bank, and exam builder workflows depend on.',
          value: ref.watch(setupSubjectsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: item.name,
            subtitle: item.code,
            chips: [
              if (item.programId != null) _lookupName(programs, item.programId),
              'Order ${item.sortOrder}',
              item.isActive ? 'Active' : 'Inactive',
            ],
            description: item.description,
          ),
        );
      case AcademicSetupSection.topics:
        final subjects = ref
            .watch(lookupSubjectsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <SubjectAdminModel>[],
            );
        final topics = ref
            .watch(lookupTopicsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <TopicAdminModel>[],
            );
        return _AsyncSection<TopicAdminModel>(
          title: 'Topics',
          subtitle:
              'Build a nested topic hierarchy for content planning, assessments, and analytics.',
          value: ref.watch(setupTopicsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: item.name,
            subtitle: '${_lookupName(subjects, item.subjectId)} • ${item.code}',
            chips: [
              item.difficultyLevel,
              if (item.parentTopicId != null)
                _lookupName(topics, item.parentTopicId),
              item.isActive ? 'Active' : 'Inactive',
            ],
            description: item.description,
          ),
        );
      case AcademicSetupSection.students:
        final programs = ref
            .watch(lookupProgramsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <ProgramAdminModel>[],
            );
        final cohorts = ref
            .watch(lookupCohortsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <CohortAdminModel>[],
            );
        return _StudentTableSection(
          title: 'Students',
          subtitle:
              'Manage student profiles that power attempts, results, and academic performance reporting.',
          value: ref.watch(setupStudentsProvider),
          onImport: () => _openStudentImportDialog(user),
          selectedIds: _selectedStudentIds,
          onSelectionChanged: _toggleStudentSelection,
          onSelectAllVisible: _toggleAllStudentSelections,
          onBulkCreate: _bulkCreateStudentLogins,
          onBulkEnable: (items) => _bulkToggleStudentLogins(items, enable: true),
          onBulkDisable: (items) => _bulkToggleStudentLogins(items, enable: false),
          onExportSelected: _exportSelectedStudents,
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          programs: programs,
          cohorts: cohorts,
          onCreateLogin: _createStudentLogin,
          onResetPassword: ({required userId, required title}) =>
              _resetUserPassword(userId: userId, title: title),
          onToggleLogin: ({
            required userId,
            required enable,
            required label,
          }) =>
              _toggleLogin(
            userId: userId,
            enable: enable,
            label: label,
          ),
        );
      case AcademicSetupSection.teachers:
        return _TeacherTableSection(
          title: 'Teachers',
          subtitle:
              'Maintain teacher records that link into assignments, question authorship, and exam ownership.',
          value: ref.watch(setupTeachersProvider),
          onImport: () => _openTeacherImportDialog(user),
          selectedIds: _selectedTeacherIds,
          onSelectionChanged: _toggleTeacherSelection,
          onSelectAllVisible: _toggleAllTeacherSelections,
          onBulkCreate: _bulkCreateTeacherLogins,
          onBulkEnable: (items) => _bulkToggleTeacherLogins(items, enable: true),
          onBulkDisable: (items) => _bulkToggleTeacherLogins(items, enable: false),
          onExportSelected: _exportSelectedTeachers,
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          onCreateLogin: _createTeacherLogin,
          onResetPassword: ({required userId, required title}) =>
              _resetUserPassword(userId: userId, title: title),
          onToggleLogin: ({
            required userId,
            required enable,
            required label,
          }) =>
              _toggleLogin(
            userId: userId,
            enable: enable,
            label: label,
          ),
        );
      case AcademicSetupSection.teacherAssignments:
        final teachers = ref
            .watch(lookupTeachersProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <TeacherProfileAdminModel>[],
            );
        final programs = ref
            .watch(lookupProgramsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <ProgramAdminModel>[],
            );
        final subjects = ref
            .watch(lookupSubjectsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <SubjectAdminModel>[],
            );
        final cohorts = ref
            .watch(lookupCohortsProvider(user.instituteId))
            .maybeWhen(
              data: (items) => items,
              orElse: () => const <CohortAdminModel>[],
            );
        return _AsyncSection<TeacherAssignmentAdminModel>(
          title: 'Teacher assignments',
          subtitle:
              'Assign teachers to academic scope and subjects so teaching responsibilities stay explicit.',
          value: ref.watch(setupTeacherAssignmentsProvider),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          itemBuilder: (context, item) => _EntityCard(
            title: _lookupName(teachers, item.teacherId),
            subtitle:
                '${_lookupName(subjects, item.subjectId)} • ${_lookupName(programs, item.programId)}',
            chips: [
              item.assignmentRole,
              if (item.cohortId != null) _lookupName(cohorts, item.cohortId),
              if (item.isPrimary) 'Primary',
              item.isActive ? 'Active' : 'Inactive',
            ],
          ),
        );
    }
  }
}

class _AsyncSection<T> extends StatelessWidget {
  const _AsyncSection({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onEdit,
    required this.itemBuilder,
    this.extraActionsBuilder,
  });

  final String title;
  final String subtitle;
  final AsyncValue<List<T>> value;
  final ValueChanged<T> onEdit;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final Widget Function(BuildContext context, T item)? extraActionsBuilder;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppSectionHeader(title: title, subtitle: subtitle),
            const SizedBox(height: 18),
            value.when(
              data: (items) {
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: AppEmptyState(
                      title: 'No records match these filters',
                      message:
                          'Try a broader search, adjust the filters, or add the first record in this section.',
                    ),
                  );
                }
                return Column(
                  children: items
                      .map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            children: [
                              Stack(
                                children: [
                                  itemBuilder(context, item),
                                  Positioned(
                                    top: 12,
                                    right: 12,
                                    child: IconButton.outlined(
                                      onPressed: () => onEdit(item),
                                      icon: const Icon(Icons.edit_outlined),
                                      tooltip: 'Edit',
                                    ),
                                  ),
                                ],
                              ),
                              if (extraActionsBuilder != null) ...[
                                const SizedBox(height: 10),
                                extraActionsBuilder!(context, item),
                              ],
                            ],
                          ),
                        ),
                      )
                      .toList(),
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: AppErrorState(message: readApiErrorMessage(error)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntityCard extends StatelessWidget {
  const _EntityCard({
    required this.title,
    required this.subtitle,
    required this.chips,
    this.description,
  });

  final String title;
  final String subtitle;
  final List<String> chips;
  final String? description;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(subtitle),
            if (description != null && description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(description!),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: chips
                  .where((chip) => chip.trim().isNotEmpty)
                  .map((chip) => _ChipLabel(label: chip))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

typedef _ResetPasswordAction =
    Future<void> Function({required String userId, required String title});
typedef _ToggleLoginAction =
    Future<void> Function({
      required String userId,
      required bool enable,
      required String label,
    });

class _StudentTableSection extends StatelessWidget {
  const _StudentTableSection({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.programs,
    required this.cohorts,
    required this.onImport,
    required this.selectedIds,
    required this.onSelectionChanged,
    required this.onSelectAllVisible,
    required this.onBulkCreate,
    required this.onBulkEnable,
    required this.onBulkDisable,
    required this.onExportSelected,
    required this.onEdit,
    required this.onCreateLogin,
    required this.onResetPassword,
    required this.onToggleLogin,
  });

  final String title;
  final String subtitle;
  final AsyncValue<List<StudentProfileAdminModel>> value;
  final List<ProgramAdminModel> programs;
  final List<CohortAdminModel> cohorts;
  final VoidCallback onImport;
  final Set<String> selectedIds;
  final void Function(String id, bool selected) onSelectionChanged;
  final void Function(List<StudentProfileAdminModel> items, bool selected)
      onSelectAllVisible;
  final Future<void> Function(List<StudentProfileAdminModel> items) onBulkCreate;
  final Future<void> Function(List<StudentProfileAdminModel> items) onBulkEnable;
  final Future<void> Function(List<StudentProfileAdminModel> items) onBulkDisable;
  final Future<void> Function(List<StudentProfileAdminModel> items) onExportSelected;
  final ValueChanged<StudentProfileAdminModel> onEdit;
  final Future<void> Function(StudentProfileAdminModel item) onCreateLogin;
  final _ResetPasswordAction onResetPassword;
  final _ToggleLoginAction onToggleLogin;

  @override
  Widget build(BuildContext context) {
    return _RosterTableShell(
      title: title,
      subtitle: subtitle,
      onImport: onImport,
      value: value,
      selectedCount: selectedIds.length,
      onBulkCreate: onBulkCreate,
      onBulkEnable: onBulkEnable,
      onBulkDisable: onBulkDisable,
      onExportSelected: onExportSelected,
      tableBuilder: (items) => DataTable(
        columnSpacing: 18,
        showCheckboxColumn: true,
        onSelectAll: (selected) => onSelectAllVisible(items, selected ?? false),
        columns: const [
          DataColumn(label: Text('Student')),
          DataColumn(label: Text('Admission')),
          DataColumn(label: Text('Program')),
          DataColumn(label: Text('Contact')),
          DataColumn(label: Text('Login')),
          DataColumn(label: Text('Actions')),
        ],
        rows: items
            .map(
              (item) => DataRow(
                selected: selectedIds.contains(item.id),
                onSelectChanged: (selected) =>
                    onSelectionChanged(item.id, selected ?? false),
                cells: [
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.fullName,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(item.isActive ? 'Active profile' : 'Inactive profile'),
                      ],
                    ),
                  ),
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.admissionNo),
                        Text(item.gender),
                      ],
                    ),
                  ),
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_lookupName(programs, item.programId)),
                        Text(
                          item.cohortId == null
                              ? 'No cohort'
                              : _lookupName(cohorts, item.cohortId),
                        ),
                      ],
                    ),
                  ),
                  DataCell(Text(item.email.isEmpty ? item.phone : item.email)),
                  DataCell(_LoginStatusCell(item: item)),
                  DataCell(
                    _TableRowActions(
                      onEdit: () => onEdit(item),
                      onCreateLogin: item.hasLogin ? null : () => onCreateLogin(item),
                      onResetPassword: item.accountUserId == null
                          ? null
                          : () => onResetPassword(
                                userId: item.accountUserId!,
                                title: 'Reset student password',
                              ),
                      onDisable: item.hasLogin && item.loginIsActive && item.accountUserId != null
                          ? () => onToggleLogin(
                                userId: item.accountUserId!,
                                enable: false,
                                label: item.fullName,
                              )
                          : null,
                      onEnable: item.hasLogin && !item.loginIsActive && item.accountUserId != null
                          ? () => onToggleLogin(
                                userId: item.accountUserId!,
                                enable: true,
                                label: item.fullName,
                              )
                          : null,
                    ),
                  ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TeacherTableSection extends StatelessWidget {
  const _TeacherTableSection({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onImport,
    required this.selectedIds,
    required this.onSelectionChanged,
    required this.onSelectAllVisible,
    required this.onBulkCreate,
    required this.onBulkEnable,
    required this.onBulkDisable,
    required this.onExportSelected,
    required this.onEdit,
    required this.onCreateLogin,
    required this.onResetPassword,
    required this.onToggleLogin,
  });

  final String title;
  final String subtitle;
  final AsyncValue<List<TeacherProfileAdminModel>> value;
  final VoidCallback onImport;
  final Set<String> selectedIds;
  final void Function(String id, bool selected) onSelectionChanged;
  final void Function(List<TeacherProfileAdminModel> items, bool selected)
      onSelectAllVisible;
  final Future<void> Function(List<TeacherProfileAdminModel> items) onBulkCreate;
  final Future<void> Function(List<TeacherProfileAdminModel> items) onBulkEnable;
  final Future<void> Function(List<TeacherProfileAdminModel> items) onBulkDisable;
  final Future<void> Function(List<TeacherProfileAdminModel> items) onExportSelected;
  final ValueChanged<TeacherProfileAdminModel> onEdit;
  final Future<void> Function(TeacherProfileAdminModel item) onCreateLogin;
  final _ResetPasswordAction onResetPassword;
  final _ToggleLoginAction onToggleLogin;

  @override
  Widget build(BuildContext context) {
    return _RosterTableShell(
      title: title,
      subtitle: subtitle,
      onImport: onImport,
      value: value,
      selectedCount: selectedIds.length,
      onBulkCreate: onBulkCreate,
      onBulkEnable: onBulkEnable,
      onBulkDisable: onBulkDisable,
      onExportSelected: onExportSelected,
      tableBuilder: (items) => DataTable(
        columnSpacing: 18,
        showCheckboxColumn: true,
        onSelectAll: (selected) => onSelectAllVisible(items, selected ?? false),
        columns: const [
          DataColumn(label: Text('Teacher')),
          DataColumn(label: Text('Employee')),
          DataColumn(label: Text('Specialization')),
          DataColumn(label: Text('Contact')),
          DataColumn(label: Text('Login')),
          DataColumn(label: Text('Actions')),
        ],
        rows: items
            .map(
              (item) => DataRow(
                selected: selectedIds.contains(item.id),
                onSelectChanged: (selected) =>
                    onSelectionChanged(item.id, selected ?? false),
                cells: [
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.fullName,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(item.isActive ? 'Active profile' : 'Inactive profile'),
                      ],
                    ),
                  ),
                  DataCell(
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.employeeCode),
                        Text(item.qualification.isEmpty ? 'No qualification' : item.qualification),
                      ],
                    ),
                  ),
                  DataCell(Text(item.specialization.isEmpty ? 'General' : item.specialization)),
                  DataCell(Text(item.email.isEmpty ? item.phone : item.email)),
                  DataCell(_LoginStatusCell(item: item)),
                  DataCell(
                    _TableRowActions(
                      onEdit: () => onEdit(item),
                      onCreateLogin: item.hasLogin ? null : () => onCreateLogin(item),
                      onResetPassword: item.accountUserId == null
                          ? null
                          : () => onResetPassword(
                                userId: item.accountUserId!,
                                title: 'Reset teacher password',
                              ),
                      onDisable: item.hasLogin && item.loginIsActive && item.accountUserId != null
                          ? () => onToggleLogin(
                                userId: item.accountUserId!,
                                enable: false,
                                label: item.fullName,
                              )
                          : null,
                      onEnable: item.hasLogin && !item.loginIsActive && item.accountUserId != null
                          ? () => onToggleLogin(
                                userId: item.accountUserId!,
                                enable: true,
                                label: item.fullName,
                              )
                          : null,
                    ),
                  ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

class _RosterTableShell<T> extends StatelessWidget {
  const _RosterTableShell({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onImport,
    required this.selectedCount,
    required this.onBulkCreate,
    required this.onBulkEnable,
    required this.onBulkDisable,
    required this.onExportSelected,
    required this.tableBuilder,
  });

  final String title;
  final String subtitle;
  final AsyncValue<List<T>> value;
  final VoidCallback onImport;
  final int selectedCount;
  final Future<void> Function(List<T> items) onBulkCreate;
  final Future<void> Function(List<T> items) onBulkEnable;
  final Future<void> Function(List<T> items) onBulkDisable;
  final Future<void> Function(List<T> items) onExportSelected;
  final Widget Function(List<T> items) tableBuilder;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(
            title: title,
            subtitle: subtitle,
            action: AppButton(
              label: 'Bulk upload',
              onPressed: onImport,
              icon: Icons.upload_file_outlined,
              variant: AppButtonVariant.secondary,
            ),
          ),
          const SizedBox(height: 18),
          value.when(
            data: (items) {
              if (items.isEmpty) {
                return const AppEmptyState(
                  title: 'No records match these filters',
                  message:
                      'Try a broader search, adjust the filters, or upload your first roster in bulk.',
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (selectedCount > 0) ...[
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        AppBadge(label: '$selectedCount selected'),
                        AppButton(
                          label: 'Create selected logins',
                          onPressed: () => onBulkCreate(items),
                          icon: Icons.person_add_alt_1_outlined,
                          variant: AppButtonVariant.primary,
                        ),
                        AppButton(
                          label: 'Enable selected logins',
                          onPressed: () => onBulkEnable(items),
                          icon: Icons.check_circle_outline,
                          variant: AppButtonVariant.secondary,
                        ),
                        AppButton(
                          label: 'Disable selected logins',
                          onPressed: () => onBulkDisable(items),
                          icon: Icons.block_outlined,
                          variant: AppButtonVariant.ghost,
                        ),
                        AppButton(
                          label: 'Export selected',
                          onPressed: () => onExportSelected(items),
                          icon: Icons.download_outlined,
                          variant: AppButtonVariant.secondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 980),
                      child: tableBuilder(items),
                    ),
                  ),
                ],
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: AppErrorState(message: readApiErrorMessage(error)),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginStatusCell extends StatelessWidget {
  const _LoginStatusCell({required this.item});

  final dynamic item;

  @override
  Widget build(BuildContext context) {
    final hasLogin = item.hasLogin as bool? ?? false;
    final username = item.loginUsername as String?;
    final loginIsActive = item.loginIsActive as bool? ?? false;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppBadge(
          label: hasLogin ? (loginIsActive ? 'Active' : 'Disabled') : 'No Login',
          backgroundColor: hasLogin
              ? (loginIsActive
                    ? AppColors.success.withValues(alpha: 0.12)
                    : AppColors.textSecondary.withValues(alpha: 0.12))
              : AppColors.warning.withValues(alpha: 0.12),
          foregroundColor: hasLogin
              ? (loginIsActive ? AppColors.success : AppColors.textSecondary)
              : AppColors.warning,
        ),
        if (hasLogin && username != null && username.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(username),
        ],
      ],
    );
  }
}

class _TableRowActions extends StatelessWidget {
  const _TableRowActions({
    required this.onEdit,
    this.onCreateLogin,
    this.onResetPassword,
    this.onDisable,
    this.onEnable,
  });

  final VoidCallback onEdit;
  final VoidCallback? onCreateLogin;
  final VoidCallback? onResetPassword;
  final VoidCallback? onDisable;
  final VoidCallback? onEnable;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        IconButton.outlined(
          onPressed: onEdit,
          tooltip: 'Edit',
          icon: const Icon(Icons.edit_outlined),
        ),
        if (onCreateLogin != null)
          IconButton.outlined(
            onPressed: onCreateLogin,
            tooltip: 'Create login',
            icon: const Icon(Icons.person_add_alt_1_outlined),
          ),
        if (onResetPassword != null)
          IconButton.outlined(
            onPressed: onResetPassword,
            tooltip: 'Reset password',
            icon: const Icon(Icons.lock_reset_outlined),
          ),
        if (onDisable != null)
          IconButton.outlined(
            onPressed: onDisable,
            tooltip: 'Disable login',
            icon: const Icon(Icons.block_outlined),
          ),
        if (onEnable != null)
          IconButton.outlined(
            onPressed: onEnable,
            tooltip: 'Enable login',
            icon: const Icon(Icons.check_circle_outline),
          ),
      ],
    );
  }
}

class _RosterImportDialog extends StatefulWidget {
  const _RosterImportDialog({
    required this.title,
    required this.subtitle,
    required this.instituteId,
    required this.fetchTemplate,
    required this.previewImport,
    required this.finalizeImport,
  });

  final String title;
  final String subtitle;
  final String instituteId;
  final Future<Map<String, dynamic>> Function() fetchTemplate;
  final Future<RosterImportPreview> Function(MultipartFile file) previewImport;
  final Future<BulkImportResult> Function(RosterImportPreview preview) finalizeImport;

  @override
  State<_RosterImportDialog> createState() => _RosterImportDialogState();
}

class _RosterImportDialogState extends State<_RosterImportDialog> {
  bool _isLoading = false;
  String? _error;
  String? _selectedFileName;
  RosterImportPreview? _preview;

  Future<void> _downloadTemplate() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final payload = await widget.fetchTemplate();
      await downloadTextFile(
        filename: '${widget.title.toLowerCase().replaceAll(' ', '_')}.csv',
        content: payload['csv_content'] as String? ?? '',
        mimeType: 'text/csv',
      );
    } catch (error) {
      setState(() => _error = readApiErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickAndPreview() async {
    final result = await FilePicker.platform.pickFiles(
      withData: true,
      type: FileType.custom,
      allowedExtensions: const ['csv'],
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.single;
    final bytes = file.bytes;
    if (bytes == null) {
      setState(() => _error = 'Unable to read the selected CSV file.');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
      _selectedFileName = file.name;
    });
    try {
      final preview = await widget.previewImport(
        MultipartFile.fromBytes(bytes, filename: file.name),
      );
      if (!mounted) return;
      setState(() => _preview = preview);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = readApiErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _finalizeImport() async {
    if (_preview == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await widget.finalizeImport(_preview!);
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = readApiErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: widget.title,
      subtitle: widget.subtitle,
      eyebrow: 'Roster import',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: _preview == null ? 'Preview import' : 'Import valid rows',
      onPrimaryAction: _preview == null ? _pickAndPreview : _finalizeImport,
      secondaryActionLabel: 'Download template',
      onSecondaryAction: _downloadTemplate,
      isSaving: _isLoading,
      maxWidth: 980,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedFileName != null) Text('Selected file: $_selectedFileName'),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.error,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          if (_preview == null)
            const Text(
              'The CSV template includes profile fields plus optional login creation columns for username and password.',
            )
          else ...[
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MetaChip(label: 'Rows ${_preview!.totalRows}'),
                _MetaChip(label: 'Valid ${_preview!.validRows}'),
                _MetaChip(label: 'Invalid ${_preview!.invalidRows}'),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 420,
              child: ListView.separated(
                itemCount: _preview!.rows.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final row = _preview!.rows[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    isThreeLine: !row.isValid && row.errors.isNotEmpty,
                    title: Text(
                      row.displayName.isEmpty ? 'Row ${row.rowNumber}' : row.displayName,
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${row.identifier}${row.createLogin ? ' • login ${row.username.isEmpty ? 'auto' : row.username}' : ''}',
                        ),
                        if (!row.isValid && row.errors.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            row.errors.entries
                                .map((entry) => '${entry.key}: ${entry.value}')
                                .join('  |  '),
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ],
                    ),
                    trailing: Text(
                      row.isValid ? 'Valid' : 'Issue',
                      style: TextStyle(
                        color: row.isValid ? AppColors.success : AppColors.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _CreateLoginDialog extends StatefulWidget {
  const _CreateLoginDialog({
    required this.title,
    required this.suggestedUsername,
  });

  final String title;
  final String suggestedUsername;

  @override
  State<_CreateLoginDialog> createState() => _CreateLoginDialogState();
}

class _CreateLoginDialogState extends State<_CreateLoginDialog> {
  late final TextEditingController _usernameController;
  late final TextEditingController _passwordController;
  late final TextEditingController _confirmController;
  bool _autoGenerate = false;

  @override
  void initState() {
    super.initState();
    _usernameController = TextEditingController(text: widget.suggestedUsername.toLowerCase());
    _passwordController = TextEditingController();
    _confirmController = TextEditingController();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: widget.title,
      subtitle:
          'Create a separate login account for this academic profile. Share credentials securely. Password will not be shown again.',
      eyebrow: 'Credential management',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Create login',
      onPrimaryAction: () {
        Navigator.of(context).pop({
          'username': _usernameController.text.trim(),
          'password': _passwordController.text,
          'confirm_password': _confirmController.text,
          'auto_generate': _autoGenerate,
        });
      },
      maxWidth: 620,
      child: Column(
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _autoGenerate,
            title: const Text('Auto-generate credentials'),
            subtitle: const Text(
              'Generate a safe username and temporary password based on the academic profile.',
            ),
            onChanged: (value) => setState(() => _autoGenerate = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _usernameController,
            enabled: !_autoGenerate,
            decoration: const InputDecoration(labelText: 'Username'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            enabled: !_autoGenerate,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmController,
            enabled: !_autoGenerate,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Confirm password'),
          ),
        ],
      ),
    );
  }
}

class _ResetPasswordDialog extends StatefulWidget {
  const _ResetPasswordDialog({required this.title});

  final String title;

  @override
  State<_ResetPasswordDialog> createState() => _ResetPasswordDialogState();
}

class _ResetPasswordDialogState extends State<_ResetPasswordDialog> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _autoGenerate = true;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: widget.title,
      subtitle:
          'Reset the login password. Share credentials securely. Password will not be shown again.',
      eyebrow: 'Credential management',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Reset password',
      onPrimaryAction: () {
        Navigator.of(context).pop({
          'new_password': _passwordController.text,
          'confirm_password': _confirmController.text,
          'auto_generate': _autoGenerate,
        });
      },
      maxWidth: 620,
      child: Column(
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _autoGenerate,
            title: const Text('Generate temporary password'),
            subtitle: const Text('Use this when you want to share a fresh one-time password securely.'),
            onChanged: (value) => setState(() => _autoGenerate = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            enabled: !_autoGenerate,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'New password'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirmController,
            enabled: !_autoGenerate,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Confirm password'),
          ),
        ],
      ),
    );
  }
}

class _SectionSelectorCard extends StatelessWidget {
  const _SectionSelectorCard({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _SectionCardItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: Ink(
        width: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: selected
              ? AppColors.primary.withValues(alpha: 0.08)
              : Colors.white,
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.textPrimary.withValues(alpha: 0.03),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.icon, color: const Color(0xFF113B39)),
              const SizedBox(height: 12),
              Text(
                item.title,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(item.subtitle),
            ],
          ),
        ),
      ),
    );
  }
}

class _StaticInfoPill extends StatelessWidget {
  const _StaticInfoPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Text('$label: $value'),
      ),
    );
  }
}

class _ChipLabel extends StatelessWidget {
  const _ChipLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return AppBadge(label: label);
  }
}

class _SectionCardItem {
  const _SectionCardItem({
    required this.section,
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final AcademicSetupSection section;
  final String title;
  final String subtitle;
  final IconData icon;
}

const _sectionCards = [
  _SectionCardItem(
    section: AcademicSetupSection.academicYears,
    title: 'Academic Years',
    subtitle: 'Year windows and current cycle',
    icon: Icons.date_range_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.programs,
    title: 'Programs',
    subtitle: 'Classes, courses, and batches',
    icon: Icons.class_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.cohorts,
    title: 'Cohorts',
    subtitle: 'Sections and grouped batches',
    icon: Icons.groups_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.subjects,
    title: 'Subjects',
    subtitle: 'Academic subject catalog',
    icon: Icons.menu_book_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.topics,
    title: 'Topics',
    subtitle: 'Nested topic hierarchy',
    icon: Icons.account_tree_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.students,
    title: 'Students',
    subtitle: 'Student profile records',
    icon: Icons.school_outlined,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.teachers,
    title: 'Teachers',
    subtitle: 'Teacher profile records',
    icon: Icons.person_outline,
  ),
  _SectionCardItem(
    section: AcademicSetupSection.teacherAssignments,
    title: 'Assignments',
    subtitle: 'Teacher to subject mapping',
    icon: Icons.assignment_ind_outlined,
  ),
];

String _buttonLabelForSection(AcademicSetupSection section) {
  return switch (section) {
    AcademicSetupSection.academicYears => 'Add year',
    AcademicSetupSection.programs => 'Add program',
    AcademicSetupSection.cohorts => 'Add cohort',
    AcademicSetupSection.subjects => 'Add subject',
    AcademicSetupSection.topics => 'Add topic',
    AcademicSetupSection.students => 'Add student',
    AcademicSetupSection.teachers => 'Add teacher',
    AcademicSetupSection.teacherAssignments => 'Add assignment',
  };
}

String _lookupName(List<dynamic> items, String? id) {
  if (id == null || id.isEmpty) {
    return 'Not linked';
  }
  for (final item in items) {
    if (item is ProgramAdminModel && item.id == id) return item.name;
    if (item is SubjectAdminModel && item.id == id) return item.name;
    if (item is TopicAdminModel && item.id == id) return item.name;
    if (item is TeacherProfileAdminModel && item.id == id) return item.fullName;
    if (item is CohortAdminModel && item.id == id) return item.name;
    if (item is AcademicYearAdminModel && item.id == id) return item.name;
  }
  return 'Unknown';
}

class _DialogShell extends StatelessWidget {
  const _DialogShell({
    required this.title,
    required this.child,
    required this.onCancel,
    required this.onSave,
    required this.isSaving,
    required this.saveLabel,
  });

  final String title;
  final Widget child;
  final VoidCallback onCancel;
  final VoidCallback onSave;
  final bool isSaving;
  final String saveLabel;

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: title,
      subtitle:
          'Keep master data accurate and consistent so the academic workflows stay clean across the platform.',
      eyebrow: 'Academic setup',
      onClose: onCancel,
      primaryActionLabel: saveLabel,
      onPrimaryAction: onSave,
      isSaving: isSaving,
      maxWidth: 760,
      maxHeight: 780,
      child: child,
    );
  }
}

class _AcademicYearDialog extends ConsumerStatefulWidget {
  const _AcademicYearDialog({required this.user, this.initial});

  final AppUser user;
  final AcademicYearAdminModel? initial;

  @override
  ConsumerState<_AcademicYearDialog> createState() =>
      _AcademicYearDialogState();
}

class _AcademicYearDialogState extends ConsumerState<_AcademicYearDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _startController;
  late final TextEditingController _endController;
  String? _instituteId;
  bool _isCurrent = false;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _startController = TextEditingController(text: initial?.startDate ?? '');
    _endController = TextEditingController(text: initial?.endDate ?? '');
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _isCurrent = initial?.isCurrent ?? false;
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _startController.dispose();
    _endController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _instituteId!.isEmpty) {
      _showError('Institute is required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'name': _nameController.text.trim(),
      'start_date': _startController.text.trim(),
      'end_date': _endController.text.trim(),
      'is_current': _isCurrent,
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateAcademicYear(widget.initial!.id, payload);
      } else {
        await repo.createAcademicYear(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    return _DialogShell(
      title: _isEditing ? 'Edit academic year' : 'Add academic year',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create year',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) => setState(() => _instituteId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Academic year name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _startController,
            readOnly: true,
            decoration: const InputDecoration(
              labelText: 'Start date',
              suffixIcon: Icon(Icons.date_range_outlined),
            ),
            onTap: () async {
              final picked = await pickLocalDate(
                context,
                initialDate: parseDateInput(_startController.text),
              );
              if (picked != null) {
                _startController.text = formatDateForInput(picked);
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _endController,
            readOnly: true,
            decoration: const InputDecoration(
              labelText: 'End date',
              suffixIcon: Icon(Icons.date_range_outlined),
            ),
            onTap: () async {
              final picked = await pickLocalDate(
                context,
                initialDate: parseDateInput(_endController.text),
              );
              if (picked != null) {
                _endController.text = formatDateForInput(picked);
              }
            },
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isCurrent,
            title: const Text('Current academic year'),
            onChanged: (value) => setState(() => _isCurrent = value),
          ),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _ProgramDialog extends ConsumerStatefulWidget {
  const _ProgramDialog({required this.user, this.initial});

  final AppUser user;
  final ProgramAdminModel? initial;

  @override
  ConsumerState<_ProgramDialog> createState() => _ProgramDialogState();
}

class _ProgramDialogState extends ConsumerState<_ProgramDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _codeController;
  late final TextEditingController _categoryController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _sortOrderController;
  String? _instituteId;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _codeController = TextEditingController(text: initial?.code ?? '');
    _categoryController = TextEditingController(text: initial?.category ?? '');
    _descriptionController = TextEditingController(
      text: initial?.description ?? '',
    );
    _sortOrderController = TextEditingController(
      text: '${initial?.sortOrder ?? 0}',
    );
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _categoryController.dispose();
    _descriptionController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _instituteId!.isEmpty) {
      _showError('Institute is required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'name': _nameController.text.trim(),
      'code': _codeController.text.trim(),
      'category': _categoryController.text.trim(),
      'description': _descriptionController.text.trim(),
      'sort_order': int.tryParse(_sortOrderController.text.trim()) ?? 0,
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateProgram(widget.initial!.id, payload);
      } else {
        await repo.createProgram(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    return _DialogShell(
      title: _isEditing ? 'Edit program' : 'Add program',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create program',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) => setState(() => _instituteId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Program name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _codeController,
            decoration: const InputDecoration(labelText: 'Program code'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _categoryController,
            decoration: const InputDecoration(labelText: 'Category'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _sortOrderController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Sort order'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _CohortDialog extends ConsumerStatefulWidget {
  const _CohortDialog({required this.user, this.initial});

  final AppUser user;
  final CohortAdminModel? initial;

  @override
  ConsumerState<_CohortDialog> createState() => _CohortDialogState();
}

class _CohortDialogState extends ConsumerState<_CohortDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _codeController;
  late final TextEditingController _capacityController;
  String? _instituteId;
  String? _programId;
  String? _academicYearId;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _codeController = TextEditingController(text: initial?.code ?? '');
    _capacityController = TextEditingController(
      text: initial?.capacity?.toString() ?? '',
    );
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _programId = initial?.programId;
    _academicYearId = initial?.academicYearId;
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null ||
        _instituteId!.isEmpty ||
        _programId == null ||
        _academicYearId == null) {
      _showError('Institute, program, and academic year are required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'program': _programId,
      'academic_year': _academicYearId,
      'name': _nameController.text.trim(),
      'code': _codeController.text.trim(),
      'capacity': int.tryParse(_capacityController.text.trim()),
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateCohort(widget.initial!.id, payload);
      } else {
        await repo.createCohort(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    final programs = ref
        .watch(lookupProgramsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <ProgramAdminModel>[],
        );
    final years = ref
        .watch(lookupAcademicYearsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicYearAdminModel>[],
        );
    return _DialogShell(
      title: _isEditing ? 'Edit cohort' : 'Add cohort',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create cohort',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) {
              setState(() {
                _instituteId = value;
                _programId = null;
                _academicYearId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _programId,
            decoration: const InputDecoration(labelText: 'Program'),
            items: programs
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _programId = value),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _academicYearId,
            decoration: const InputDecoration(labelText: 'Academic year'),
            items: years
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _academicYearId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Cohort name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _codeController,
            decoration: const InputDecoration(labelText: 'Cohort code'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _capacityController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Capacity'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _SubjectDialog extends ConsumerStatefulWidget {
  const _SubjectDialog({required this.user, this.initial});

  final AppUser user;
  final SubjectAdminModel? initial;

  @override
  ConsumerState<_SubjectDialog> createState() => _SubjectDialogState();
}

class _SubjectDialogState extends ConsumerState<_SubjectDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _codeController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _sortOrderController;
  String? _instituteId;
  String? _programId;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _codeController = TextEditingController(text: initial?.code ?? '');
    _descriptionController = TextEditingController(
      text: initial?.description ?? '',
    );
    _sortOrderController = TextEditingController(
      text: '${initial?.sortOrder ?? 0}',
    );
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _programId = initial?.programId;
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _instituteId!.isEmpty) {
      _showError('Institute is required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'program': _programId,
      'name': _nameController.text.trim(),
      'code': _codeController.text.trim(),
      'description': _descriptionController.text.trim(),
      'sort_order': int.tryParse(_sortOrderController.text.trim()) ?? 0,
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateSubject(widget.initial!.id, payload);
      } else {
        await repo.createSubject(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    final programs = ref
        .watch(lookupProgramsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <ProgramAdminModel>[],
        );
    return _DialogShell(
      title: _isEditing ? 'Edit subject' : 'Add subject',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create subject',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) {
              setState(() {
                _instituteId = value;
                _programId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            initialValue: _programId,
            decoration: const InputDecoration(labelText: 'Program'),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('No program'),
              ),
              ...programs.map(
                (item) => DropdownMenuItem<String?>(
                  value: item.id,
                  child: Text(item.name),
                ),
              ),
            ],
            onChanged: (value) => setState(() => _programId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Subject name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _codeController,
            decoration: const InputDecoration(labelText: 'Subject code'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _sortOrderController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Sort order'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _TopicDialog extends ConsumerStatefulWidget {
  const _TopicDialog({required this.user, this.initial});

  final AppUser user;
  final TopicAdminModel? initial;

  @override
  ConsumerState<_TopicDialog> createState() => _TopicDialogState();
}

class _TopicDialogState extends ConsumerState<_TopicDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _codeController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _sortOrderController;
  String? _instituteId;
  String? _subjectId;
  String? _parentTopicId;
  String _difficulty = 'intermediate';
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _nameController = TextEditingController(text: initial?.name ?? '');
    _codeController = TextEditingController(text: initial?.code ?? '');
    _descriptionController = TextEditingController(
      text: initial?.description ?? '',
    );
    _sortOrderController = TextEditingController(
      text: '${initial?.sortOrder ?? 0}',
    );
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _subjectId = initial?.subjectId;
    _parentTopicId = initial?.parentTopicId;
    _difficulty = initial?.difficultyLevel ?? 'intermediate';
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _codeController.dispose();
    _descriptionController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _subjectId == null) {
      _showError('Institute and subject are required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'subject': _subjectId,
      'parent_topic': _parentTopicId,
      'name': _nameController.text.trim(),
      'code': _codeController.text.trim(),
      'description': _descriptionController.text.trim(),
      'difficulty_level': _difficulty,
      'sort_order': int.tryParse(_sortOrderController.text.trim()) ?? 0,
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateTopic(widget.initial!.id, payload);
      } else {
        await repo.createTopic(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    final subjects = ref
        .watch(lookupSubjectsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <SubjectAdminModel>[],
        );
    final topics = ref
        .watch(lookupTopicsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <TopicAdminModel>[],
        );
    final parentTopicOptions = topics
        .where(
          (item) =>
              item.subjectId == _subjectId && item.id != widget.initial?.id,
        )
        .toList();
    return _DialogShell(
      title: _isEditing ? 'Edit topic' : 'Add topic',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create topic',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) {
              setState(() {
                _instituteId = value;
                _subjectId = null;
                _parentTopicId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _subjectId,
            decoration: const InputDecoration(labelText: 'Subject'),
            items: subjects
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() {
                _subjectId = value;
                _parentTopicId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            initialValue: _parentTopicId,
            decoration: const InputDecoration(labelText: 'Parent topic'),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('No parent topic'),
              ),
              ...parentTopicOptions.map(
                (item) => DropdownMenuItem<String?>(
                  value: item.id,
                  child: Text(item.name),
                ),
              ),
            ],
            onChanged: (value) => setState(() => _parentTopicId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Topic name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _codeController,
            decoration: const InputDecoration(labelText: 'Topic code'),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _difficulty,
            decoration: const InputDecoration(labelText: 'Difficulty'),
            items: const [
              DropdownMenuItem(value: 'foundation', child: Text('Foundation')),
              DropdownMenuItem(
                value: 'intermediate',
                child: Text('Intermediate'),
              ),
              DropdownMenuItem(value: 'advanced', child: Text('Advanced')),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() => _difficulty = value);
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _sortOrderController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Sort order'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Description'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _StudentDialog extends ConsumerStatefulWidget {
  const _StudentDialog({required this.user, this.initial});

  final AppUser user;
  final StudentProfileAdminModel? initial;

  @override
  ConsumerState<_StudentDialog> createState() => _StudentDialogState();
}

class _StudentDialogState extends ConsumerState<_StudentDialog> {
  late final TextEditingController _admissionNoController;
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _dateOfBirthController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _guardianNameController;
  late final TextEditingController _guardianPhoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _joinedAtController;
  String? _instituteId;
  String? _academicYearId;
  String? _programId;
  String? _cohortId;
  String _gender = 'prefer_not_to_say';
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _admissionNoController = TextEditingController(
      text: initial?.admissionNo ?? '',
    );
    _firstNameController = TextEditingController(
      text: initial?.firstName ?? '',
    );
    _lastNameController = TextEditingController(text: initial?.lastName ?? '');
    _dateOfBirthController = TextEditingController(
      text: initial?.dateOfBirth ?? '',
    );
    _emailController = TextEditingController(text: initial?.email ?? '');
    _phoneController = TextEditingController(text: initial?.phone ?? '');
    _guardianNameController = TextEditingController(
      text: initial?.guardianName ?? '',
    );
    _guardianPhoneController = TextEditingController(
      text: initial?.guardianPhone ?? '',
    );
    _addressController = TextEditingController(text: initial?.address ?? '');
    _joinedAtController = TextEditingController(text: initial?.joinedAt ?? '');
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _academicYearId = initial?.academicYearId;
    _programId = initial?.programId;
    _cohortId = initial?.cohortId;
    _gender = initial?.gender ?? 'prefer_not_to_say';
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _admissionNoController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dateOfBirthController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _guardianNameController.dispose();
    _guardianPhoneController.dispose();
    _addressController.dispose();
    _joinedAtController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _academicYearId == null || _programId == null) {
      _showError('Institute, academic year, and program are required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'academic_year': _academicYearId,
      'program': _programId,
      'cohort': _cohortId,
      'admission_no': _admissionNoController.text.trim(),
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'gender': _gender,
      'date_of_birth': _emptyToNull(_dateOfBirthController.text),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'guardian_name': _guardianNameController.text.trim(),
      'guardian_phone': _guardianPhoneController.text.trim(),
      'address': _addressController.text.trim(),
      'joined_at': _joinedAtController.text.trim(),
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateStudent(widget.initial!.id, payload);
      } else {
        await repo.createStudent(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    final years = ref
        .watch(lookupAcademicYearsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicYearAdminModel>[],
        );
    final programs = ref
        .watch(lookupProgramsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <ProgramAdminModel>[],
        );
    final cohorts = ref
        .watch(lookupCohortsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <CohortAdminModel>[],
        );
    final cohortOptions = cohorts
        .where(
          (item) =>
              (_programId == null || item.programId == _programId) &&
              (_academicYearId == null ||
                  item.academicYearId == _academicYearId),
        )
        .toList();
    return _DialogShell(
      title: _isEditing ? 'Edit student profile' : 'Add student profile',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create student',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) {
              setState(() {
                _instituteId = value;
                _academicYearId = null;
                _programId = null;
                _cohortId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _academicYearId,
            decoration: const InputDecoration(labelText: 'Academic year'),
            items: years
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() {
                _academicYearId = value;
                _cohortId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _programId,
            decoration: const InputDecoration(labelText: 'Program'),
            items: programs
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() {
                _programId = value;
                _cohortId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            initialValue: _cohortId,
            decoration: const InputDecoration(labelText: 'Cohort'),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('No cohort'),
              ),
              ...cohortOptions.map(
                (item) => DropdownMenuItem<String?>(
                  value: item.id,
                  child: Text(item.name),
                ),
              ),
            ],
            onChanged: (value) => setState(() => _cohortId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _admissionNoController,
            decoration: const InputDecoration(labelText: 'Admission number'),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _firstNameController,
                  decoration: const InputDecoration(labelText: 'First name'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(labelText: 'Last name'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _gender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const [
              DropdownMenuItem(value: 'male', child: Text('Male')),
              DropdownMenuItem(value: 'female', child: Text('Female')),
              DropdownMenuItem(value: 'other', child: Text('Other')),
              DropdownMenuItem(
                value: 'prefer_not_to_say',
                child: Text('Prefer not to say'),
              ),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() => _gender = value);
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _dateOfBirthController,
            readOnly: true,
            decoration: const InputDecoration(
              labelText: 'Date of birth',
              suffixIcon: Icon(Icons.calendar_today_outlined),
            ),
            onTap: () async {
              final picked = await pickLocalDate(
                context,
                initialDate: parseDateInput(_dateOfBirthController.text),
                firstDate: DateTime(1980),
                lastDate: DateTime.now(),
              );
              if (picked != null) {
                _dateOfBirthController.text = formatDateForInput(picked);
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _joinedAtController,
            readOnly: true,
            decoration: const InputDecoration(
              labelText: 'Joined at',
              suffixIcon: Icon(Icons.event_outlined),
            ),
            onTap: () async {
              final picked = await pickLocalDate(
                context,
                initialDate: parseDateInput(_joinedAtController.text),
                firstDate: DateTime(2000),
                lastDate: DateTime(DateTime.now().year + 5),
              );
              if (picked != null) {
                _joinedAtController.text = formatDateForInput(picked);
              }
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _emailController,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _phoneController,
            decoration: const InputDecoration(labelText: 'Phone'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _guardianNameController,
            decoration: const InputDecoration(labelText: 'Guardian name'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _guardianPhoneController,
            decoration: const InputDecoration(labelText: 'Guardian phone'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _addressController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Address'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _TeacherDialog extends ConsumerStatefulWidget {
  const _TeacherDialog({required this.user, this.initial});

  final AppUser user;
  final TeacherProfileAdminModel? initial;

  @override
  ConsumerState<_TeacherDialog> createState() => _TeacherDialogState();
}

class _TeacherDialogState extends ConsumerState<_TeacherDialog> {
  late final TextEditingController _employeeCodeController;
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _qualificationController;
  late final TextEditingController _specializationController;
  late final TextEditingController _bioController;
  late final TextEditingController _joinedAtController;
  String? _instituteId;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _employeeCodeController = TextEditingController(
      text: initial?.employeeCode ?? '',
    );
    _firstNameController = TextEditingController(
      text: initial?.firstName ?? '',
    );
    _lastNameController = TextEditingController(text: initial?.lastName ?? '');
    _emailController = TextEditingController(text: initial?.email ?? '');
    _phoneController = TextEditingController(text: initial?.phone ?? '');
    _qualificationController = TextEditingController(
      text: initial?.qualification ?? '',
    );
    _specializationController = TextEditingController(
      text: initial?.specialization ?? '',
    );
    _bioController = TextEditingController(text: initial?.bio ?? '');
    _joinedAtController = TextEditingController(text: initial?.joinedAt ?? '');
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _isActive = initial?.isActive ?? true;
  }

  @override
  void dispose() {
    _employeeCodeController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _qualificationController.dispose();
    _specializationController.dispose();
    _bioController.dispose();
    _joinedAtController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_instituteId == null || _instituteId!.isEmpty) {
      _showError('Institute is required.');
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'employee_code': _employeeCodeController.text.trim(),
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'qualification': _qualificationController.text.trim(),
      'specialization': _specializationController.text.trim(),
      'bio': _bioController.text.trim(),
      'joined_at': _joinedAtController.text.trim(),
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateTeacher(widget.initial!.id, payload);
      } else {
        await repo.createTeacher(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _pickJoinedDate() async {
    final picked = await pickLocalDate(
      context,
      initialDate: parseDateInput(_joinedAtController.text),
      firstDate: DateTime(2000),
      lastDate: DateTime(DateTime.now().year + 5),
    );
    if (picked != null) {
      _joinedAtController.text = formatDateForInput(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    return _DialogShell(
      title: _isEditing ? 'Edit teacher profile' : 'Add teacher profile',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create teacher',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) => setState(() => _instituteId = value),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _employeeCodeController,
            decoration: const InputDecoration(labelText: 'Employee code'),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _firstNameController,
                  decoration: const InputDecoration(labelText: 'First name'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(labelText: 'Last name'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _joinedAtController,
            readOnly: true,
            decoration: const InputDecoration(
              labelText: 'Joined at',
              suffixIcon: Icon(Icons.event_outlined),
            ),
            onTap: _pickJoinedDate,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _emailController,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _phoneController,
            decoration: const InputDecoration(labelText: 'Phone'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _qualificationController,
            decoration: const InputDecoration(labelText: 'Qualification'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _specializationController,
            decoration: const InputDecoration(labelText: 'Specialization'),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _bioController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Bio'),
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _TeacherAssignmentDialog extends ConsumerStatefulWidget {
  const _TeacherAssignmentDialog({required this.user, this.initial});

  final AppUser user;
  final TeacherAssignmentAdminModel? initial;

  @override
  ConsumerState<_TeacherAssignmentDialog> createState() =>
      _TeacherAssignmentDialogState();
}

class _TeacherAssignmentDialogState
    extends ConsumerState<_TeacherAssignmentDialog> {
  String? _instituteId;
  String? _teacherId;
  String? _academicYearId;
  String? _programId;
  String? _cohortId;
  String? _subjectId;
  String _assignmentRole = 'main_teacher';
  bool _isPrimary = false;
  bool _isActive = true;
  bool _isSaving = false;

  bool get _isEditing => widget.initial != null;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial;
    _instituteId = initial?.instituteId ?? widget.user.instituteId;
    _teacherId = initial?.teacherId;
    _academicYearId = initial?.academicYearId;
    _programId = initial?.programId;
    _cohortId = initial?.cohortId;
    _subjectId = initial?.subjectId;
    _assignmentRole = initial?.assignmentRole ?? 'main_teacher';
    _isPrimary = initial?.isPrimary ?? false;
    _isActive = initial?.isActive ?? true;
  }

  Future<void> _save() async {
    if (_instituteId == null ||
        _teacherId == null ||
        _academicYearId == null ||
        _programId == null ||
        _subjectId == null) {
      _showError(
        'Institute, teacher, academic year, program, and subject are required.',
      );
      return;
    }
    setState(() => _isSaving = true);
    final payload = {
      'institute': _instituteId,
      'teacher': _teacherId,
      'academic_year': _academicYearId,
      'program': _programId,
      'cohort': _cohortId,
      'subject': _subjectId,
      'assignment_role': _assignmentRole,
      'is_primary': _isPrimary,
      'is_active': _isActive,
    };
    try {
      final repo = ref.read(academicSetupRepositoryProvider);
      if (_isEditing) {
        await repo.updateTeacherAssignment(widget.initial!.id, payload);
      } else {
        await repo.createTeacherAssignment(payload);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      _showError(readApiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final institutes = ref
        .watch(lookupInstitutesProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <InstituteAdminModel>[],
        );
    final teachers = ref
        .watch(lookupTeachersProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <TeacherProfileAdminModel>[],
        );
    final years = ref
        .watch(lookupAcademicYearsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicYearAdminModel>[],
        );
    final programs = ref
        .watch(lookupProgramsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <ProgramAdminModel>[],
        );
    final cohorts = ref
        .watch(lookupCohortsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <CohortAdminModel>[],
        );
    final subjects = ref
        .watch(lookupSubjectsProvider(_instituteId))
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <SubjectAdminModel>[],
        );
    final cohortOptions = cohorts
        .where((item) => item.programId == _programId)
        .toList();
    final subjectOptions = subjects
        .where(
          (item) =>
              _programId == null ||
              item.programId == null ||
              item.programId == _programId,
        )
        .toList();

    return _DialogShell(
      title: _isEditing ? 'Edit teacher assignment' : 'Add teacher assignment',
      onCancel: () => Navigator.of(context).pop(false),
      onSave: _save,
      isSaving: _isSaving,
      saveLabel: _isEditing ? 'Save changes' : 'Create assignment',
      child: Column(
        children: [
          _InstituteDropdown(
            user: widget.user,
            institutes: institutes,
            value: _instituteId,
            onChanged: (value) {
              setState(() {
                _instituteId = value;
                _teacherId = null;
                _academicYearId = null;
                _programId = null;
                _cohortId = null;
                _subjectId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _teacherId,
            decoration: const InputDecoration(labelText: 'Teacher'),
            items: teachers
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.fullName),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _teacherId = value),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _academicYearId,
            decoration: const InputDecoration(labelText: 'Academic year'),
            items: years
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _academicYearId = value),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _programId,
            decoration: const InputDecoration(labelText: 'Program'),
            items: programs
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() {
                _programId = value;
                _cohortId = null;
                _subjectId = null;
              });
            },
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String?>(
            initialValue: _cohortId,
            decoration: const InputDecoration(labelText: 'Cohort'),
            items: [
              const DropdownMenuItem<String?>(
                value: null,
                child: Text('No cohort'),
              ),
              ...cohortOptions.map(
                (item) => DropdownMenuItem<String?>(
                  value: item.id,
                  child: Text(item.name),
                ),
              ),
            ],
            onChanged: (value) => setState(() => _cohortId = value),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _subjectId,
            decoration: const InputDecoration(labelText: 'Subject'),
            items: subjectOptions
                .map(
                  (item) => DropdownMenuItem<String>(
                    value: item.id,
                    child: Text(item.name),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => _subjectId = value),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: _assignmentRole,
            decoration: const InputDecoration(labelText: 'Assignment role'),
            items: const [
              DropdownMenuItem(
                value: 'main_teacher',
                child: Text('Main Teacher'),
              ),
              DropdownMenuItem(value: 'assistant', child: Text('Assistant')),
              DropdownMenuItem(value: 'mentor', child: Text('Mentor')),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() => _assignmentRole = value);
              }
            },
          ),
          const SizedBox(height: 14),
          SwitchListTile(
            value: _isPrimary,
            title: const Text('Primary assignment'),
            onChanged: (value) => setState(() => _isPrimary = value),
          ),
          SwitchListTile(
            value: _isActive,
            title: const Text('Active'),
            onChanged: (value) => setState(() => _isActive = value),
          ),
        ],
      ),
    );
  }
}

class _InstituteDropdown extends StatelessWidget {
  const _InstituteDropdown({
    required this.user,
    required this.institutes,
    required this.value,
    required this.onChanged,
  });

  final AppUser user;
  final List<InstituteAdminModel> institutes;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    if (user.role == AppRole.instituteAdmin) {
      final selected = institutes.where((item) => item.id == value).firstOrNull;
      return TextField(
        enabled: false,
        decoration: InputDecoration(
          labelText: 'Institute',
          hintText: selected?.name ?? user.instituteLabel,
        ),
      );
    }
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: const InputDecoration(labelText: 'Institute'),
      items: institutes
          .map(
            (item) => DropdownMenuItem<String>(
              value: item.id,
              child: Text(item.name),
            ),
          )
          .toList(),
      onChanged: onChanged,
    );
  }
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
