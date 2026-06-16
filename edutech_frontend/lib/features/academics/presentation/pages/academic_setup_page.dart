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
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:education_frontend/shared/widgets/compact_action_menu_component.dart';
import 'package:education_frontend/shared/widgets/loading_skeleton_component.dart';
import 'package:education_frontend/shared/widgets/professional_data_table_component.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/utils/app_date_time.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class AcademicSetupPage extends ConsumerStatefulWidget {
  const AcademicSetupPage({super.key});

  @override
  ConsumerState<AcademicSetupPage> createState() => _AcademicSetupPageState();
}

class _AcademicSetupPageState extends ConsumerState<AcademicSetupPage> {
  late final TextEditingController _searchController;
  final Set<String> _selectedStudentIds = <String>{};
  final Set<String> _selectedTeacherIds = <String>{};
  final Map<AcademicSetupSection, Set<String>> _selectedEntityIds =
      <AcademicSetupSection, Set<String>>{};
  String? _selectedControlYearId;

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

  InstituteAdminModel? _resolveSelectedInstitute(
    AppUser user,
    List<InstituteAdminModel> items,
    String? instituteFilter,
  ) {
    final selectedId = instituteFilter ?? user.instituteId;
    if (selectedId == null || selectedId.isEmpty) {
      return null;
    }
    for (final item in items) {
      if (item.id == selectedId) {
        return item;
      }
    }
    return null;
  }

  Future<void> _openExamDefaultsDialog({
    required AppUser user,
    required InstituteAdminModel institute,
  }) async {
    final changed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) =>
          _InstituteExamDefaultsDialog(user: user, institute: institute),
    );
    if (changed == true) {
      ref.invalidate(setupInstitutesProvider);
      ref.invalidate(lookupInstitutesProvider);
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Exam defaults updated for ${institute.name}. New exams will inherit these policies.',
          ),
        ),
      );
    }
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

  void _toggleAllStudentSelections(
    List<StudentProfileAdminModel> items,
    bool selected,
  ) {
    setState(() {
      if (selected) {
        _selectedStudentIds.addAll(items.map((item) => item.id));
      } else {
        _selectedStudentIds.removeAll(items.map((item) => item.id));
      }
    });
  }

  void _toggleAllTeacherSelections(
    List<TeacherProfileAdminModel> items,
    bool selected,
  ) {
    setState(() {
      if (selected) {
        _selectedTeacherIds.addAll(items.map((item) => item.id));
      } else {
        _selectedTeacherIds.removeAll(items.map((item) => item.id));
      }
    });
  }

  Set<String> _selectedIdsFor(AcademicSetupSection section) =>
      _selectedEntityIds[section] ?? const <String>{};

  void _toggleEntitySelection(
    AcademicSetupSection section,
    String id,
    bool selected,
  ) {
    setState(() {
      final selection = _selectedEntityIds.putIfAbsent(
        section,
        () => <String>{},
      );
      if (selected) {
        selection.add(id);
      } else {
        selection.remove(id);
      }
    });
  }

  void _toggleAllEntitySelections(
    AcademicSetupSection section,
    Iterable<String> ids,
    bool selected,
  ) {
    setState(() {
      final selection = _selectedEntityIds.putIfAbsent(
        section,
        () => <String>{},
      );
      if (selected) {
        selection.addAll(ids);
      } else {
        selection.removeAll(ids);
      }
    });
  }

  void _clearEntitySelection(AcademicSetupSection section) {
    setState(() => _selectedEntityIds[section]?.clear());
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _bulkCreateStudentLogins(
    List<StudentProfileAdminModel> items,
  ) async {
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

  Future<void> _bulkCreateTeacherLogins(
    List<TeacherProfileAdminModel> items,
  ) async {
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

  Future<void> _exportSelectedStudents(
    List<StudentProfileAdminModel> items,
  ) async {
    final selectedRows = items
        .where((item) => _selectedStudentIds.contains(item.id))
        .toList();
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
      SnackBar(
        content: Text('Exported ${selectedRows.length} selected students.'),
      ),
    );
  }

  Future<void> _exportSelectedTeachers(
    List<TeacherProfileAdminModel> items,
  ) async {
    final selectedRows = items
        .where((item) => _selectedTeacherIds.contains(item.id))
        .toList();
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
      SnackBar(
        content: Text('Exported ${selectedRows.length} selected teachers.'),
      ),
    );
  }

  Future<void> _bulkToggleAcademicEntities<T>(
    AcademicSetupSection section,
    List<T> items, {
    required bool enable,
  }) async {
    final selectedIds = _selectedIdsFor(section);
    final selectedRows = items.where((item) {
      final dynamic entity = item;
      return selectedIds.contains(entity.id as String);
    }).toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Select one or more ${_sectionLabel(section).toLowerCase()} first.',
          ),
        ),
      );
      return;
    }
    if (!enable) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            'Disable selected ${_sectionLabel(section).toLowerCase()}?',
          ),
          content: Text(
            'This will mark ${selectedRows.length} selected ${_sectionLabel(section).toLowerCase()} as inactive.',
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
        final dynamic entity = item;
        switch (section) {
          case AcademicSetupSection.academicYears:
            await repo.updateAcademicYear(entity.id as String, {
              'is_active': enable,
            });
          case AcademicSetupSection.programs:
            await repo.updateProgram(entity.id as String, {
              'is_active': enable,
            });
          case AcademicSetupSection.cohorts:
            await repo.updateCohort(entity.id as String, {'is_active': enable});
          case AcademicSetupSection.subjects:
            await repo.updateSubject(entity.id as String, {
              'is_active': enable,
            });
          case AcademicSetupSection.topics:
            await repo.updateTopic(entity.id as String, {'is_active': enable});
          case AcademicSetupSection.teacherAssignments:
            await repo.updateTeacherAssignment(entity.id as String, {
              'is_active': enable,
            });
          case AcademicSetupSection.students:
          case AcademicSetupSection.teachers:
            break;
        }
      }
      _clearEntitySelection(section);
      _invalidateCurrentSection();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${enable ? 'Enabled' : 'Disabled'} ${selectedRows.length} ${_sectionLabel(section).toLowerCase()}.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _exportSelectedAcademicEntities<T>(
    AcademicSetupSection section,
    List<T> items,
  ) async {
    final selectedIds = _selectedIdsFor(section);
    final selectedRows = items.where((item) {
      final dynamic entity = item;
      return selectedIds.contains(entity.id as String);
    }).toList();
    if (selectedRows.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Select one or more ${_sectionLabel(section).toLowerCase()} first.',
          ),
        ),
      );
      return;
    }

    late final List<String> lines;
    switch (section) {
      case AcademicSetupSection.academicYears:
        lines = <String>[
          'name,start_date,end_date,is_current,is_active',
          ...selectedRows.map((item) {
            final e = item as AcademicYearAdminModel;
            return '"${e.name}","${e.startDate}","${e.endDate}","${e.isCurrent}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.programs:
        lines = <String>[
          'name,code,category,sort_order,is_active',
          ...selectedRows.map((item) {
            final e = item as ProgramAdminModel;
            return '"${e.name}","${e.code}","${e.category}","${e.sortOrder}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.cohorts:
        lines = <String>[
          'name,code,program_id,academic_year_id,capacity,is_active',
          ...selectedRows.map((item) {
            final e = item as CohortAdminModel;
            return '"${e.name}","${e.code}","${e.programId}","${e.academicYearId}","${e.capacity ?? ''}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.subjects:
        lines = <String>[
          'name,code,program_id,sort_order,is_active',
          ...selectedRows.map((item) {
            final e = item as SubjectAdminModel;
            return '"${e.name}","${e.code}","${e.programId ?? ''}","${e.sortOrder}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.topics:
        lines = <String>[
          'name,code,subject_id,parent_topic_id,difficulty_level,is_active',
          ...selectedRows.map((item) {
            final e = item as TopicAdminModel;
            return '"${e.name}","${e.code}","${e.subjectId}","${e.parentTopicId ?? ''}","${e.difficultyLevel}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.teacherAssignments:
        lines = <String>[
          'teacher_id,subject_id,program_id,cohort_id,assignment_role,is_primary,is_active',
          ...selectedRows.map((item) {
            final e = item as TeacherAssignmentAdminModel;
            return '"${e.teacherId}","${e.subjectId}","${e.programId}","${e.cohortId ?? ''}","${e.assignmentRole}","${e.isPrimary}","${e.isActive}"';
          }),
        ];
      case AcademicSetupSection.students:
      case AcademicSetupSection.teachers:
        return;
    }

    await downloadTextFile(
      filename:
          '${_sectionLabel(section).toLowerCase().replaceAll(' ', '_')}_export.csv',
      content: '${lines.join('\n')}\n',
      mimeType: 'text/csv',
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Exported ${selectedRows.length} selected ${_sectionLabel(section).toLowerCase()}.',
        ),
      ),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _openStudentImportDialog(AppUser user) async {
    final instituteId =
        ref.read(academicSetupInstituteFilterProvider) ?? user.instituteId;
    if (instituteId == null || instituteId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select an institute first to import students.'),
        ),
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
        fetchTemplate: ref
            .read(academicSetupRepositoryProvider)
            .fetchStudentImportTemplate,
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
    final instituteId =
        ref.read(academicSetupInstituteFilterProvider) ?? user.instituteId;
    if (instituteId == null || instituteId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select an institute first to import teachers.'),
        ),
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
        fetchTemplate: ref
            .read(academicSetupRepositoryProvider)
            .fetchTeacherImportTemplate,
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

  List<Widget> _buildSectionQuickActions({
    required AppUser user,
    required AcademicSetupSection section,
    required InstituteAdminModel? selectedInstitute,
  }) {
    final actions = <Widget>[
      AppButton(
        label: _buttonLabelForSection(section),
        onPressed: () => _openCreateDialog(user),
        icon: Icons.add,
      ),
    ];
    if (section == AcademicSetupSection.subjects) {
      actions.add(
        AppButton(
          label: 'Open question bank',
          onPressed: () => context.go(AppRoutes.questionBank),
          icon: Icons.quiz_outlined,
          variant: AppButtonVariant.ghost,
        ),
      );
    } else if (section == AcademicSetupSection.students) {
      actions.add(
        AppButton(
          label: 'Bulk import students',
          onPressed: () => _openStudentImportDialog(user),
          icon: Icons.upload_file_outlined,
          variant: AppButtonVariant.secondary,
        ),
      );
    } else if (section == AcademicSetupSection.teachers) {
      actions.add(
        AppButton(
          label: 'Bulk import teachers',
          onPressed: () => _openTeacherImportDialog(user),
          icon: Icons.upload_file_outlined,
          variant: AppButtonVariant.secondary,
        ),
      );
    } else if (section == AcademicSetupSection.teacherAssignments) {
      actions.add(
        AppButton(
          label: 'Open exams',
          onPressed: () => context.go(AppRoutes.exams),
          icon: Icons.fact_check_outlined,
          variant: AppButtonVariant.ghost,
        ),
      );
    } else if (section == AcademicSetupSection.academicYears &&
        selectedInstitute != null) {
      actions.add(
        AppButton(
          label: 'Exam defaults',
          onPressed: () =>
              _openExamDefaultsDialog(user: user, institute: selectedInstitute),
          icon: Icons.tune_rounded,
          variant: AppButtonVariant.ghost,
        ),
      );
    }

    return actions;
  }

  String _metricCountLabel<T>(AsyncValue<List<T>> value) {
    return value.maybeWhen(
      data: (items) => items.length.toString(),
      orElse: () => '--',
    );
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
          highlights: [
            'Platform and institute admins already manage core master data here.',
            'Role-based routing protects cross-tenant academic operations.',
            'The refreshed UI is ready for future approval or review surfaces.',
          ],
          statusLabel: 'Admin-only workspace',
          footerMessage:
              'This surface is intentionally protected because it drives structural academic data across the product, but it already shares the same navigation and visual language as the rest of the portal.',
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
    final selectedInstitute = _resolveSelectedInstitute(
      user,
      instituteOptions,
      instituteFilter,
    );
    final yearsValue = ref.watch(setupAcademicYearsProvider);
    final programsValue = ref.watch(setupProgramsProvider);
    final cohortsValue = ref.watch(setupCohortsProvider);
    final subjectsValue = ref.watch(setupSubjectsProvider);
    final topicsValue = ref.watch(setupTopicsProvider);
    final studentsValue = ref.watch(setupStudentsProvider);
    final teachersValue = ref.watch(setupTeachersProvider);
    final assignmentsValue = ref.watch(setupTeacherAssignmentsProvider);
    final academicYears = yearsValue.maybeWhen(
      data: (items) => items,
      orElse: () => const <AcademicYearAdminModel>[],
    );
    String? selectedControlYearId = _selectedControlYearId;
    if (selectedControlYearId == null && academicYears.isNotEmpty) {
      final currentYear = academicYears.where((item) => item.isCurrent);
      selectedControlYearId = currentYear.isNotEmpty
          ? currentYear.first.id
          : academicYears.first.id;
    }
    final sectionCounts = <AcademicSetupSection, String>{
      AcademicSetupSection.academicYears: _metricCountLabel(yearsValue),
      AcademicSetupSection.programs: _metricCountLabel(programsValue),
      AcademicSetupSection.cohorts: _metricCountLabel(cohortsValue),
      AcademicSetupSection.subjects: _metricCountLabel(subjectsValue),
      AcademicSetupSection.topics: _metricCountLabel(topicsValue),
      AcademicSetupSection.students: _metricCountLabel(studentsValue),
      AcademicSetupSection.teachers: _metricCountLabel(teachersValue),
      AcademicSetupSection.teacherAssignments: _metricCountLabel(
        assignmentsValue,
      ),
    };

    return DashboardShell(
      title: 'Academic Setup',
      user: user,
      currentRoute: AppRoutes.academicSetup,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: ListView(
        children: [
          AppCard(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Academic setup',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Use the section menu to manage one academic domain at a time.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Wrap(
                  spacing: AppSpacing.md,
                  runSpacing: AppSpacing.md,
                  children: [
                    SizedBox(
                      width: 240,
                      child: DropdownButtonFormField<String?>(
                        initialValue: selectedControlYearId,
                        decoration: const InputDecoration(
                          labelText: 'Academic year',
                          prefixIcon: Icon(Icons.calendar_today_outlined),
                        ),
                        items: academicYears
                            .map(
                              (item) => DropdownMenuItem<String?>(
                                value: item.id,
                                child: Text(item.name),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          setState(() => _selectedControlYearId = value);
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
                                  academicSetupInstituteFilterProvider.notifier,
                                )
                                .setInstitute(value);
                          },
                        ),
                      ),
                    PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'students') {
                          _openStudentImportDialog(user);
                        } else if (value == 'teachers') {
                          _openTeacherImportDialog(user);
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(
                          value: 'students',
                          child: Text('Import students'),
                        ),
                        PopupMenuItem(
                          value: 'teachers',
                          child: Text('Import teachers'),
                        ),
                      ],
                      child: const AppButton(
                        label: 'Import',
                        icon: Icons.upload_outlined,
                        variant: AppButtonVariant.secondary,
                      ),
                    ),
                    if (selectedInstitute != null)
                      AppButton(
                        label: 'Exam defaults',
                        onPressed: () => _openExamDefaultsDialog(
                          user: user,
                          institute: selectedInstitute,
                        ),
                        icon: Icons.tune_rounded,
                        variant: AppButtonVariant.secondary,
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 980;
              final sectionMenu = AppCard(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sections',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    ...AcademicSetupSection.values.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                        child: _AcademicSectionMenuItem(
                          label: _sectionLabel(item),
                          icon: _sectionIcon(item),
                          countLabel: sectionCounts[item]!,
                          selected: section == item,
                          onTap: () => ref
                              .read(academicSetupSectionProvider.notifier)
                              .setSection(item),
                        ),
                      ),
                    ),
                  ],
                ),
              );

              final workspace = Column(
                children: [
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _sectionLabel(section),
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    'Manage ${_sectionLabel(section).toLowerCase()} records with focused actions and filters.',
                                    style: Theme.of(context).textTheme.bodyLarge
                                        ?.copyWith(
                                          color: AppColors.textSecondary,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            AppBadge(
                              label:
                                  '${sectionCounts[section]} ${_sectionLabel(section).toLowerCase()}',
                              backgroundColor: AppColors.subtleAccent,
                              foregroundColor: AppColors.primary,
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.sm,
                          children: _buildSectionQuickActions(
                            user: user,
                            section: section,
                            selectedInstitute: selectedInstitute,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
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
                                        academicSetupActiveFilterProvider
                                            .notifier,
                                      )
                                      .setActiveFilter(value);
                                },
                              ),
                            ),
                            AppButton(
                              label: 'Clear filters',
                              icon: Icons.filter_alt_off_outlined,
                              variant: AppButtonVariant.ghost,
                              onPressed: () {
                                _searchController.clear();
                                ref
                                    .read(academicSetupSearchProvider.notifier)
                                    .setSearch('');
                                ref
                                    .read(
                                      academicSetupActiveFilterProvider
                                          .notifier,
                                    )
                                    .setActiveFilter(true);
                                if (isPlatformAdmin) {
                                  ref
                                      .read(
                                        academicSetupInstituteFilterProvider
                                            .notifier,
                                      )
                                      .setInstitute(null);
                                }
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  _buildSectionBody(user, section),
                ],
              );

              if (compact) {
                return Column(
                  children: [
                    sectionMenu,
                    const SizedBox(height: AppSpacing.lg),
                    workspace,
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 230, child: sectionMenu),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(child: workspace),
                ],
              );
            },
          ),
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
          summaryMetrics: ref
              .watch(setupAcademicYearsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Years',
                    value: items.length.toString(),
                    helper: 'Configured cycles',
                    icon: Icons.date_range_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'Current',
                    value: items
                        .where((item) => item.isCurrent)
                        .length
                        .toString(),
                    helper: 'Current academic window',
                    icon: Icons.event_available_outlined,
                    tint: AppColors.success,
                  ),
                  _ManagementSectionMetric(
                    label: 'Inactive',
                    value: items
                        .where((item) => !item.isActive)
                        .length
                        .toString(),
                    helper: 'Archived or paused cycles',
                    icon: Icons.event_busy_outlined,
                    tint: AppColors.textMuted,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(
            AcademicSetupSection.academicYears,
          ).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.academicYears,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.academicYears,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.academicYears,
            items,
          ),
          tableMinWidth: 780,
          compactBreakpoint: 640,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.academicYears,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Academic year')),
              DataColumn(label: Text('Start')),
              DataColumn(label: Text('End')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.academicYears,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.academicYears,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        _buildPrimarySecondaryCell(
                          context,
                          primary: item.name,
                          secondary: item.isCurrent
                              ? 'Current window'
                              : 'Archive',
                        ),
                      ),
                      DataCell(Text(item.startDate)),
                      DataCell(Text(item.endDate)),
                      DataCell(
                        Wrap(
                          spacing: 8,
                          children: [
                            if (item.isCurrent)
                              const StatusBadgeComponent(label: 'Current'),
                            StatusBadgeComponent(
                              label: item.isActive ? 'Active' : 'Inactive',
                            ),
                          ],
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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
          summaryMetrics: ref
              .watch(setupProgramsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Programs',
                    value: items.length.toString(),
                    helper: 'Classes and learning tracks',
                    icon: Icons.class_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'Active',
                    value: items
                        .where((item) => item.isActive)
                        .length
                        .toString(),
                    helper: 'Available for enrollment',
                    icon: Icons.check_circle_outline,
                    tint: AppColors.success,
                  ),
                  _ManagementSectionMetric(
                    label: 'Uncategorized',
                    value: items
                        .where((item) => item.category.trim().isEmpty)
                        .length
                        .toString(),
                    helper: 'Needs category cleanup',
                    icon: Icons.label_outline,
                    tint: AppColors.warning,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(AcademicSetupSection.programs).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.programs,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.programs,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.programs,
            items,
          ),
          tableMinWidth: 920,
          compactBreakpoint: 640,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.programs,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Program')),
              DataColumn(label: Text('Code')),
              DataColumn(label: Text('Category')),
              DataColumn(label: Text('Order')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.programs,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.programs,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        _buildPrimarySecondaryCell(
                          context,
                          primary: item.name,
                          secondary: item.description.isEmpty
                              ? 'No description'
                              : item.description,
                        ),
                      ),
                      DataCell(Text(item.code)),
                      DataCell(
                        Text(
                          item.category.isEmpty
                              ? 'Uncategorized'
                              : item.category,
                        ),
                      ),
                      DataCell(Text(item.sortOrder.toString())),
                      DataCell(
                        StatusBadgeComponent(
                          label: item.isActive ? 'Active' : 'Inactive',
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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
          summaryMetrics: ref
              .watch(setupCohortsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Batches',
                    value: items.length.toString(),
                    helper: 'Operational cohorts',
                    icon: Icons.groups_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'With capacity',
                    value: items
                        .where((item) => item.capacity != null)
                        .length
                        .toString(),
                    helper: 'Ready for intake planning',
                    icon: Icons.reduce_capacity_outlined,
                    tint: AppColors.info,
                  ),
                  _ManagementSectionMetric(
                    label: 'Inactive',
                    value: items
                        .where((item) => !item.isActive)
                        .length
                        .toString(),
                    helper: 'Archived or paused groups',
                    icon: Icons.pause_circle_outline,
                    tint: AppColors.textMuted,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(AcademicSetupSection.cohorts).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.cohorts,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.cohorts,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.cohorts,
            items,
          ),
          tableMinWidth: 1080,
          compactBreakpoint: 700,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.cohorts,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Cohort')),
              DataColumn(label: Text('Code')),
              DataColumn(label: Text('Program')),
              DataColumn(label: Text('Academic year')),
              DataColumn(label: Text('Capacity')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.cohorts,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.cohorts,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        SizedBox(
                          width: 170,
                          child: Text(
                            item.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      DataCell(Text(item.code)),
                      DataCell(Text(_lookupName(programs, item.programId))),
                      DataCell(Text(_lookupName(years, item.academicYearId))),
                      DataCell(Text(item.capacity?.toString() ?? '--')),
                      DataCell(
                        StatusBadgeComponent(
                          label: item.isActive ? 'Active' : 'Inactive',
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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
          summaryMetrics: ref
              .watch(setupSubjectsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Subjects',
                    value: items.length.toString(),
                    helper: 'Curriculum catalog entries',
                    icon: Icons.menu_book_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'Program linked',
                    value: items
                        .where((item) => item.programId != null)
                        .length
                        .toString(),
                    helper: 'Scoped to a specific program',
                    icon: Icons.link_outlined,
                    tint: AppColors.info,
                  ),
                  _ManagementSectionMetric(
                    label: 'Inactive',
                    value: items
                        .where((item) => !item.isActive)
                        .length
                        .toString(),
                    helper: 'Hidden from active use',
                    icon: Icons.visibility_off_outlined,
                    tint: AppColors.textMuted,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(AcademicSetupSection.subjects).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.subjects,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.subjects,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.subjects,
            items,
          ),
          tableMinWidth: 940,
          compactBreakpoint: 640,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.subjects,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Subject')),
              DataColumn(label: Text('Code')),
              DataColumn(label: Text('Program')),
              DataColumn(label: Text('Order')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.subjects,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.subjects,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        _buildPrimarySecondaryCell(
                          context,
                          primary: item.name,
                          secondary: item.description.isEmpty
                              ? 'No description'
                              : item.description,
                        ),
                      ),
                      DataCell(Text(item.code)),
                      DataCell(
                        Text(
                          item.programId == null
                              ? 'General'
                              : _lookupName(programs, item.programId),
                        ),
                      ),
                      DataCell(Text(item.sortOrder.toString())),
                      DataCell(
                        StatusBadgeComponent(
                          label: item.isActive ? 'Active' : 'Inactive',
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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
          summaryMetrics: ref
              .watch(setupTopicsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Topics',
                    value: items.length.toString(),
                    helper: 'Tagged learning units',
                    icon: Icons.account_tree_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'Root topics',
                    value: items
                        .where((item) => item.parentTopicId == null)
                        .length
                        .toString(),
                    helper: 'Top-level taxonomy nodes',
                    icon: Icons.fork_right_outlined,
                    tint: AppColors.secondary,
                  ),
                  _ManagementSectionMetric(
                    label: 'Inactive',
                    value: items
                        .where((item) => !item.isActive)
                        .length
                        .toString(),
                    helper: 'Hidden from live content',
                    icon: Icons.visibility_off_outlined,
                    tint: AppColors.textMuted,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(AcademicSetupSection.topics).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.topics,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.topics,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.topics,
            items,
          ),
          tableMinWidth: 1100,
          compactBreakpoint: 700,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.topics,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Topic')),
              DataColumn(label: Text('Code')),
              DataColumn(label: Text('Subject')),
              DataColumn(label: Text('Difficulty')),
              DataColumn(label: Text('Parent')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.topics,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.topics,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        _buildPrimarySecondaryCell(
                          context,
                          primary: item.name,
                          secondary: item.description.isEmpty
                              ? 'No description'
                              : item.description,
                        ),
                      ),
                      DataCell(Text(item.code)),
                      DataCell(Text(_lookupName(subjects, item.subjectId))),
                      DataCell(Text(item.difficultyLevel)),
                      DataCell(
                        Text(
                          item.parentTopicId == null
                              ? 'Root topic'
                              : _lookupName(topics, item.parentTopicId),
                        ),
                      ),
                      DataCell(
                        StatusBadgeComponent(
                          label: item.isActive ? 'Active' : 'Inactive',
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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
          onBulkEnable: (items) =>
              _bulkToggleStudentLogins(items, enable: true),
          onBulkDisable: (items) =>
              _bulkToggleStudentLogins(items, enable: false),
          onExportSelected: _exportSelectedStudents,
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          programs: programs,
          cohorts: cohorts,
          onCreateLogin: _createStudentLogin,
          onResetPassword: ({required userId, required title}) =>
              _resetUserPassword(userId: userId, title: title),
          onToggleLogin: ({required userId, required enable, required label}) =>
              _toggleLogin(userId: userId, enable: enable, label: label),
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
          onBulkEnable: (items) =>
              _bulkToggleTeacherLogins(items, enable: true),
          onBulkDisable: (items) =>
              _bulkToggleTeacherLogins(items, enable: false),
          onExportSelected: _exportSelectedTeachers,
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          onCreateLogin: _createTeacherLogin,
          onResetPassword: ({required userId, required title}) =>
              _resetUserPassword(userId: userId, title: title),
          onToggleLogin: ({required userId, required enable, required label}) =>
              _toggleLogin(userId: userId, enable: enable, label: label),
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
          summaryMetrics: ref
              .watch(setupTeacherAssignmentsProvider)
              .maybeWhen(
                data: (items) => [
                  _ManagementSectionMetric(
                    label: 'Assignments',
                    value: items.length.toString(),
                    helper: 'Teacher-subject mappings',
                    icon: Icons.assignment_ind_outlined,
                  ),
                  _ManagementSectionMetric(
                    label: 'Primary owners',
                    value: items
                        .where((item) => item.isPrimary)
                        .length
                        .toString(),
                    helper: 'Marked as primary teacher',
                    icon: Icons.star_border_outlined,
                    tint: AppColors.warning,
                  ),
                  _ManagementSectionMetric(
                    label: 'Batch linked',
                    value: items
                        .where((item) => item.cohortId != null)
                        .length
                        .toString(),
                    helper: 'Scoped to a specific cohort',
                    icon: Icons.groups_2_outlined,
                    tint: AppColors.info,
                  ),
                ],
                orElse: () => const [],
              ),
          onEdit: (item) => _openEditDialog(user: user, entity: item),
          selectedCount: _selectedIdsFor(
            AcademicSetupSection.teacherAssignments,
          ).length,
          onBulkEnable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.teacherAssignments,
            items,
            enable: true,
          ),
          onBulkDisable: (items) => _bulkToggleAcademicEntities(
            AcademicSetupSection.teacherAssignments,
            items,
            enable: false,
          ),
          onExportSelected: (items) => _exportSelectedAcademicEntities(
            AcademicSetupSection.teacherAssignments,
            items,
          ),
          tableMinWidth: 1180,
          compactBreakpoint: 760,
          tableBuilder: (items) => _buildAdminDataTable(
            context,
            showCheckboxColumn: true,
            onSelectAll: (selected) => _toggleAllEntitySelections(
              AcademicSetupSection.teacherAssignments,
              items.map((item) => item.id),
              selected ?? false,
            ),
            columns: const [
              DataColumn(label: Text('Teacher')),
              DataColumn(label: Text('Subject')),
              DataColumn(label: Text('Program')),
              DataColumn(label: Text('Cohort')),
              DataColumn(label: Text('Role')),
              DataColumn(label: Text('Status')),
              DataColumn(label: Text('Actions')),
            ],
            rows: items
                .map(
                  (item) => DataRow(
                    selected: _selectedIdsFor(
                      AcademicSetupSection.teacherAssignments,
                    ).contains(item.id),
                    onSelectChanged: (selected) => _toggleEntitySelection(
                      AcademicSetupSection.teacherAssignments,
                      item.id,
                      selected ?? false,
                    ),
                    cells: [
                      DataCell(
                        _buildPrimarySecondaryCell(
                          context,
                          primary: _lookupName(teachers, item.teacherId),
                          secondary: item.isPrimary
                              ? 'Primary owner'
                              : 'Assigned',
                        ),
                      ),
                      DataCell(Text(_lookupName(subjects, item.subjectId))),
                      DataCell(Text(_lookupName(programs, item.programId))),
                      DataCell(
                        Text(
                          item.cohortId == null
                              ? 'All cohorts'
                              : _lookupName(cohorts, item.cohortId),
                        ),
                      ),
                      DataCell(Text(item.assignmentRole)),
                      DataCell(
                        Wrap(
                          spacing: 8,
                          children: [
                            if (item.isPrimary)
                              const StatusBadgeComponent(label: 'Primary'),
                            StatusBadgeComponent(
                              label: item.isActive ? 'Active' : 'Inactive',
                            ),
                          ],
                        ),
                      ),
                      DataCell(
                        _buildEntityRowAction(
                          () => _openEditDialog(user: user, entity: item),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
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

String _sectionLabel(AcademicSetupSection section) {
  return switch (section) {
    AcademicSetupSection.academicYears => 'Academic years',
    AcademicSetupSection.programs => 'Programs',
    AcademicSetupSection.cohorts => 'Cohorts',
    AcademicSetupSection.subjects => 'Subjects',
    AcademicSetupSection.topics => 'Topics',
    AcademicSetupSection.students => 'Students',
    AcademicSetupSection.teachers => 'Teachers',
    AcademicSetupSection.teacherAssignments => 'Assignments',
  };
}

IconData _sectionIcon(AcademicSetupSection section) {
  return switch (section) {
    AcademicSetupSection.academicYears => Icons.calendar_today_outlined,
    AcademicSetupSection.programs => Icons.account_tree_outlined,
    AcademicSetupSection.cohorts => Icons.groups_2_outlined,
    AcademicSetupSection.subjects => Icons.menu_book_outlined,
    AcademicSetupSection.topics => Icons.topic_outlined,
    AcademicSetupSection.students => Icons.school_outlined,
    AcademicSetupSection.teachers => Icons.person_outline,
    AcademicSetupSection.teacherAssignments => Icons.assignment_ind_outlined,
  };
}

Widget _buildAdminDataTable(
  BuildContext context, {
  required List<DataColumn> columns,
  required List<DataRow> rows,
  bool showCheckboxColumn = false,
  ValueSetter<bool?>? onSelectAll,
}) {
  final headingStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
    fontWeight: FontWeight.w800,
    color: AppColors.textSecondary,
  );
  final dataStyle = Theme.of(
    context,
  ).textTheme.bodyMedium?.copyWith(color: AppColors.textPrimary);
  return DataTableTheme(
    data: DataTableThemeData(
      headingTextStyle: headingStyle,
      dataTextStyle: dataStyle,
      headingRowColor: WidgetStatePropertyAll(AppColors.surfaceMuted),
      dataRowMinHeight: 52,
      dataRowMaxHeight: 64,
      headingRowHeight: 44,
      columnSpacing: 18,
      horizontalMargin: 12,
      checkboxHorizontalMargin: 10,
      dividerThickness: 0.6,
    ),
    child: DataTable(
      showCheckboxColumn: showCheckboxColumn,
      onSelectAll: onSelectAll,
      columns: columns,
      rows: rows,
    ),
  );
}

Widget _buildEntityRowAction(VoidCallback onEdit) {
  return CompactActionMenuComponent(
    tooltip: 'Record actions',
    items: [
      CompactActionMenuItem(
        value: 'edit',
        label: 'Edit record',
        icon: Icons.edit_outlined,
        onSelected: onEdit,
      ),
    ],
  );
}

Widget _buildPrimarySecondaryCell(
  BuildContext context, {
  required String primary,
  required String secondary,
}) {
  return SizedBox(
    width: 220,
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          primary,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 2),
        Text(
          secondary,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    ),
  );
}

class _AcademicSectionMenuItem extends StatelessWidget {
  const _AcademicSectionMenuItem({
    required this.label,
    required this.icon,
    required this.countLabel,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final String countLabel;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? Colors.white : AppColors.textPrimary;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: 10,
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: foreground),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              AppBadge(
                label: countLabel,
                backgroundColor: selected
                    ? Colors.white.withValues(alpha: 0.16)
                    : AppColors.surface,
                foregroundColor: selected
                    ? Colors.white
                    : AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AsyncSection<T> extends StatelessWidget {
  const _AsyncSection({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onEdit,
    required this.itemBuilder,
    this.summaryMetrics = const [],
    this.extraActionsBuilder,
    this.compactBuilder,
    this.tableBuilder,
    this.tableMinWidth = 940,
    this.compactBreakpoint = 820,
    this.selectedCount = 0,
    this.onBulkEnable,
    this.onBulkDisable,
    this.onExportSelected,
  });

  final String title;
  final String subtitle;
  final AsyncValue<List<T>> value;
  final ValueChanged<T> onEdit;
  final Widget Function(BuildContext context, T item) itemBuilder;
  final List<_ManagementSectionMetric> summaryMetrics;
  final Widget Function(BuildContext context, T item)? extraActionsBuilder;
  final Widget Function(List<T> items)? compactBuilder;
  final Widget Function(List<T> items)? tableBuilder;
  final double tableMinWidth;
  final double compactBreakpoint;
  final int selectedCount;
  final Future<void> Function(List<T> items)? onBulkEnable;
  final Future<void> Function(List<T> items)? onBulkDisable;
  final Future<void> Function(List<T> items)? onExportSelected;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (summaryMetrics.isNotEmpty) ...[
              LayoutBuilder(
                builder: (context, constraints) {
                  final width = constraints.maxWidth;
                  final columns = width >= 1100
                      ? 4
                      : width >= 720
                      ? 2
                      : 1;
                  final cardWidth = columns == 1
                      ? width
                      : (width - ((columns - 1) * AppSpacing.sm)) / columns;
                  return Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: summaryMetrics
                        .map(
                          (metric) => SizedBox(
                            width: cardWidth,
                            child: _ManagementMetricCard(metric: metric),
                          ),
                        )
                        .toList(),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.md),
            ],
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        AppBadge(label: '${items.length} records'),
                        AppBadge(label: title),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (selectedCount > 0 &&
                        (onBulkEnable != null ||
                            onBulkDisable != null ||
                            onExportSelected != null)) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.subtleAccent,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.18),
                          ),
                        ),
                        child: Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            AppBadge(label: '$selectedCount selected'),
                            if (onBulkEnable != null)
                              AppButton(
                                label: 'Enable selected',
                                onPressed: () => onBulkEnable!(items),
                                icon: Icons.check_circle_outline,
                                variant: AppButtonVariant.secondary,
                              ),
                            if (onBulkDisable != null)
                              AppButton(
                                label: 'Disable selected',
                                onPressed: () => onBulkDisable!(items),
                                icon: Icons.block_outlined,
                                variant: AppButtonVariant.ghost,
                              ),
                            if (onExportSelected != null)
                              AppButton(
                                label: 'Export selected',
                                onPressed: () => onExportSelected!(items),
                                icon: Icons.download_outlined,
                                variant: AppButtonVariant.secondary,
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (tableBuilder != null)
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final compactTable =
                              constraints.maxWidth < compactBreakpoint;
                          return ProfessionalDataTableComponent(
                            table: tableBuilder!(items),
                            compactContent:
                                compactBuilder?.call(items) ??
                                Column(
                                  children: items
                                      .map(
                                        (item) => Padding(
                                          padding: const EdgeInsets.only(
                                            bottom: AppSpacing.sm,
                                          ),
                                          child: Column(
                                            children: [
                                              itemBuilder(context, item),
                                              const SizedBox(
                                                height: AppSpacing.xs,
                                              ),
                                              _InlineEditBar(
                                                onEdit: () => onEdit(item),
                                              ),
                                              if (extraActionsBuilder !=
                                                  null) ...[
                                                const SizedBox(height: 10),
                                                extraActionsBuilder!(
                                                  context,
                                                  item,
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                      )
                                      .toList(),
                                ),
                            isCompact: compactTable,
                            isEmpty: items.isEmpty,
                            emptyTitle: 'No records match these filters',
                            emptyDescription:
                                'Try a broader search or add your first record in this section.',
                            loadingType: LoadingSkeletonType.table,
                            loadingItemCount: 4,
                            minWidth: tableMinWidth,
                          );
                        },
                      )
                    else
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final width = constraints.maxWidth;
                          final columns = width >= 860 ? 2 : 1;
                          final cardWidth = columns == 1
                              ? width
                              : (width - ((columns - 1) * 12)) / columns;

                          return Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: items
                                .map(
                                  (item) => SizedBox(
                                    width: cardWidth,
                                    child: Column(
                                      children: [
                                        itemBuilder(context, item),
                                        const SizedBox(height: AppSpacing.xs),
                                        _InlineEditBar(
                                          onEdit: () => onEdit(item),
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
                      ),
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: LoadingSkeletonComponent(
                  type: LoadingSkeletonType.list,
                  itemCount: 3,
                ),
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

class _InlineEditBar extends StatelessWidget {
  const _InlineEditBar({required this.onEdit});

  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const AppBadge(label: 'Management record'),
          const Spacer(),
          TextButton.icon(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, size: 16),
            label: const Text('Edit'),
          ),
        ],
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
    final accentSeed = title.isNotEmpty ? title.codeUnitAt(0) : 65;
    final accent = [
      AppColors.primary,
      AppColors.secondary,
      AppColors.success,
      AppColors.warning,
    ][accentSeed % 4];

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      backgroundColor: AppColors.surfaceStrong,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    title.isEmpty ? '-' : title.characters.first.toUpperCase(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: accent,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (description != null && description!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                description!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
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
  final Future<void> Function(List<StudentProfileAdminModel> items)
  onBulkCreate;
  final Future<void> Function(List<StudentProfileAdminModel> items)
  onBulkEnable;
  final Future<void> Function(List<StudentProfileAdminModel> items)
  onBulkDisable;
  final Future<void> Function(List<StudentProfileAdminModel> items)
  onExportSelected;
  final ValueChanged<StudentProfileAdminModel> onEdit;
  final Future<void> Function(StudentProfileAdminModel item) onCreateLogin;
  final _ResetPasswordAction onResetPassword;
  final _ToggleLoginAction onToggleLogin;

  @override
  Widget build(BuildContext context) {
    final items = value.maybeWhen(
      data: (items) => items,
      orElse: () => const <StudentProfileAdminModel>[],
    );
    return _RosterTableShell(
      title: title,
      subtitle: subtitle,
      rosterLabel: 'student roster',
      onImport: onImport,
      value: value,
      selectedCount: selectedIds.length,
      onBulkCreate: onBulkCreate,
      onBulkEnable: onBulkEnable,
      onBulkDisable: onBulkDisable,
      onExportSelected: onExportSelected,
      overviewMetrics: [
        _RosterOverviewMetric(
          label: 'Students',
          value: items.length.toString(),
          helper: 'Current active roster',
          icon: Icons.school_outlined,
        ),
        _RosterOverviewMetric(
          label: 'Without batch',
          value: items.where((item) => item.cohortId == null).length.toString(),
          helper: 'Needs cohort assignment',
          icon: Icons.groups_2_outlined,
          tint: AppColors.warning,
        ),
        _RosterOverviewMetric(
          label: 'Pending login',
          value: items.where((item) => !item.hasLogin).length.toString(),
          helper: 'Ready for bulk login creation',
          icon: Icons.lock_outline,
          tint: AppColors.info,
        ),
        _RosterOverviewMetric(
          label: 'Inactive',
          value: items.where((item) => !item.isActive).length.toString(),
          helper: 'Profiles paused or archived',
          icon: Icons.person_off_outlined,
          tint: AppColors.textMuted,
        ),
      ],
      compactBuilder: (items) => Column(
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.fullName,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          _TableRowActions(
                            onEdit: () => onEdit(item),
                            onCreateLogin: item.hasLogin
                                ? null
                                : () => onCreateLogin(item),
                            onResetPassword: item.accountUserId == null
                                ? null
                                : () => onResetPassword(
                                    userId: item.accountUserId!,
                                    title: 'Reset student password',
                                  ),
                            onDisable:
                                item.hasLogin &&
                                    item.loginIsActive &&
                                    item.accountUserId != null
                                ? () => onToggleLogin(
                                    userId: item.accountUserId!,
                                    enable: false,
                                    label: item.fullName,
                                  )
                                : null,
                            onEnable:
                                item.hasLogin &&
                                    !item.loginIsActive &&
                                    item.accountUserId != null
                                ? () => onToggleLogin(
                                    userId: item.accountUserId!,
                                    enable: true,
                                    label: item.fullName,
                                  )
                                : null,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        item.admissionNo,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          StatusBadgeComponent(
                            label: item.isActive ? 'Active' : 'Inactive',
                          ),
                          _MetaChip(
                            label: _lookupName(programs, item.programId),
                          ),
                          _MetaChip(
                            label: item.cohortId == null
                                ? 'No cohort'
                                : _lookupName(cohorts, item.cohortId),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        item.email.isEmpty ? item.phone : item.email,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      _LoginStatusCell(item: item),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      ),
      tableBuilder: (items) => _buildAdminDataTable(
        context,
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
                    _buildPrimarySecondaryCell(
                      context,
                      primary: item.fullName,
                      secondary: item.isActive
                          ? 'Active profile'
                          : 'Inactive profile',
                    ),
                  ),
                  DataCell(
                    _buildPrimarySecondaryCell(
                      context,
                      primary: item.admissionNo,
                      secondary: item.gender,
                    ),
                  ),
                  DataCell(
                    _buildPrimarySecondaryCell(
                      context,
                      primary: _lookupName(programs, item.programId),
                      secondary: item.cohortId == null
                          ? 'No cohort'
                          : _lookupName(cohorts, item.cohortId),
                    ),
                  ),
                  DataCell(Text(item.email.isEmpty ? item.phone : item.email)),
                  DataCell(_LoginStatusCell(item: item)),
                  DataCell(
                    _TableRowActions(
                      onEdit: () => onEdit(item),
                      onCreateLogin: item.hasLogin
                          ? null
                          : () => onCreateLogin(item),
                      onResetPassword: item.accountUserId == null
                          ? null
                          : () => onResetPassword(
                              userId: item.accountUserId!,
                              title: 'Reset student password',
                            ),
                      onDisable:
                          item.hasLogin &&
                              item.loginIsActive &&
                              item.accountUserId != null
                          ? () => onToggleLogin(
                              userId: item.accountUserId!,
                              enable: false,
                              label: item.fullName,
                            )
                          : null,
                      onEnable:
                          item.hasLogin &&
                              !item.loginIsActive &&
                              item.accountUserId != null
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
  final Future<void> Function(List<TeacherProfileAdminModel> items)
  onBulkCreate;
  final Future<void> Function(List<TeacherProfileAdminModel> items)
  onBulkEnable;
  final Future<void> Function(List<TeacherProfileAdminModel> items)
  onBulkDisable;
  final Future<void> Function(List<TeacherProfileAdminModel> items)
  onExportSelected;
  final ValueChanged<TeacherProfileAdminModel> onEdit;
  final Future<void> Function(TeacherProfileAdminModel item) onCreateLogin;
  final _ResetPasswordAction onResetPassword;
  final _ToggleLoginAction onToggleLogin;

  @override
  Widget build(BuildContext context) {
    final items = value.maybeWhen(
      data: (items) => items,
      orElse: () => const <TeacherProfileAdminModel>[],
    );
    return _RosterTableShell(
      title: title,
      subtitle: subtitle,
      rosterLabel: 'teacher roster',
      onImport: onImport,
      value: value,
      selectedCount: selectedIds.length,
      onBulkCreate: onBulkCreate,
      onBulkEnable: onBulkEnable,
      onBulkDisable: onBulkDisable,
      onExportSelected: onExportSelected,
      overviewMetrics: [
        _RosterOverviewMetric(
          label: 'Teachers',
          value: items.length.toString(),
          helper: 'Faculty records',
          icon: Icons.person_outline,
        ),
        _RosterOverviewMetric(
          label: 'Pending login',
          value: items.where((item) => !item.hasLogin).length.toString(),
          helper: 'Can be provisioned in bulk',
          icon: Icons.lock_outline,
          tint: AppColors.info,
        ),
        _RosterOverviewMetric(
          label: 'Inactive',
          value: items.where((item) => !item.isActive).length.toString(),
          helper: 'Profiles not currently active',
          icon: Icons.person_off_outlined,
          tint: AppColors.textMuted,
        ),
        _RosterOverviewMetric(
          label: 'Specialized',
          value: items
              .where((item) => item.specialization.trim().isNotEmpty)
              .length
              .toString(),
          helper: 'Tagged with specialization',
          icon: Icons.psychology_alt_outlined,
          tint: AppColors.secondary,
        ),
      ],
      compactBuilder: (items) => Column(
        children: items
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.fullName,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          _TableRowActions(
                            onEdit: () => onEdit(item),
                            onCreateLogin: item.hasLogin
                                ? null
                                : () => onCreateLogin(item),
                            onResetPassword: item.accountUserId == null
                                ? null
                                : () => onResetPassword(
                                    userId: item.accountUserId!,
                                    title: 'Reset teacher password',
                                  ),
                            onDisable:
                                item.hasLogin &&
                                    item.loginIsActive &&
                                    item.accountUserId != null
                                ? () => onToggleLogin(
                                    userId: item.accountUserId!,
                                    enable: false,
                                    label: item.fullName,
                                  )
                                : null,
                            onEnable:
                                item.hasLogin &&
                                    !item.loginIsActive &&
                                    item.accountUserId != null
                                ? () => onToggleLogin(
                                    userId: item.accountUserId!,
                                    enable: true,
                                    label: item.fullName,
                                  )
                                : null,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        item.employeeCode,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          StatusBadgeComponent(
                            label: item.isActive ? 'Active' : 'Inactive',
                          ),
                          _MetaChip(
                            label: item.specialization.isEmpty
                                ? 'General'
                                : item.specialization,
                          ),
                          if (item.qualification.isNotEmpty)
                            _MetaChip(label: item.qualification),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        item.email.isEmpty ? item.phone : item.email,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      _LoginStatusCell(item: item),
                    ],
                  ),
                ),
              ),
            )
            .toList(),
      ),
      tableBuilder: (items) => _buildAdminDataTable(
        context,
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
                    _buildPrimarySecondaryCell(
                      context,
                      primary: item.fullName,
                      secondary: item.isActive
                          ? 'Active profile'
                          : 'Inactive profile',
                    ),
                  ),
                  DataCell(
                    _buildPrimarySecondaryCell(
                      context,
                      primary: item.employeeCode,
                      secondary: item.qualification.isEmpty
                          ? 'No qualification'
                          : item.qualification,
                    ),
                  ),
                  DataCell(
                    Text(
                      item.specialization.isEmpty
                          ? 'General'
                          : item.specialization,
                    ),
                  ),
                  DataCell(Text(item.email.isEmpty ? item.phone : item.email)),
                  DataCell(_LoginStatusCell(item: item)),
                  DataCell(
                    _TableRowActions(
                      onEdit: () => onEdit(item),
                      onCreateLogin: item.hasLogin
                          ? null
                          : () => onCreateLogin(item),
                      onResetPassword: item.accountUserId == null
                          ? null
                          : () => onResetPassword(
                              userId: item.accountUserId!,
                              title: 'Reset teacher password',
                            ),
                      onDisable:
                          item.hasLogin &&
                              item.loginIsActive &&
                              item.accountUserId != null
                          ? () => onToggleLogin(
                              userId: item.accountUserId!,
                              enable: false,
                              label: item.fullName,
                            )
                          : null,
                      onEnable:
                          item.hasLogin &&
                              !item.loginIsActive &&
                              item.accountUserId != null
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
    required this.rosterLabel,
    required this.value,
    required this.onImport,
    required this.selectedCount,
    required this.onBulkCreate,
    required this.onBulkEnable,
    required this.onBulkDisable,
    required this.onExportSelected,
    required this.overviewMetrics,
    this.compactBuilder,
    required this.tableBuilder,
  });

  final String title;
  final String subtitle;
  final String rosterLabel;
  final AsyncValue<List<T>> value;
  final VoidCallback onImport;
  final int selectedCount;
  final Future<void> Function(List<T> items) onBulkCreate;
  final Future<void> Function(List<T> items) onBulkEnable;
  final Future<void> Function(List<T> items) onBulkDisable;
  final Future<void> Function(List<T> items) onExportSelected;
  final List<_RosterOverviewMetric> overviewMetrics;
  final Widget Function(List<T> items)? compactBuilder;
  final Widget Function(List<T> items) tableBuilder;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (overviewMetrics.isNotEmpty) ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final columns = width >= 1180
                    ? 4
                    : width >= 760
                    ? 2
                    : 1;
                final cardWidth = columns == 1
                    ? width
                    : (width - ((columns - 1) * AppSpacing.sm)) / columns;
                return Wrap(
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.sm,
                  children: overviewMetrics
                      .map(
                        (metric) => SizedBox(
                          width: cardWidth,
                          child: _RosterStatCard(metric: metric),
                        ),
                      )
                      .toList(),
                );
              },
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          value.when(
            data: (items) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        AppBadge(label: '${items.length} records'),
                        AppBadge(label: '$rosterLabel workspace'),
                        AppButton(
                          label: 'Export selected',
                          onPressed: selectedCount > 0
                              ? () => onExportSelected(items)
                              : null,
                          icon: Icons.download_outlined,
                          variant: AppButtonVariant.ghost,
                        ),
                        Text(
                          'Use import for large onboarding, then manage logins and activation from the selection tools below.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  if (selectedCount > 0) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.subtleAccent,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppColors.primary.withValues(alpha: 0.18),
                        ),
                      ),
                      child: Wrap(
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
                            label: 'Enable selected',
                            onPressed: () => onBulkEnable(items),
                            icon: Icons.check_circle_outline,
                            variant: AppButtonVariant.secondary,
                          ),
                          AppButton(
                            label: 'Disable selected',
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
                    ),
                    const SizedBox(height: 14),
                  ] else ...[
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        AppBadge(
                          label:
                              'Select rows to unlock bulk login and export actions',
                          backgroundColor: AppColors.surfaceMuted,
                          foregroundColor: AppColors.textSecondary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final compactTable = constraints.maxWidth < 820;
                      return ProfessionalDataTableComponent(
                        table: tableBuilder(items),
                        compactContent: compactBuilder?.call(items),
                        isCompact: compactTable,
                        isEmpty: items.isEmpty,
                        emptyTitle: 'No records match these filters',
                        emptyDescription:
                            'Try a broader search, adjust the filters, or upload your first roster in bulk.',
                        loadingType: LoadingSkeletonType.table,
                        loadingItemCount: 4,
                        minWidth: 980,
                      );
                    },
                  ),
                ],
              );
            },
            loading: () => const ProfessionalDataTableComponent(
              table: SizedBox.shrink(),
              isLoading: true,
              loadingType: LoadingSkeletonType.table,
              loadingItemCount: 5,
              minWidth: 980,
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

class _RosterOverviewMetric {
  const _RosterOverviewMetric({
    required this.label,
    required this.value,
    required this.helper,
    required this.icon,
    this.tint,
  });

  final String label;
  final String value;
  final String helper;
  final IconData icon;
  final Color? tint;
}

class _ManagementSectionMetric {
  const _ManagementSectionMetric({
    required this.label,
    required this.value,
    required this.helper,
    required this.icon,
    this.tint,
  });

  final String label;
  final String value;
  final String helper;
  final IconData icon;
  final Color? tint;
}

class _ManagementMetricCard extends StatelessWidget {
  const _ManagementMetricCard({required this.metric});

  final _ManagementSectionMetric metric;

  @override
  Widget build(BuildContext context) {
    final accent = metric.tint ?? AppColors.primary;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      backgroundColor: AppColors.surfaceMuted,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(metric.icon, color: accent, size: 18),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  metric.label,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  metric.value,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  metric.helper,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RosterStatCard extends StatelessWidget {
  const _RosterStatCard({required this.metric});

  final _RosterOverviewMetric metric;

  @override
  Widget build(BuildContext context) {
    final accent = metric.tint ?? AppColors.primary;
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      backgroundColor: AppColors.surfaceMuted,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(metric.icon, color: accent, size: 18),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  metric.label,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  metric.value,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  metric.helper,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                ),
              ],
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
        StatusBadgeComponent(
          label: hasLogin ? (loginIsActive ? 'Active' : 'Inactive') : 'Pending',
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
    return CompactActionMenuComponent(
      items: [
        CompactActionMenuItem(
          value: 'edit',
          label: 'Edit profile',
          icon: Icons.edit_outlined,
          onSelected: onEdit,
        ),
        CompactActionMenuItem(
          value: 'create-login',
          label: 'Create login',
          icon: Icons.person_add_alt_1_outlined,
          onSelected: onCreateLogin,
        ),
        CompactActionMenuItem(
          value: 'reset-password',
          label: 'Reset password',
          icon: Icons.lock_reset_outlined,
          onSelected: onResetPassword,
        ),
        CompactActionMenuItem(
          value: 'disable-login',
          label: 'Disable login',
          icon: Icons.block_outlined,
          onSelected: onDisable,
          isDestructive: true,
        ),
        CompactActionMenuItem(
          value: 'enable-login',
          label: 'Enable login',
          icon: Icons.check_circle_outline,
          onSelected: onEnable,
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
  final Future<BulkImportResult> Function(RosterImportPreview preview)
  finalizeImport;

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
      primaryActionLabel: _preview == null
          ? 'Preview import'
          : 'Import valid rows',
      onPrimaryAction: _preview == null ? _pickAndPreview : _finalizeImport,
      secondaryActionLabel: 'Download template',
      onSecondaryAction: _downloadTemplate,
      isSaving: _isLoading,
      maxWidth: 980,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedFileName != null)
            Text('Selected file: $_selectedFileName'),
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
                      row.displayName.isEmpty
                          ? 'Row ${row.rowNumber}'
                          : row.displayName,
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
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
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
                        color: row.isValid
                            ? AppColors.success
                            : AppColors.error,
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
    _usernameController = TextEditingController(
      text: widget.suggestedUsername.toLowerCase(),
    );
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
            subtitle: const Text(
              'Use this when you want to share a fresh one-time password securely.',
            ),
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

class _ChipLabel extends StatelessWidget {
  const _ChipLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return AppBadge(label: label);
  }
}

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

class _InstituteExamDefaultsDialog extends ConsumerStatefulWidget {
  const _InstituteExamDefaultsDialog({
    required this.user,
    required this.institute,
  });

  final AppUser user;
  final InstituteAdminModel institute;

  @override
  ConsumerState<_InstituteExamDefaultsDialog> createState() =>
      _InstituteExamDefaultsDialogState();
}

class _InstituteExamDefaultsDialogState
    extends ConsumerState<_InstituteExamDefaultsDialog> {
  late final TextEditingController _durationController;
  late final TextEditingController _maxAttemptsController;
  late final TextEditingController _instructionsController;

  late String _timerMode;
  late String _navigationMode;
  late String _attemptPolicy;
  late String _resultPublishMode;
  late String _reviewMode;
  late String _securityMode;
  late bool _allowLateSubmit;
  late bool _randomizeQuestions;
  late bool _randomizeOptions;
  late bool _showResultImmediately;
  late bool _allowReviewAfterSubmit;
  late bool _allowResume;
  late bool _allowSectionSwitching;
  late bool _allowReturnToPreviousSection;

  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final defaults = widget.institute.examDefaults;
    _durationController = TextEditingController(
      text: defaults.durationMinutes?.toString() ?? '',
    );
    _maxAttemptsController = TextEditingController(
      text: defaults.maxAttempts.toString(),
    );
    _instructionsController = TextEditingController(
      text: defaults.instructions,
    );
    _timerMode = defaults.timerMode;
    _navigationMode = defaults.navigationMode;
    _attemptPolicy = defaults.attemptPolicy;
    _resultPublishMode = defaults.resultPublishMode;
    _reviewMode = defaults.reviewMode;
    _securityMode = defaults.securityMode;
    _allowLateSubmit = defaults.allowLateSubmit;
    _randomizeQuestions = defaults.randomizeQuestions;
    _randomizeOptions = defaults.randomizeOptions;
    _showResultImmediately = defaults.showResultImmediately;
    _allowReviewAfterSubmit = defaults.allowReviewAfterSubmit;
    _allowResume = defaults.allowResume;
    _allowSectionSwitching = defaults.allowSectionSwitching;
    _allowReturnToPreviousSection = defaults.allowReturnToPreviousSection;
  }

  @override
  void dispose() {
    _durationController.dispose();
    _maxAttemptsController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final duration = int.tryParse(_durationController.text.trim());
    final maxAttempts = int.tryParse(_maxAttemptsController.text.trim());
    if (duration == null || duration <= 0) {
      setState(() => _error = 'Default duration must be greater than zero.');
      return;
    }
    if (maxAttempts == null || maxAttempts <= 0) {
      setState(() => _error = 'Max attempts must be at least 1.');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      await ref.read(academicSetupRepositoryProvider).updateInstitute(
        widget.institute.id,
        {
          'exam_defaults': {
            'duration_minutes': duration,
            'instructions': _instructionsController.text.trim(),
            'allow_late_submit': _allowLateSubmit,
            'randomize_questions': _randomizeQuestions,
            'randomize_options': _randomizeOptions,
            'show_result_immediately': _showResultImmediately,
            'allow_review_after_submit': _allowReviewAfterSubmit,
            'max_attempts': maxAttempts,
            'timer_mode': _timerMode,
            'navigation_mode': _navigationMode,
            'attempt_policy': _attemptPolicy,
            'result_publish_mode': _resultPublishMode,
            'review_mode': _reviewMode,
            'security_mode': _securityMode,
            'allow_resume': _allowResume,
            'allow_section_switching': _allowSectionSwitching,
            'allow_return_to_previous_section': _allowReturnToPreviousSection,
          },
        },
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isSaving = false;
        _error = readApiErrorMessage(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: 'Exam defaults',
      eyebrow: 'Institute policy',
      subtitle:
          'New exams inside ${widget.institute.name} inherit these defaults until a teacher overrides them.',
      onClose: () => Navigator.of(context).pop(false),
      primaryActionLabel: 'Save defaults',
      onPrimaryAction: _save,
      isSaving: _isSaving,
      maxWidth: 920,
      maxHeight: 860,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null) ...[
            AppErrorState(message: _error!),
            const SizedBox(height: 16),
          ],
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 760;
              final leftColumn = Column(
                children: [
                  _DialogSectionCard(
                    title: 'Core defaults',
                    subtitle:
                        'Set the baseline duration, instructions, and attempt count for new exams.',
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: AppTextField(
                                controller: _durationController,
                                label: 'Duration (minutes)',
                                hint: '60',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: AppTextField(
                                controller: _maxAttemptsController,
                                label: 'Max attempts',
                                hint: '1',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        AppTextField(
                          controller: _instructionsController,
                          label: 'Default instructions',
                          hint:
                              'Add standard instructions to prefill every new exam.',
                          maxLines: 6,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _DialogSectionCard(
                    title: 'Runtime behavior',
                    subtitle:
                        'Set the default time, navigation, attempt, and security contract.',
                    child: Column(
                      children: [
                        _PolicyDropdown(
                          label: 'Timer mode',
                          value: _timerMode,
                          items: const {
                            'global': 'Global timer',
                            'section': 'Section timer',
                            'hybrid': 'Hybrid timer',
                          },
                          onChanged: (value) =>
                              setState(() => _timerMode = value),
                        ),
                        const SizedBox(height: 12),
                        _PolicyDropdown(
                          label: 'Navigation mode',
                          value: _navigationMode,
                          items: const {
                            'free_exam': 'Free across exam',
                            'free_section': 'Free within section',
                            'sequential': 'Sequential',
                            'hybrid': 'Hybrid',
                          },
                          onChanged: (value) =>
                              setState(() => _navigationMode = value),
                        ),
                        const SizedBox(height: 12),
                        _PolicyDropdown(
                          label: 'Attempt policy',
                          value: _attemptPolicy,
                          items: const {
                            'single': 'Single attempt',
                            'latest': 'Latest attempt counted',
                            'best': 'Best attempt counted',
                            'unlimited_practice': 'Unlimited practice',
                          },
                          onChanged: (value) =>
                              setState(() => _attemptPolicy = value),
                        ),
                        const SizedBox(height: 12),
                        _PolicyDropdown(
                          label: 'Security mode',
                          value: _securityMode,
                          items: const {
                            'normal': 'Normal',
                            'focus': 'Focus mode',
                            'fullscreen': 'Fullscreen required',
                            'violation_limited': 'Violation limited',
                            'proctored': 'Proctored',
                          },
                          onChanged: (value) =>
                              setState(() => _securityMode = value),
                        ),
                      ],
                    ),
                  ),
                ],
              );
              final rightColumn = Column(
                children: [
                  _DialogSectionCard(
                    title: 'Visibility defaults',
                    subtitle:
                        'Control what students can see after submitting by default.',
                    child: Column(
                      children: [
                        _PolicyDropdown(
                          label: 'Result publish mode',
                          value: _resultPublishMode,
                          items: const {
                            'immediate': 'Immediate',
                            'scheduled': 'Scheduled',
                            'after_review': 'After review',
                          },
                          onChanged: (value) =>
                              setState(() => _resultPublishMode = value),
                        ),
                        const SizedBox(height: 12),
                        _PolicyDropdown(
                          label: 'Review mode',
                          value: _reviewMode,
                          items: const {
                            'none': 'No review',
                            'attempted_only': 'Attempted only',
                            'all_questions': 'All questions',
                            'solution_review': 'Solution review',
                          },
                          onChanged: (value) =>
                              setState(() => _reviewMode = value),
                        ),
                        SwitchListTile.adaptive(
                          value: _showResultImmediately,
                          onChanged: (value) =>
                              setState(() => _showResultImmediately = value),
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Show result immediately'),
                        ),
                        SwitchListTile.adaptive(
                          value: _allowReviewAfterSubmit,
                          onChanged: (value) =>
                              setState(() => _allowReviewAfterSubmit = value),
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Allow review after submit'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _DialogSectionCard(
                    title: 'Operational switches',
                    subtitle:
                        'Set small delivery defaults so teachers are not re-entering the same toggles for every exam.',
                    child: _ToggleGrid(
                      items: [
                        _ToggleConfig(
                          label: 'Allow resume',
                          value: _allowResume,
                          onChanged: (value) =>
                              setState(() => _allowResume = value),
                        ),
                        _ToggleConfig(
                          label: 'Allow late submit',
                          value: _allowLateSubmit,
                          onChanged: (value) =>
                              setState(() => _allowLateSubmit = value),
                        ),
                        _ToggleConfig(
                          label: 'Randomize questions',
                          value: _randomizeQuestions,
                          onChanged: (value) =>
                              setState(() => _randomizeQuestions = value),
                        ),
                        _ToggleConfig(
                          label: 'Randomize options',
                          value: _randomizeOptions,
                          onChanged: (value) =>
                              setState(() => _randomizeOptions = value),
                        ),
                        _ToggleConfig(
                          label: 'Allow section switching',
                          value: _allowSectionSwitching,
                          onChanged: (value) =>
                              setState(() => _allowSectionSwitching = value),
                        ),
                        _ToggleConfig(
                          label: 'Allow return to previous section',
                          value: _allowReturnToPreviousSection,
                          onChanged: (value) => setState(
                            () => _allowReturnToPreviousSection = value,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );

              if (compact) {
                return Column(
                  children: [
                    leftColumn,
                    const SizedBox(height: 16),
                    rightColumn,
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: leftColumn),
                  const SizedBox(width: 16),
                  Expanded(child: rightColumn),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _DialogSectionCard extends StatelessWidget {
  const _DialogSectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(18),
      backgroundColor: AppColors.surfaceStrong,
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
          Text(
            subtitle,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _PolicyDropdown extends StatelessWidget {
  const _PolicyDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final Map<String, String> items;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(labelText: label),
      items: items.entries
          .map(
            (entry) => DropdownMenuItem<String>(
              value: entry.key,
              child: Text(entry.value),
            ),
          )
          .toList(),
      onChanged: (next) {
        if (next != null) {
          onChanged(next);
        }
      },
    );
  }
}

class _ToggleConfig {
  const _ToggleConfig({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
}

class _ToggleGrid extends StatelessWidget {
  const _ToggleGrid({required this.items});

  final List<_ToggleConfig> items;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: items
          .map(
            (item) => SizedBox(
              width: 240,
              child: SwitchListTile.adaptive(
                value: item.value,
                onChanged: item.onChanged,
                contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                title: Text(item.label),
              ),
            ),
          )
          .toList(),
    );
  }
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
