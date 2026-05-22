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
