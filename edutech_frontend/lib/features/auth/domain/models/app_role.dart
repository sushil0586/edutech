enum AppRole {
  platformAdmin('platform_admin', 'Platform Admin'),
  instituteAdmin('institute_admin', 'Institute Admin'),
  teacher('teacher', 'Teacher'),
  student('student', 'Student'),
  parent('parent', 'Parent');

  const AppRole(this.value, this.label);

  final String value;
  final String label;

  static AppRole fromValue(String value) {
    return AppRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => AppRole.parent,
    );
  }
}

extension AppRoleCapabilities on AppRole {
  bool get canAccessAcademicSetup =>
      this == AppRole.platformAdmin || this == AppRole.instituteAdmin;

  bool get canAccessInstituteOperations =>
      this == AppRole.instituteAdmin || this == AppRole.teacher;

  String get operationalWorkspaceLabel => switch (this) {
    AppRole.instituteAdmin => 'Institute',
    AppRole.teacher => 'Teacher',
    _ => label,
  };
}
