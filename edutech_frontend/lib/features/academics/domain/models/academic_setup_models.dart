class SetupQuery {
  const SetupQuery({this.search = '', this.isActive, this.instituteId});

  final String search;
  final bool? isActive;
  final String? instituteId;
}

class InstituteExamDefaultsModel {
  const InstituteExamDefaultsModel({
    this.durationMinutes,
    this.instructions = '',
    this.allowLateSubmit = false,
    this.randomizeQuestions = false,
    this.randomizeOptions = false,
    this.showResultImmediately = false,
    this.allowReviewAfterSubmit = true,
    this.maxAttempts = 1,
    this.timerMode = 'global',
    this.navigationMode = 'free_exam',
    this.attemptPolicy = 'single',
    this.resultPublishMode = 'after_review',
    this.reviewMode = 'attempted_only',
    this.securityMode = 'normal',
    this.allowResume = true,
    this.allowSectionSwitching = true,
    this.allowReturnToPreviousSection = true,
  });

  final int? durationMinutes;
  final String instructions;
  final bool allowLateSubmit;
  final bool randomizeQuestions;
  final bool randomizeOptions;
  final bool showResultImmediately;
  final bool allowReviewAfterSubmit;
  final int maxAttempts;
  final String timerMode;
  final String navigationMode;
  final String attemptPolicy;
  final String resultPublishMode;
  final String reviewMode;
  final String securityMode;
  final bool allowResume;
  final bool allowSectionSwitching;
  final bool allowReturnToPreviousSection;

  factory InstituteExamDefaultsModel.fromJson(Map<String, dynamic>? json) {
    final data = json ?? const <String, dynamic>{};
    return InstituteExamDefaultsModel(
      durationMinutes: _readNullableInt(data['duration_minutes']),
      instructions: (data['instructions'] ?? '').toString(),
      allowLateSubmit: data['allow_late_submit'] as bool? ?? false,
      randomizeQuestions: data['randomize_questions'] as bool? ?? false,
      randomizeOptions: data['randomize_options'] as bool? ?? false,
      showResultImmediately: data['show_result_immediately'] as bool? ?? false,
      allowReviewAfterSubmit:
          data['allow_review_after_submit'] as bool? ?? true,
      maxAttempts: _readInt(data['max_attempts'], fallback: 1),
      timerMode: (data['timer_mode'] ?? 'global').toString(),
      navigationMode: (data['navigation_mode'] ?? 'free_exam').toString(),
      attemptPolicy: (data['attempt_policy'] ?? 'single').toString(),
      resultPublishMode: (data['result_publish_mode'] ?? 'after_review')
          .toString(),
      reviewMode: (data['review_mode'] ?? 'attempted_only').toString(),
      securityMode: (data['security_mode'] ?? 'normal').toString(),
      allowResume: data['allow_resume'] as bool? ?? true,
      allowSectionSwitching: data['allow_section_switching'] as bool? ?? true,
      allowReturnToPreviousSection:
          data['allow_return_to_previous_section'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toPayload() {
    return {
      if (durationMinutes != null) 'duration_minutes': durationMinutes,
      'instructions': instructions,
      'allow_late_submit': allowLateSubmit,
      'randomize_questions': randomizeQuestions,
      'randomize_options': randomizeOptions,
      'show_result_immediately': showResultImmediately,
      'allow_review_after_submit': allowReviewAfterSubmit,
      'max_attempts': maxAttempts,
      'timer_mode': timerMode,
      'navigation_mode': navigationMode,
      'attempt_policy': attemptPolicy,
      'result_publish_mode': resultPublishMode,
      'review_mode': reviewMode,
      'security_mode': securityMode,
      'allow_resume': allowResume,
      'allow_section_switching': allowSectionSwitching,
      'allow_return_to_previous_section': allowReturnToPreviousSection,
    };
  }
}

class InstituteAdminModel {
  const InstituteAdminModel({
    required this.id,
    required this.name,
    required this.code,
    required this.email,
    required this.phone,
    required this.city,
    required this.state,
    required this.country,
    required this.website,
    required this.description,
    required this.isActive,
    required this.examDefaults,
  });

  final String id;
  final String name;
  final String code;
  final String email;
  final String phone;
  final String city;
  final String state;
  final String country;
  final String website;
  final String description;
  final bool isActive;
  final InstituteExamDefaultsModel examDefaults;

  factory InstituteAdminModel.fromJson(Map<String, dynamic> json) {
    return InstituteAdminModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Institute',
      code: json['code'] as String? ?? '-',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      country: json['country'] as String? ?? '',
      website: json['website'] as String? ?? '',
      description: json['description'] as String? ?? '',
      isActive: json['is_active'] as bool? ?? false,
      examDefaults: InstituteExamDefaultsModel.fromJson(
        json['exam_defaults'] as Map<String, dynamic>?,
      ),
    );
  }
}

int _readInt(Object? value, {int fallback = 0}) {
  if (value is int) {
    return value;
  }
  if (value is String) {
    return int.tryParse(value) ?? fallback;
  }
  return fallback;
}

int? _readNullableInt(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  if (value is String) {
    return int.tryParse(value);
  }
  return null;
}

class AcademicYearAdminModel {
  const AcademicYearAdminModel({
    required this.id,
    required this.instituteId,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.isCurrent,
    required this.isActive,
  });

  final String id;
  final String instituteId;
  final String name;
  final String startDate;
  final String endDate;
  final bool isCurrent;
  final bool isActive;

  factory AcademicYearAdminModel.fromJson(Map<String, dynamic> json) {
    return AcademicYearAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      name: json['name'] as String? ?? 'Academic Year',
      startDate: json['start_date'] as String? ?? '',
      endDate: json['end_date'] as String? ?? '',
      isCurrent: json['is_current'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class ProgramAdminModel {
  const ProgramAdminModel({
    required this.id,
    required this.instituteId,
    required this.name,
    required this.code,
    required this.category,
    required this.description,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String instituteId;
  final String name;
  final String code;
  final String category;
  final String description;
  final int sortOrder;
  final bool isActive;

  factory ProgramAdminModel.fromJson(Map<String, dynamic> json) {
    return ProgramAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      name: json['name'] as String? ?? 'Program',
      code: json['code'] as String? ?? '-',
      category: json['category'] as String? ?? '',
      description: json['description'] as String? ?? '',
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class CohortAdminModel {
  const CohortAdminModel({
    required this.id,
    required this.instituteId,
    required this.programId,
    required this.academicYearId,
    required this.name,
    required this.code,
    required this.isActive,
    this.capacity,
  });

  final String id;
  final String instituteId;
  final String programId;
  final String academicYearId;
  final String name;
  final String code;
  final int? capacity;
  final bool isActive;

  factory CohortAdminModel.fromJson(Map<String, dynamic> json) {
    return CohortAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      programId: json['program'] as String? ?? '',
      academicYearId: json['academic_year'] as String? ?? '',
      name: json['name'] as String? ?? 'Cohort',
      code: json['code'] as String? ?? '-',
      capacity: json['capacity'] as int?,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class SubjectAdminModel {
  const SubjectAdminModel({
    required this.id,
    required this.instituteId,
    required this.name,
    required this.code,
    required this.description,
    required this.sortOrder,
    required this.isActive,
    this.programId,
  });

  final String id;
  final String instituteId;
  final String? programId;
  final String name;
  final String code;
  final String description;
  final int sortOrder;
  final bool isActive;

  factory SubjectAdminModel.fromJson(Map<String, dynamic> json) {
    return SubjectAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      programId: json['program'] as String?,
      name: json['name'] as String? ?? 'Subject',
      code: json['code'] as String? ?? '-',
      description: json['description'] as String? ?? '',
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class TopicAdminModel {
  const TopicAdminModel({
    required this.id,
    required this.instituteId,
    required this.subjectId,
    required this.name,
    required this.code,
    required this.description,
    required this.difficultyLevel,
    required this.sortOrder,
    required this.isActive,
    this.parentTopicId,
  });

  final String id;
  final String instituteId;
  final String subjectId;
  final String? parentTopicId;
  final String name;
  final String code;
  final String description;
  final String difficultyLevel;
  final int sortOrder;
  final bool isActive;

  factory TopicAdminModel.fromJson(Map<String, dynamic> json) {
    return TopicAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      subjectId: json['subject'] as String? ?? '',
      parentTopicId: json['parent_topic'] as String?,
      name: json['name'] as String? ?? 'Topic',
      code: json['code'] as String? ?? '-',
      description: json['description'] as String? ?? '',
      difficultyLevel: json['difficulty_level'] as String? ?? 'intermediate',
      sortOrder: json['sort_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class StudentProfileAdminModel {
  const StudentProfileAdminModel({
    required this.id,
    required this.instituteId,
    required this.academicYearId,
    required this.programId,
    required this.admissionNo,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.gender,
    required this.email,
    required this.phone,
    required this.guardianName,
    required this.guardianPhone,
    required this.address,
    required this.joinedAt,
    required this.isActive,
    required this.hasLogin,
    required this.loginUsername,
    required this.loginIsActive,
    required this.accountUserId,
    this.cohortId,
    this.dateOfBirth,
  });

  final String id;
  final String instituteId;
  final String academicYearId;
  final String programId;
  final String? cohortId;
  final String admissionNo;
  final String firstName;
  final String lastName;
  final String fullName;
  final String gender;
  final String? dateOfBirth;
  final String email;
  final String phone;
  final String guardianName;
  final String guardianPhone;
  final String address;
  final String joinedAt;
  final bool isActive;
  final bool hasLogin;
  final String? loginUsername;
  final bool loginIsActive;
  final String? accountUserId;

  factory StudentProfileAdminModel.fromJson(Map<String, dynamic> json) {
    return StudentProfileAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      academicYearId: json['academic_year'] as String? ?? '',
      programId: json['program'] as String? ?? '',
      cohortId: json['cohort'] as String?,
      admissionNo: json['admission_no'] as String? ?? '-',
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      gender: json['gender'] as String? ?? 'prefer_not_to_say',
      dateOfBirth: json['date_of_birth'] as String?,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      guardianName: json['guardian_name'] as String? ?? '',
      guardianPhone: json['guardian_phone'] as String? ?? '',
      address: json['address'] as String? ?? '',
      joinedAt: json['joined_at'] as String? ?? '',
      isActive: json['is_active'] as bool? ?? false,
      hasLogin: json['has_login'] as bool? ?? false,
      loginUsername: json['login_username']?.toString(),
      loginIsActive: json['login_is_active'] as bool? ?? false,
      accountUserId: json['account_user_id']?.toString(),
    );
  }
}

class TeacherProfileAdminModel {
  const TeacherProfileAdminModel({
    required this.id,
    required this.instituteId,
    required this.employeeCode,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.qualification,
    required this.specialization,
    required this.bio,
    required this.joinedAt,
    required this.isActive,
    required this.hasLogin,
    required this.loginUsername,
    required this.loginIsActive,
    required this.accountUserId,
  });

  final String id;
  final String instituteId;
  final String employeeCode;
  final String firstName;
  final String lastName;
  final String fullName;
  final String email;
  final String phone;
  final String qualification;
  final String specialization;
  final String bio;
  final String joinedAt;
  final bool isActive;
  final bool hasLogin;
  final String? loginUsername;
  final bool loginIsActive;
  final String? accountUserId;

  factory TeacherProfileAdminModel.fromJson(Map<String, dynamic> json) {
    return TeacherProfileAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      employeeCode: json['employee_code'] as String? ?? '-',
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      qualification: json['qualification'] as String? ?? '',
      specialization: json['specialization'] as String? ?? '',
      bio: json['bio'] as String? ?? '',
      joinedAt: json['joined_at'] as String? ?? '',
      isActive: json['is_active'] as bool? ?? false,
      hasLogin: json['has_login'] as bool? ?? false,
      loginUsername: json['login_username']?.toString(),
      loginIsActive: json['login_is_active'] as bool? ?? false,
      accountUserId: json['account_user_id']?.toString(),
    );
  }
}

class TeacherAssignmentAdminModel {
  const TeacherAssignmentAdminModel({
    required this.id,
    required this.instituteId,
    required this.teacherId,
    required this.academicYearId,
    required this.programId,
    required this.subjectId,
    required this.assignmentRole,
    required this.isPrimary,
    required this.isActive,
    this.cohortId,
  });

  final String id;
  final String instituteId;
  final String teacherId;
  final String academicYearId;
  final String programId;
  final String? cohortId;
  final String subjectId;
  final String assignmentRole;
  final bool isPrimary;
  final bool isActive;

  factory TeacherAssignmentAdminModel.fromJson(Map<String, dynamic> json) {
    return TeacherAssignmentAdminModel(
      id: json['id'] as String? ?? '',
      instituteId: json['institute'] as String? ?? '',
      teacherId: json['teacher'] as String? ?? '',
      academicYearId: json['academic_year'] as String? ?? '',
      programId: json['program'] as String? ?? '',
      cohortId: json['cohort'] as String?,
      subjectId: json['subject'] as String? ?? '',
      assignmentRole: json['assignment_role'] as String? ?? 'main_teacher',
      isPrimary: json['is_primary'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}

class RosterImportPreview {
  const RosterImportPreview({
    required this.totalRows,
    required this.validRows,
    required this.invalidRows,
    required this.rows,
    required this.validPayloads,
  });

  final int totalRows;
  final int validRows;
  final int invalidRows;
  final List<RosterImportPreviewRow> rows;
  final List<Map<String, dynamic>> validPayloads;

  factory RosterImportPreview.fromJson(Map<String, dynamic> json) {
    return RosterImportPreview(
      totalRows: json['total_rows'] as int? ?? 0,
      validRows: json['valid_rows'] as int? ?? 0,
      invalidRows: json['invalid_rows'] as int? ?? 0,
      rows: (json['rows'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(RosterImportPreviewRow.fromJson)
          .toList(),
      validPayloads:
          (json['valid_payloads'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map<String, dynamic>>()
              .toList(),
    );
  }
}

class RosterImportPreviewRow {
  const RosterImportPreviewRow({
    required this.rowNumber,
    required this.status,
    required this.displayName,
    required this.identifier,
    required this.username,
    required this.createLogin,
    required this.errors,
  });

  final int rowNumber;
  final String status;
  final String displayName;
  final String identifier;
  final String username;
  final bool createLogin;
  final Map<String, dynamic> errors;

  bool get isValid => status == 'valid';

  factory RosterImportPreviewRow.fromJson(Map<String, dynamic> json) {
    return RosterImportPreviewRow(
      rowNumber: json['row_number'] as int? ?? 0,
      status: json['status'] as String? ?? 'invalid',
      displayName: json['display_name'] as String? ?? '',
      identifier: json['identifier'] as String? ?? '',
      username: json['username'] as String? ?? '',
      createLogin: json['create_login'] as bool? ?? false,
      errors: json['errors'] is Map<String, dynamic>
          ? json['errors'] as Map<String, dynamic>
          : <String, dynamic>{},
    );
  }
}

class BulkImportResult {
  const BulkImportResult({
    required this.createdCount,
    required this.failedCount,
    required this.errors,
    required this.credentials,
  });

  final int createdCount;
  final int failedCount;
  final List<Map<String, dynamic>> errors;
  final List<Map<String, dynamic>> credentials;

  factory BulkImportResult.fromJson(Map<String, dynamic> json) {
    return BulkImportResult(
      createdCount: json['created_count'] as int? ?? 0,
      failedCount: json['failed_count'] as int? ?? 0,
      errors: (json['errors'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .toList(),
      credentials: (json['credentials'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .toList(),
    );
  }
}
