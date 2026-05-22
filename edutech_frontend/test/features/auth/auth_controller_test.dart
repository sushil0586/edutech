import 'package:education_frontend/features/auth/data/models/auth_response_model.dart';
import 'package:education_frontend/features/auth/data/models/login_request_model.dart';
import 'package:education_frontend/features/auth/data/repositories/auth_repository.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/domain/models/auth_state.dart';
import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  test('auth controller hydrates as unauthenticated without tokens', () async {
    final container = ProviderContainer(
      overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
      ],
    );
    addTearDown(container.dispose);

    container.read(authControllerProvider);
    await Future<void>.delayed(const Duration(milliseconds: 10));

    final state = container.read(authControllerProvider);
    expect(state.status, AuthStatus.unauthenticated);
    expect(state.user, isNull);
  });

  test('auth controller logs in successfully', () async {
    final fakeRepository = FakeAuthRepository();
    final container = ProviderContainer(
      overrides: [authRepositoryProvider.overrideWithValue(fakeRepository)],
    );
    addTearDown(container.dispose);

    container.read(authControllerProvider);
    await Future<void>.delayed(const Duration(milliseconds: 10));

    final didLogin = await container
        .read(authControllerProvider.notifier)
        .login(username: 'demo-student', password: 'Demo@12345');

    final state = container.read(authControllerProvider);
    expect(didLogin, isTrue);
    expect(state.status, AuthStatus.authenticated);
    expect(state.user?.role, AppRole.student);
  });
}

class FakeAuthRepository implements AuthRepository {
  AuthTokens? _tokens;

  final AppUser _user = AppUser(
    id: 'user-1',
    username: 'demo-student',
    email: 'demo-student@example.com',
    role: AppRole.student,
    instituteId: 'inst-1',
    studentProfileId: 'student-1',
    teacherProfileId: null,
    isActive: true,
  );

  @override
  Future<AppUser> fetchCurrentUser() async {
    if (_tokens == null) {
      throw Exception('No active session');
    }
    return _user;
  }

  @override
  Future<AuthResponseModel> login(LoginRequestModel request) async {
    _tokens = const AuthTokens(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    );
    return AuthResponseModel(tokens: _tokens!, user: _user);
  }

  @override
  Future<void> logout() async {
    _tokens = null;
  }

  @override
  Future<AuthTokens?> readStoredTokens() async => _tokens;

  @override
  Future<AuthTokens> refreshToken(String refreshToken) async {
    _tokens = const AuthTokens(
      accessToken: 'new-access-token',
      refreshToken: 'refresh-token',
    );
    return _tokens!;
  }

  @override
  Future<void> saveTokens(AuthTokens tokens) async {
    _tokens = tokens;
  }
}
