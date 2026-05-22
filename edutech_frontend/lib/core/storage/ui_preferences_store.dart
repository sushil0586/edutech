import 'dart:convert';

import 'package:education_frontend/core/auth/auth_token_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final uiPreferencesStoreProvider = Provider<UiPreferencesStore>((ref) {
  return UiPreferencesStore(ref.watch(secureStorageProvider));
});

class UiPreferencesStore {
  UiPreferencesStore(this._storage);

  final dynamic _storage;

  Future<Map<String, dynamic>?> readJson(String key) async {
    final raw = await _storage.read(key: key);
    if (raw == null || raw.isEmpty) {
      return null;
    }
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    return null;
  }

  Future<List<String>> readStringList(String key) async {
    final raw = await _storage.read(key: key);
    if (raw == null || raw.isEmpty) {
      return const <String>[];
    }
    final decoded = jsonDecode(raw);
    if (decoded is List) {
      return decoded.map((item) => item.toString()).toList();
    }
    return const <String>[];
  }

  Future<void> writeJson(String key, Map<String, dynamic> value) async {
    await _storage.write(key: key, value: jsonEncode(value));
  }

  Future<void> writeStringList(String key, List<String> value) async {
    await _storage.write(key: key, value: jsonEncode(value));
  }
}
