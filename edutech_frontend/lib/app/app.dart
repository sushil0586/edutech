import 'package:education_frontend/app/router/app_router.dart';
import 'package:education_frontend/core/theme/app_theme.dart';
import 'package:education_frontend/shared/config/app_branding.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EduTechApp extends ConsumerWidget {
  const EduTechApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    final observer = ref.watch(appNavigatorObserverProvider);

    return MaterialApp.router(
      title: AppBranding.browserTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
      builder: (context, child) {
        return _GlobalEscapeDismissHandler(
          observer: observer,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

class _GlobalEscapeDismissHandler extends StatelessWidget {
  const _GlobalEscapeDismissHandler({
    required this.observer,
    required this.child,
  });

  final AppNavigatorObserver observer;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Focus(
      autofocus: true,
      canRequestFocus: true,
      child: CallbackShortcuts(
        bindings: <ShortcutActivator, VoidCallback>{
          const SingleActivator(LogicalKeyboardKey.escape): () {
            if (!observer.hasPopupRouteOnTop) {
              return;
            }
            final navigator = observer.navigator;
            if (navigator == null || !navigator.canPop()) {
              return;
            }
            navigator.pop();
          },
        },
        child: child,
      ),
    );
  }
}
