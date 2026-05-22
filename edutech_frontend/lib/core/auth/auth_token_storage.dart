import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

abstract class AuthTokenStorage {
  Future<AuthTokens?> readTokens();
  Future<String?> readAccessToken();
  Future<String?> readRefreshToken();
  Future<void> writeTokens(AuthTokens tokens);
  Future<void> clear();
}

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final authTokenStorageProvider = Provider<AuthTokenStorage>((ref) {
  return SecureAuthTokenStorage(ref.watch(secureStorageProvider));
});

class SecureAuthTokenStorage implements AuthTokenStorage {
  SecureAuthTokenStorage(this._storage);

  static const _accessTokenKey = 'edutech_access_token';
  static const _refreshTokenKey = 'edutech_refresh_token';

  final FlutterSecureStorage _storage;

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  @override
  Future<String?> readAccessToken() {
    return _storage.read(key: _accessTokenKey);
  }

  @override
  Future<String?> readRefreshToken() {
    return _storage.read(key: _refreshTokenKey);
  }

  @override
  Future<AuthTokens?> readTokens() async {
    final accessToken = await readAccessToken();
    final refreshToken = await readRefreshToken();

    if (accessToken == null || refreshToken == null) {
      return null;
    }

    return AuthTokens(accessToken: accessToken, refreshToken: refreshToken);
  }

  @override
  Future<void> writeTokens(AuthTokens tokens) async {
    await _storage.write(key: _accessTokenKey, value: tokens.accessToken);
    await _storage.write(key: _refreshTokenKey, value: tokens.refreshToken);
  }
}
