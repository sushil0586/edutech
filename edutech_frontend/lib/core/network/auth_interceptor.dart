import 'dart:async';

import 'package:dio/dio.dart';
import 'package:education_frontend/core/auth/auth_token_storage.dart';
import 'package:education_frontend/core/auth/session_expiry_notifier.dart';
import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';

class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required AuthTokenStorage tokenStorage,
    required Dio refreshDio,
    required SessionExpiryNotifier sessionExpiryNotifier,
  }) : _tokenStorage = tokenStorage,
       _refreshDio = refreshDio,
       _sessionExpiryNotifier = sessionExpiryNotifier;

  final AuthTokenStorage _tokenStorage;
  final Dio _refreshDio;
  final SessionExpiryNotifier _sessionExpiryNotifier;

  Dio? _client;
  Future<AuthTokens?>? _refreshFuture;

  void attachClient(Dio client) {
    _client = client;
  }

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (_isAuthEndpoint(options.path)) {
      handler.next(options);
      return;
    }

    final accessToken = await _tokenStorage.readAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final statusCode = err.response?.statusCode;
    final requestOptions = err.requestOptions;

    if (statusCode != 401 ||
        requestOptions.extra['didRetry'] == true ||
        _isAuthEndpoint(requestOptions.path) ||
        _client == null) {
      handler.next(err);
      return;
    }

    final refreshedTokens = await _refreshTokens();
    if (refreshedTokens == null) {
      handler.next(err);
      return;
    }

    requestOptions.headers['Authorization'] =
        'Bearer ${refreshedTokens.accessToken}';
    requestOptions.extra['didRetry'] = true;

    try {
      final response = await _client!.fetch<dynamic>(requestOptions);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  bool _isAuthEndpoint(String path) {
    return path.contains('/auth/login/') ||
        path.contains('/auth/refresh/') ||
        path.endsWith('auth/login/') ||
        path.endsWith('auth/refresh/');
  }

  Future<AuthTokens?> _refreshTokens() {
    final pendingRefresh = _refreshFuture;
    if (pendingRefresh != null) {
      return pendingRefresh;
    }

    final completer = Completer<AuthTokens?>();
    _refreshFuture = completer.future;
    _performRefresh(completer);
    return completer.future;
  }

  Future<void> _performRefresh(Completer<AuthTokens?> completer) async {
    try {
      final refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        await _tokenStorage.clear();
        _sessionExpiryNotifier.notifySessionExpired(
          'Your session has expired. Sign in again to continue where you left off.',
        );
        completer.complete(null);
        return;
      }

      final response = await _refreshDio.post<Map<String, dynamic>>(
        'auth/refresh/',
        data: {'refresh': refreshToken},
      );

      final data = response.data ?? <String, dynamic>{};
      final tokens = AuthTokens(
        accessToken: data['access'] as String? ?? '',
        refreshToken: data['refresh'] as String? ?? refreshToken,
      );
      await _tokenStorage.writeTokens(tokens);
      completer.complete(tokens);
    } catch (_) {
      await _tokenStorage.clear();
      _sessionExpiryNotifier.notifySessionExpired(
        'Your session has expired. Sign in again to continue where you left off.',
      );
      completer.complete(null);
    } finally {
      _refreshFuture = null;
    }
  }
}
