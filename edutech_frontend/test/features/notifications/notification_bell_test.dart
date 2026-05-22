import 'dart:async';

import 'package:education_frontend/features/notifications/domain/models/app_notification.dart';
import 'package:education_frontend/features/notifications/presentation/providers/notification_providers.dart';
import 'package:education_frontend/features/notifications/presentation/widgets/notification_bell_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('notification icon renders with unread badge', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notificationUnreadCountProvider.overrideWith((ref) async => 3),
          notificationListProvider.overrideWith((ref) async => const []),
        ],
        child: const MaterialApp(
          home: Scaffold(body: NotificationBellButton()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.notifications_none_rounded), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });

  testWidgets('notification panel handles loading and empty states', (tester) async {
    final completer = Completer<List<AppNotification>>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notificationUnreadCountProvider.overrideWith((ref) async => 0),
          notificationListProvider.overrideWith((ref) => completer.future),
        ],
        child: const MaterialApp(
          home: Scaffold(body: NotificationBellButton()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.notifications_none_rounded));
    await tester.pump();
    expect(find.text('Loading notifications'), findsOneWidget);

    completer.complete(const []);
    await tester.pumpAndSettle();
    expect(find.text('No notifications yet'), findsOneWidget);
  });

  testWidgets('notification panel handles error state', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notificationUnreadCountProvider.overrideWith((ref) async => 0),
          notificationListProvider.overrideWith(
            (ref) async => throw Exception('Unable to load notifications'),
          ),
        ],
        child: const MaterialApp(
          home: Scaffold(body: NotificationBellButton()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.notifications_none_rounded));
    await tester.pumpAndSettle();
    expect(find.textContaining('Unable to load notifications'), findsOneWidget);
  });
}
