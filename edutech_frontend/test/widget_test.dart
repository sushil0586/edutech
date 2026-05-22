import 'package:education_frontend/app/app.dart';
import 'package:education_frontend/features/auth/data/repositories/auth_repository.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';
import 'package:education_frontend/features/auth/data/models/auth_response_model.dart';
import 'package:education_frontend/features/auth/data/models/login_request_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app boots to sign in shell', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_WidgetTestAuthRepository()),
        ],
        child: const EduTechApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Nexora Sign In'), findsOneWidget);
    expect(find.text('Nexora access'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Username'), findsOneWidget);
  });
}

class _WidgetTestAuthRepository implements AuthRepository {
  @override
  Future<AppUser> fetchCurrentUser() async {
    throw Exception('No session');
  }

  @override
  Future<AuthResponseModel> login(LoginRequestModel request) {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}

  @override
  Future<AuthTokens?> readStoredTokens() async => null;

  @override
  Future<AuthTokens> refreshToken(String refreshToken) {
    throw UnimplementedError();
  }

  @override
  Future<void> saveTokens(AuthTokens tokens) async {}
}
