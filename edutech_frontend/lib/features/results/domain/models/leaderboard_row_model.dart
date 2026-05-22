class LeaderboardRowModel {
  const LeaderboardRowModel({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.studentAdmissionNo,
    required this.finalScore,
    required this.percentage,
    required this.timeTakenSeconds,
    required this.resultStatus,
    required this.isPublished,
    this.rank,
  });

  final String id;
  final String studentId;
  final String studentName;
  final String studentAdmissionNo;
  final String finalScore;
  final String percentage;
  final int timeTakenSeconds;
  final String resultStatus;
  final bool isPublished;
  final int? rank;

  factory LeaderboardRowModel.fromJson(Map<String, dynamic> json) {
    return LeaderboardRowModel(
      id: (json['id'] ?? '').toString(),
      studentId: (json['student'] ?? '').toString(),
      studentName: (json['student_name'] ?? 'Student').toString(),
      studentAdmissionNo: (json['student_admission_no'] ?? '-').toString(),
      finalScore: (json['final_score'] ?? '0').toString(),
      percentage: (json['percentage'] ?? '0').toString(),
      timeTakenSeconds: _readInt(json['time_taken_seconds']),
      resultStatus: (json['result_status'] ?? 'pending').toString(),
      isPublished: json['is_published'] as bool? ?? false,
      rank: _readNullableInt(json['rank']),
    );
  }
}

int _readInt(dynamic value) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int? _readNullableInt(dynamic value) {
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  return int.tryParse(value.toString());
}
