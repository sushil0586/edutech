import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/auth/session_expiry_notifier.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/domain/models/auth_state.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/academics/presentation/pages/academic_setup_page.dart';
import 'package:education_frontend/features/auth/presentation/pages/login_page.dart';
import 'package:education_frontend/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:education_frontend/features/exams/presentation/pages/exams_page.dart';
import 'package:education_frontend/features/exams/presentation/pages/student_attempt_page.dart';
import 'package:education_frontend/features/exams/presentation/pages/student_attempt_review_page.dart';
import 'package:education_frontend/features/exams/presentation/pages/student_attempt_summary_page.dart';
import 'package:education_frontend/features/exams/presentation/pages/student_exam_detail_page.dart';
import 'package:education_frontend/features/question_bank/presentation/pages/question_bank_page.dart';
import 'package:education_frontend/features/results/presentation/pages/results_page.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final appNavigatorObserverProvider = Provider<AppNavigatorObserver>((ref) {
  return AppNavigatorObserver();
});

final routerRefreshNotifierProvider = Provider<RouterRefreshNotifier>((ref) {
  final notifier = RouterRefreshNotifier(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});

final goRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = ref.watch(routerRefreshNotifierProvider);
  final observer = ref.watch(appNavigatorObserverProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    refreshListenable: refreshNotifier,
    observers: [observer],
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final sessionMessage = ref.read(sessionExpiryNotifierProvider).message;
      final location = state.matchedLocation;
      final isLoggingIn = location == AppRoutes.login;

      if (authState.status == AuthStatus.loading) {
        return null;
      }

      if (!authState.isAuthenticated) {
        if (isLoggingIn) {
          return null;
        }
        return Uri(
          path: AppRoutes.login,
          queryParameters: {
            'next': state.uri.toString(),
            if (sessionMessage != null && sessionMessage.isNotEmpty)
              'message': sessionMessage,
          },
        ).toString();
      }

      if (isLoggingIn) {
        return state.uri.queryParameters['next'] ?? AppRoutes.dashboard;
      }

      final role = authState.user!.role;
      if (!_isRouteAllowedForRole(role, location)) {
        return AppRoutes.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        pageBuilder: (context, state) => _appPage(
          state: state,
          child: LoginPage(
            redirectTo: state.uri.queryParameters['next'],
            sessionMessage: state.uri.queryParameters['message'],
          ),
        ),
      ),
      GoRoute(
        path: AppRoutes.dashboard,
        pageBuilder: (context, state) =>
            _appPage(state: state, child: const DashboardPage()),
      ),
      GoRoute(
        path: AppRoutes.exams,
        pageBuilder: (context, state) =>
            _appPage(state: state, child: const ExamsPage()),
        routes: [
          GoRoute(
            path: ':examId',
            pageBuilder: (context, state) => _appPage(
              state: state,
              child: StudentExamDetailPage(
                examId: state.pathParameters['examId'] ?? '',
              ),
            ),
            routes: [
              GoRoute(
                path: 'attempts/:attemptId',
                pageBuilder: (context, state) => _appPage(
                  state: state,
                  child: StudentAttemptPage(
                    examId: state.pathParameters['examId'] ?? '',
                    attemptId: state.pathParameters['attemptId'] ?? '',
                  ),
                ),
                routes: [
                  GoRoute(
                    path: 'summary',
                    pageBuilder: (context, state) => _appPage(
                      state: state,
                      child: StudentAttemptSummaryPage(
                        examId: state.pathParameters['examId'] ?? '',
                        attemptId: state.pathParameters['attemptId'] ?? '',
                      ),
                    ),
                  ),
                  GoRoute(
                    path: 'review',
                    pageBuilder: (context, state) => _appPage(
                      state: state,
                      child: StudentAttemptReviewPage(
                        examId: state.pathParameters['examId'] ?? '',
                        attemptId: state.pathParameters['attemptId'] ?? '',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.questionBank,
        pageBuilder: (context, state) =>
            _appPage(state: state, child: const QuestionBankPage()),
      ),
      GoRoute(
        path: AppRoutes.results,
        pageBuilder: (context, state) =>
            _appPage(state: state, child: const ResultsPage()),
      ),
      GoRoute(
        path: AppRoutes.academicSetup,
        pageBuilder: (context, state) =>
            _appPage(state: state, child: const AcademicSetupPage()),
      ),
    ],
  );
});

Page<void> _appPage({
  required GoRouterState state,
  required Widget child,
}) {
  return NoTransitionPage<void>(
    key: state.pageKey,
    child: child,
  );
}

class AppNavigatorObserver extends NavigatorObserver {
  final List<Route<dynamic>> _routes = <Route<dynamic>>[];

  Route<dynamic>? get topRoute => _routes.isEmpty ? null : _routes.last;

  bool get hasPopupRouteOnTop => topRoute is PopupRoute<dynamic>;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _routes.add(route);
    super.didPush(route, previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _routes.remove(route);
    super.didPop(route, previousRoute);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _routes.remove(route);
    super.didRemove(route, previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (oldRoute != null) {
      _routes.remove(oldRoute);
    }
    if (newRoute != null) {
      _routes.add(newRoute);
    }
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
  }
}

class RouterRefreshNotifier extends ChangeNotifier {
  RouterRefreshNotifier(this._ref) {
    _ref.listen<AuthState>(authControllerProvider, (previous, next) {
      notifyListeners();
    });
    _sessionNotifier = _ref.read(sessionExpiryNotifierProvider);
    _sessionNotifier.addListener(notifyListeners);
  }

  final Ref _ref;
  late final SessionExpiryNotifier _sessionNotifier;

  @override
  void dispose() {
    _sessionNotifier.removeListener(notifyListeners);
    super.dispose();
  }
}

bool _isRouteAllowedForRole(AppRole role, String location) {
  switch (role) {
    case AppRole.teacher:
      return location == AppRoutes.dashboard ||
          location == AppRoutes.exams ||
          location == AppRoutes.questionBank ||
          location == AppRoutes.results;
    case AppRole.student:
      return location == AppRoutes.dashboard ||
          location == AppRoutes.results ||
          location.startsWith(AppRoutes.exams);
    case AppRole.platformAdmin:
      return location == AppRoutes.dashboard ||
          location == AppRoutes.academicSetup;
    case AppRole.instituteAdmin:
      return location == AppRoutes.dashboard ||
          location == AppRoutes.academicSetup ||
          location == AppRoutes.questionBank ||
          location == AppRoutes.exams ||
          location == AppRoutes.results;
    case AppRole.parent:
      return location == AppRoutes.dashboard;
  }
}
