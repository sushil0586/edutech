import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/auth/domain/models/auth_tokens.dart';

class AuthResponseModel {
  const AuthResponseModel({required this.tokens, required this.user});

  final AuthTokens tokens;
  final AppUser user;

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      tokens: AuthTokens(
        accessToken: json['access'] as String? ?? '',
        refreshToken: json['refresh'] as String? ?? '',
      ),
      user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
