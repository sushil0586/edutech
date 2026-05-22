import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/domain/models/app_user.dart';
import 'package:education_frontend/features/notifications/presentation/widgets/notification_bell_button.dart';
import 'package:education_frontend/shared/config/app_branding.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_radius.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:education_frontend/shared/widgets/responsive_page_container.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DashboardShell extends StatelessWidget {
  const DashboardShell({
    required this.title,
    required this.user,
    required this.body,
    required this.currentRoute,
    required this.onLogout,
    super.key,
  });

  final String title;
  final AppUser user;
  final Widget body;
  final String currentRoute;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isDesktop = width >= 1100;
    final items = _navigationItemsForRole(user.role);
    final selectedIndex = _selectedIndex(items, currentRoute);

    if (isDesktop) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Row(
          children: [
            _Sidebar(
              user: user,
              items: items,
              currentRoute: currentRoute,
              onLogout: onLogout,
            ),
            Expanded(
              child: Column(
                children: [
                  _TopHeader(title: title, user: user, onLogout: onLogout),
                  Expanded(child: _ShellBody(child: body)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface.withValues(alpha: 0.92),
        title: Text(title),
        actions: const [
          NotificationBellButton(),
          SizedBox(width: AppSpacing.xs),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppColors.sidebar,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.md,
                ),
                child: _CompactUserPanel(user: user),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                  ),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    final selected = item.route == currentRoute;
                    return _DrawerItem(
                      item: item,
                      selected: selected,
                      onTap: () {
                        Navigator.of(context).pop();
                        context.go(item.route);
                      },
                    );
                  },
                  separatorBuilder: (_, _) => const SizedBox(height: 6),
                  itemCount: items.length,
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: SizedBox(
                  width: double.infinity,
                  child: AppButton(
                    label: 'Log out',
                    onPressed: onLogout,
                    icon: Icons.logout_rounded,
                    variant: AppButtonVariant.secondary,
                    expand: true,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: _ShellBody(child: body),
      bottomNavigationBar: items.length > 1
          ? NavigationBar(
              selectedIndex: selectedIndex,
              onDestinationSelected: (index) => context.go(items[index].route),
              destinations: [
                for (final item in items)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    label: item.label,
                  ),
              ],
            )
          : null,
    );
  }

  int _selectedIndex(List<_DashboardNavItem> items, String route) {
    final index = items.indexWhere((item) => item.route == route);
    return index >= 0 ? index : 0;
  }

  List<_DashboardNavItem> _navigationItemsForRole(AppRole role) {
    switch (role) {
      case AppRole.teacher:
        return const [
          _DashboardNavItem(
            label: 'Dashboard',
            icon: Icons.dashboard_outlined,
            route: AppRoutes.dashboard,
          ),
          _DashboardNavItem(
            label: 'Exams',
            icon: Icons.fact_check_outlined,
            route: AppRoutes.exams,
          ),
          _DashboardNavItem(
            label: 'Question Bank',
            icon: Icons.library_books_outlined,
            route: AppRoutes.questionBank,
          ),
          _DashboardNavItem(
            label: 'Results',
            icon: Icons.analytics_outlined,
            route: AppRoutes.results,
          ),
        ];
      case AppRole.student:
        return const [
          _DashboardNavItem(
            label: 'Dashboard',
            icon: Icons.dashboard_outlined,
            route: AppRoutes.dashboard,
          ),
          _DashboardNavItem(
            label: 'Exams',
            icon: Icons.assignment_outlined,
            route: AppRoutes.exams,
          ),
          _DashboardNavItem(
            label: 'Results',
            icon: Icons.analytics_outlined,
            route: AppRoutes.results,
          ),
        ];
      case AppRole.platformAdmin:
      case AppRole.instituteAdmin:
        return const [
          _DashboardNavItem(
            label: 'Dashboard',
            icon: Icons.dashboard_outlined,
            route: AppRoutes.dashboard,
          ),
          _DashboardNavItem(
            label: 'Academic Setup',
            icon: Icons.account_tree_outlined,
            route: AppRoutes.academicSetup,
          ),
        ];
      case AppRole.parent:
        return const [
          _DashboardNavItem(
            label: 'Dashboard',
            icon: Icons.dashboard_outlined,
            route: AppRoutes.dashboard,
          ),
        ];
    }
  }
}

class _Sidebar extends StatelessWidget {
  const _Sidebar({
    required this.user,
    required this.items,
    required this.currentRoute,
    required this.onLogout,
  });

  final AppUser user;
  final List<_DashboardNavItem> items;
  final String currentRoute;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 292,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.sidebarStart, AppColors.sidebarEnd],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        border: Border(right: BorderSide(color: AppColors.sidebarBorder)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _BrandBlock(),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Workspace',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.sidebarMuted,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Expanded(
                child: ListView.separated(
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _SidebarItem(
                      item: item,
                      selected: item.route == currentRoute,
                    );
                  },
                  separatorBuilder: (_, _) => const SizedBox(height: 6),
                  itemCount: items.length,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              _SidebarFooter(user: user, onLogout: onLogout),
            ],
          ),
        ),
      ),
    );
  }
}

class _BrandBlock extends StatelessWidget {
  const _BrandBlock();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: const Icon(Icons.school_rounded, color: Colors.white),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppBranding.shortName,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                AppBranding.tagline,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.sidebarMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SidebarItem extends StatelessWidget {
  const _SidebarItem({required this.item, required this.selected});

  final _DashboardNavItem item;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go(item.route),
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: selected
              ? Colors.white.withValues(alpha: 0.14)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.sidebarGlow,
                    blurRadius: 24,
                    spreadRadius: -10,
                    offset: const Offset(0, 10),
                  ),
                ]
              : const [],
        ),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 20,
              color: selected ? Colors.white : AppColors.sidebarMuted,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                item.label,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: selected ? Colors.white : AppColors.sidebarText,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SidebarFooter extends StatelessWidget {
  const _SidebarFooter({required this.user, required this.onLogout});

  final AppUser user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.12),
            Colors.white.withValues(alpha: 0.08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: Colors.white,
                child: Text(
                  user.displayName.isEmpty
                      ? '?'
                      : user.displayName[0].toUpperCase(),
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user.instituteLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.sidebarMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AppBadge(
            label: user.role.label,
            backgroundColor: Colors.white.withValues(alpha: 0.12),
            foregroundColor: Colors.white,
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: AppButton(
              label: 'Log out',
              onPressed: onLogout,
              icon: Icons.logout_rounded,
              variant: AppButtonVariant.ghost,
            ),
          ),
        ],
      ),
    );
  }
}

class _TopHeader extends StatelessWidget {
  const _TopHeader({
    required this.title,
    required this.user,
    required this.onLogout,
  });

  final String title;
  final AppUser user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final searchPlaceholder = _searchPlaceholderForTitle(title);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.glass.withValues(alpha: 0.86),
        border: const Border(bottom: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 24,
            spreadRadius: -10,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xxl,
            AppSpacing.lg,
            AppSpacing.xxl,
            AppSpacing.lg,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nexora Learn / $title',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'A calm workspace for focused teaching, learning, and assessment.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.xl),
              SizedBox(
                width: 320,
                child: AppTextField(
                  enabled: false,
                  hint: searchPlaceholder,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const NotificationBellButton(),
              const SizedBox(width: AppSpacing.xs),
              const _HeaderIconButton(icon: Icons.help_outline_rounded),
              const SizedBox(width: AppSpacing.xs),
              const _HeaderIconButton(icon: Icons.tune_rounded),
              const SizedBox(width: AppSpacing.md),
              _HeaderUserChip(user: user, onLogout: onLogout),
            ],
          ),
        ),
      ),
    );
  }

  String _searchPlaceholderForTitle(String title) {
    return switch (title) {
      'Question Bank' => 'Search questions and tags',
      'Exams' => 'Search exams and schedules',
      'Results' => 'Search results and analytics',
      'Academic Setup' => 'Search setup records',
      _ => 'Search your workspace',
    };
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.8)),
      ),
      child: IconButton(
        onPressed: () {},
        icon: Icon(icon, size: 20),
        color: AppColors.textSecondary,
        tooltip: 'Workspace action',
      ),
    );
  }
}

class _HeaderUserChip extends StatelessWidget {
  const _HeaderUserChip({required this.user, required this.onLogout});

  final AppUser user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Profile',
      color: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      onSelected: (value) {
        if (value == 'logout') {
          onLogout();
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'logout', child: Text('Log out')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withValues(alpha: 0.12),
              child: Text(
                user.displayName.isEmpty
                    ? '?'
                    : user.displayName[0].toUpperCase(),
                style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.displayName,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  user.role.label,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            const SizedBox(width: AppSpacing.xs),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

class _CompactUserPanel extends StatelessWidget {
  const _CompactUserPanel({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.surface, AppColors.surfaceMuted],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: Text(
              user.displayName.isEmpty ? '?' : user.displayName[0].toUpperCase(),
              style: const TextStyle(color: Colors.white),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(user.role.label, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _DashboardNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      tileColor: selected ? AppColors.subtleAccent : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      leading: Icon(
        item.icon,
        color: selected ? AppColors.primary : AppColors.textSecondary,
      ),
      title: Text(
        item.label,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: selected ? AppColors.primary : AppColors.textPrimary,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
    );
  }
}

class _ShellBody extends StatelessWidget {
  const _ShellBody({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.background, AppColors.backgroundSoft],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: ResponsivePageContainer(child: child),
    );
  }
}

class _DashboardNavItem {
  const _DashboardNavItem({
    required this.label,
    required this.icon,
    required this.route,
  });

  final String label;
  final IconData icon;
  final String route;
}
