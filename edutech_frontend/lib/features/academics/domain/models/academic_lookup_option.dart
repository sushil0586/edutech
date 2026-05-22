class AcademicLookupOption {
  const AcademicLookupOption({
    required this.id,
    required this.name,
    this.code,
    this.programId,
    this.academicYearId,
    this.subjectId,
  });

  final String id;
  final String name;
  final String? code;
  final String? programId;
  final String? academicYearId;
  final String? subjectId;

  factory AcademicLookupOption.fromJson(Map<String, dynamic> json) {
    return AcademicLookupOption(
      id: (json['id'] ?? '').toString(),
      name: json['name'] as String? ?? 'Unnamed',
      code: json['code'] as String?,
      programId: json['program']?.toString(),
      academicYearId: json['academic_year']?.toString(),
      subjectId: json['subject']?.toString(),
    );
  }
}
