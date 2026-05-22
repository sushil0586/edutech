import 'package:dio/dio.dart';
import 'package:education_frontend/core/auth/auth_token_storage.dart';
import 'package:education_frontend/core/network/api_client.dart';
import 'package:education_frontend/features/auth/data/models/auth_response_model.dart';
import 'package:education_frontend/features/auth/data/models/login_request_model.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return DioAuthRepository(
    dio: ref.watch(dioProvider),
    rawDio: ref.watch(rawDioProvider),
    tokenStorage: ref.watch(authTokenStorageProvider),
  );
});

abstract class AuthRepository {
  Future<AuthResponseModel> login(LoginRequestModel request);
  Future<AppUser> fetchCurrentUser();
  Future<AuthTokens?> readStoredTokens();
  Future<void> saveTokens(AuthTokens tokens);
  Future<AuthTokens> refreshToken(String refreshToken);
  Future<void> logout();
}

class DioAuthRepository implements AuthRepository {
  DioAuthRepository({
    required Dio dio,
    required Dio rawDio,
    required AuthTokenStorage tokenStorage,
  }) : _dio = dio,
       _rawDio = rawDio,
       _tokenStorage = tokenStorage;

  final Dio _dio;
  final Dio _rawDio;
  final AuthTokenStorage _tokenStorage;

  @override
  Future<AppUser> fetchCurrentUser() async {
    final response = await _dio.get<Map<String, dynamic>>('auth/me/');
    return AppUser.fromJson(response.data ?? <String, dynamic>{});
  }

  @override
  Future<AuthResponseModel> login(LoginRequestModel request) async {
    final response = await _rawDio.post<Map<String, dynamic>>(
      'auth/login/',
      data: request.toJson(),
    );
    final authResponse = AuthResponseModel.fromJson(
      response.data ?? <String, dynamic>{},
    );
    await saveTokens(authResponse.tokens);
    return authResponse;
  }

  @override
  Future<void> logout() {
    return _tokenStorage.clear();
  }

  @override
  Future<AuthTokens?> readStoredTokens() {
    return _tokenStorage.readTokens();
  }

  @override
  Future<AuthTokens> refreshToken(String refreshToken) async {
    final response = await _rawDio.post<Map<String, dynamic>>(
      'auth/refresh/',
      data: {'refresh': refreshToken},
    );

    final tokens = AuthTokens(
      accessToken: response.data?['access'] as String? ?? '',
      refreshToken: response.data?['refresh'] as String? ?? refreshToken,
    );
    await saveTokens(tokens);
    return tokens;
  }

  @override
  Future<void> saveTokens(AuthTokens tokens) {
    return _tokenStorage.writeTokens(tokens);
  }
}
