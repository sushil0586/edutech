import 'package:education_frontend/features/auth/domain/models/app_role.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    required this.isActive,
    this.instituteId,
    this.studentProfileId,
    this.teacherProfileId,
  });

  final String id;
  final String username;
  final String email;
  final AppRole role;
  final bool isActive;
  final String? instituteId;
  final String? studentProfileId;
  final String? teacherProfileId;

  String get displayName => username;

  String get instituteLabel {
    if (role == AppRole.platformAdmin) {
      return 'All institutes';
    }
    if (instituteId == null || instituteId!.isEmpty) {
      return 'Institute not linked';
    }
    return 'Institute ${instituteId!.substring(0, 8)}';
  }

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: AppRole.fromValue(json['role'] as String? ?? AppRole.parent.value),
      instituteId: json['institute'] as String?,
      studentProfileId: json['student_profile'] as String?,
      teacherProfileId: json['teacher_profile'] as String?,
      isActive: json['is_active'] as bool? ?? false,
    );
  }
}
