import 'dart:async';

import 'package:education_frontend/core/auth/session_expiry_notifier.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/features/auth/data/models/login_request_model.dart';
import 'package:education_frontend/features/auth/data/repositories/auth_repository.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/domain/models/auth_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authControllerProvider).user;
});

class AuthController extends Notifier<AuthState> {
  late final SessionExpiryNotifier _sessionNotifier;
  late final AuthRepository _repository;

  @override
  AuthState build() {
    _repository = ref.read(authRepositoryProvider);
    _sessionNotifier = ref.read(sessionExpiryNotifierProvider);
    _sessionNotifier.addListener(_handleSessionExpired);
    ref.onDispose(() {
      _sessionNotifier.removeListener(_handleSessionExpired);
    });
    Future<void>.microtask(_hydrateSession);
    return AuthState.loading();
  }

  Future<void> _hydrateSession() async {
    state = AuthState.loading();

    try {
      final tokens = await _repository.readStoredTokens();
      if (!ref.mounted) {
        return;
      }
      if (tokens == null) {
        state = AuthState.unauthenticated();
        return;
      }

      final user = await _repository.fetchCurrentUser();
      if (!ref.mounted) {
        return;
      }
      _sessionNotifier.clear();
      state = AuthState.authenticated(user);
    } catch (_) {
      await _repository.logout();
      if (!ref.mounted) {
        return;
      }
      state = AuthState.unauthenticated();
    }
  }

  Future<bool> login({
    required String username,
    required String password,
  }) async {
    state = AuthState.loading();

    try {
      final response = await _repository.login(
        LoginRequestModel(username: username, password: password),
      );
      if (!ref.mounted) {
        return false;
      }
      state = AuthState.authenticated(response.user);
      return true;
    } catch (error) {
      if (!ref.mounted) {
        return false;
      }
      state = AuthState.error(_readErrorMessage(error));
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    if (!ref.mounted) {
      return;
    }
    state = AuthState.unauthenticated();
  }

  Future<void> refreshCurrentUser() async {
    if (!state.isAuthenticated) {
      return;
    }

    try {
      final user = await _repository.fetchCurrentUser();
      if (!ref.mounted) {
        return;
      }
      state = AuthState.authenticated(user);
    } catch (error) {
      if (!ref.mounted) {
        return;
      }
      state = AuthState.error(_readErrorMessage(error));
    }
  }

  void clearError() {
    if (state.status == AuthStatus.error) {
      state = AuthState.unauthenticated();
    }
  }

  void _handleSessionExpired() {
    unawaited(logout());
  }

  String _readErrorMessage(Object error) {
    return readApiErrorMessage(error);
  }
}
