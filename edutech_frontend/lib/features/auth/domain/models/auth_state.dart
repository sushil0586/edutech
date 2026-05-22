import 'package:education_frontend/features/auth/domain/models/app_user.dart';

enum AuthStatus { unauthenticated, loading, authenticated, error }

class AuthState {
  const AuthState({required this.status, this.user, this.errorMessage});

  final AuthStatus status;
  final AppUser? user;
  final String? errorMessage;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && user != null;

  bool get isLoading => status == AuthStatus.loading;

  factory AuthState.loading() => const AuthState(status: AuthStatus.loading);

  factory AuthState.unauthenticated() =>
      const AuthState(status: AuthStatus.unauthenticated);

  factory AuthState.authenticated(AppUser user) =>
      AuthState(status: AuthStatus.authenticated, user: user);

  factory AuthState.error(String message) =>
      AuthState(status: AuthStatus.error, errorMessage: message);

  AuthState copyWith({
    AuthStatus? status,
    AppUser? user,
    String? errorMessage,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}
