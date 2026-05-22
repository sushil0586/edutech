import 'package:dio/dio.dart';
import 'package:education_frontend/core/auth/auth_token_storage.dart';
import 'package:education_frontend/core/auth/session_expiry_notifier.dart';
import 'package:education_frontend/core/config/env_config.dart';
import 'package:education_frontend/core/network/auth_interceptor.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

BaseOptions _buildBaseOptions() {
  return BaseOptions(
    baseUrl: _normalizedBaseUrl(EnvConfig.apiBaseUrl),
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
    headers: const {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  );
}

String _normalizedBaseUrl(String rawBaseUrl) {
  if (rawBaseUrl.endsWith('/')) {
    return rawBaseUrl;
  }
  return '$rawBaseUrl/';
}

final rawDioProvider = Provider<Dio>((ref) {
  return Dio(_buildBaseOptions());
});

final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.watch(authTokenStorageProvider);
  final sessionExpiryNotifier = ref.watch(sessionExpiryNotifierProvider);
  final refreshDio = Dio(_buildBaseOptions());
  final dio = Dio(_buildBaseOptions());
  final interceptor = AuthInterceptor(
    tokenStorage: tokenStorage,
    refreshDio: refreshDio,
    sessionExpiryNotifier: sessionExpiryNotifier,
  );

  interceptor.attachClient(dio);
  dio.interceptors.add(interceptor);
  return dio;
});
