import 'package:dio/dio.dart';

String readApiErrorMessage(Object error) {
  if (error is! DioException) {
    return error.toString();
  }

  if (error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout ||
      error.type == DioExceptionType.sendTimeout) {
    return 'We could not reach the server. Make sure the backend is running and try again.';
  }

  final data = error.response?.data;
  if (data is Map<String, dynamic>) {
    if (data['detail'] is String) {
      return data['detail'] as String;
    }
    final parts = <String>[];
    data.forEach((key, value) {
      if (value is List) {
        parts.add('$key: ${value.join(', ')}');
      } else if (value is Map) {
        parts.add('$key: ${value.values.join(', ')}');
      } else {
        parts.add('$key: $value');
      }
    });
    if (parts.isNotEmpty) {
      return parts.join('\n');
    }
  }

  if (data is List) {
    return data.join('\n');
  }

  final statusCode = error.response?.statusCode;
  if (statusCode == 401) {
    return 'Your session could not be authenticated. Please sign in again.';
  }
  if (statusCode == 403) {
    return 'You do not have access to this action.';
  }
  if (statusCode == 404) {
    return 'The requested resource could not be found.';
  }

  return error.message ?? 'Something went wrong. Please try again.';
}
