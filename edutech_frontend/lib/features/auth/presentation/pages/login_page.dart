import 'package:education_frontend/features/auth/domain/models/auth_state.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/shared/presentation/layouts/responsive_scaffold.dart';
import 'package:education_frontend/shared/config/app_branding.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({
    super.key,
    this.redirectTo,
    this.sessionMessage,
  });

  final String? redirectTo;
  final String? sessionMessage;

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) {
      return;
    }

    await ref
        .read(authControllerProvider.notifier)
        .login(
          username: _usernameController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.status == AuthStatus.loading;

    return ResponsiveScaffold(
      title: '${AppBranding.shortName} Sign In',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 960;
          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1120),
              child: wide
                  ? Row(
                      children: [
                        Expanded(child: _LoginHero(isLoading: isLoading)),
                        const SizedBox(width: AppSpacing.xl),
                        SizedBox(
                          width: 460,
                          child: _LoginFormCard(
                            formKey: _formKey,
                            usernameController: _usernameController,
                            passwordController: _passwordController,
                            authState: authState,
                            sessionMessage: widget.sessionMessage,
                            isLoading: isLoading,
                            onSubmit: _submit,
                          ),
                        ),
                      ],
                    )
                  : _LoginFormCard(
                      formKey: _formKey,
                      usernameController: _usernameController,
                      passwordController: _passwordController,
                      authState: authState,
                      sessionMessage: widget.sessionMessage,
                      isLoading: isLoading,
                      onSubmit: _submit,
                    ),
            ),
          );
        },
      ),
    );
  }
}

class _LoginHero extends StatelessWidget {
  const _LoginHero({required this.isLoading});

  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.primary,
          AppColors.secondary,
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppBadge(
            label: 'Education learning platform',
            backgroundColor: Colors.white.withValues(alpha: 0.12),
            foregroundColor: Colors.white,
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Run a complete academic assessment workflow from one calm, modern workspace.',
            style: Theme.of(
              context,
            ).textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            '${AppBranding.shortName} brings teacher exam creation, student attempts, results analytics, and academic setup into one professional demo-ready experience.',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.90)),
          ),
          const SizedBox(height: AppSpacing.xl),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.md,
            children: [
              _HeroInfo(label: 'Roles', value: '5 demo users'),
              _HeroInfo(label: 'Backend', value: 'Django + DRF'),
              _HeroInfo(
                label: 'Status',
                value: isLoading ? 'Signing in...' : 'Demo ready',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LoginFormCard extends StatelessWidget {
  const _LoginFormCard({
    required this.formKey,
    required this.usernameController,
    required this.passwordController,
    required this.authState,
    required this.sessionMessage,
    required this.isLoading,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController usernameController;
  final TextEditingController passwordController;
  final AuthState authState;
  final String? sessionMessage;
  final bool isLoading;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Form(
        key: formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppBadge(label: '${AppBranding.shortName} access'),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Sign in',
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Use one of the seeded role-based accounts created by the backend demo command.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (sessionMessage != null && sessionMessage!.trim().isNotEmpty) ...[
              const SizedBox(height: AppSpacing.md),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: AppColors.warning.withValues(alpha: 0.20),
                  ),
                ),
                child: Text(
                  sessionMessage!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            AppTextField(
              controller: usernameController,
              textInputAction: TextInputAction.next,
              label: 'Username',
              hint: 'demo-student',
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Username is required.';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            AppTextField(
              controller: passwordController,
              obscureText: true,
              onFieldSubmitted: (_) => onSubmit(),
              label: 'Password',
              hint: 'Enter your password',
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Password is required.';
                }
                if (value.length < 6) {
                  return 'Password looks too short.';
                }
                return null;
              },
            ),
            if (authState.status == AuthStatus.error &&
                authState.errorMessage != null) ...[
              const SizedBox(height: AppSpacing.md),
              Text(
                authState.errorMessage!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            AppButton(
              label: 'Sign in',
              onPressed: onSubmit,
              isLoading: isLoading,
              expand: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroInfo extends StatelessWidget {
  const _HeroInfo({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(color: Colors.white.withValues(alpha: 0.78)),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
