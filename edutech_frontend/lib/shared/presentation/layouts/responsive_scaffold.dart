import 'package:education_frontend/shared/widgets/responsive_page_container.dart';
import 'package:flutter/material.dart';

class ResponsiveScaffold extends StatelessWidget {
  const ResponsiveScaffold({
    required this.title,
    required this.child,
    super.key,
    this.actions = const [],
  });

  final String title;
  final Widget child;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(title: Text(title), actions: actions),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF8FAFC), Color(0xFFEFF6FF)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: ResponsivePageContainer(
          child: Padding(
            padding: EdgeInsets.only(top: width >= 700 ? 72 : 56),
            child: child,
          ),
        ),
      ),
    );
  }
}
