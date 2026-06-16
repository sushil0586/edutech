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
    final isDesktop = width >= 1200;
    final isLaptop = width >= 960 && width < 1200;
    final compactMobile = width < 600;
    final items = _navigationItemsForRole(user.role);
    final selectedIndex = _selectedIndex(items, currentRoute);

    if (isDesktop || isLaptop) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Row(
          children: [
            _Sidebar(
              user: user,
              items: items,
              currentRoute: currentRoute,
              onLogout: onLogout,
              compact: isLaptop,
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
        backgroundColor: AppColors.surface.withValues(alpha: 0.94),
        titleSpacing: compactMobile ? AppSpacing.sm : null,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
            if (compactMobile)
              Text(
                user.instituteLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),
        actions: [
          if (!compactMobile)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.xs),
              child: Center(
                child: AppBadge(
                  label: user.role.label,
                  backgroundColor: AppColors.surfaceMuted,
                  foregroundColor: AppColors.secondary,
                ),
              ),
            ),
          const NotificationBellButton(),
          const SizedBox(width: AppSpacing.xs),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppColors.sidebar,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(
                  compactMobile ? AppSpacing.md : AppSpacing.lg,
                  AppSpacing.lg,
                  compactMobile ? AppSpacing.md : AppSpacing.lg,
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
      bottomNavigationBar: items.length > 1 && items.length <= 4
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
          _DashboardNavItem(
            label: 'Question Bank',
            icon: Icons.library_books_outlined,
            route: AppRoutes.questionBank,
          ),
          _DashboardNavItem(
            label: 'Exams',
            icon: Icons.fact_check_outlined,
            route: AppRoutes.exams,
          ),
          _DashboardNavItem(
            label: 'Results',
            icon: Icons.analytics_outlined,
            route: AppRoutes.results,
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
    this.compact = false,
  });

  final AppUser user;
  final List<_DashboardNavItem> items;
  final String currentRoute;
  final VoidCallback onLogout;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: compact ? 92 : 272,
      decoration: BoxDecoration(
        color: AppColors.sidebar,
        border: const Border(right: BorderSide(color: AppColors.sidebarBorder)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _BrandBlock(compact: compact),
              const SizedBox(height: AppSpacing.lg),
              if (!compact) ...[
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.06),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: const Icon(
                          Icons.auto_graph_rounded,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Workspace',
                              style: Theme.of(context).textTheme.labelMedium
                                  ?.copyWith(color: AppColors.sidebarMuted),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Exam intelligence hub',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              Expanded(
                child: ListView.separated(
                  padding: EdgeInsets.zero,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _SidebarItem(
                      item: item,
                      selected: item.route == currentRoute,
                      compact: compact,
                    );
                  },
                  separatorBuilder: (_, _) => const SizedBox(height: 6),
                  itemCount: items.length,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              _SidebarFooter(user: user, onLogout: onLogout, compact: compact),
            ],
          ),
        ),
      ),
    );
  }
}

class _BrandBlock extends StatelessWidget {
  const _BrandBlock({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: compact
          ? MainAxisAlignment.center
          : MainAxisAlignment.start,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: const Icon(
            Icons.layers_rounded,
            color: Colors.white,
            size: 20,
          ),
        ),
        if (!compact) ...[
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppBranding.shortName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
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
      ],
    );
  }
}

class _SidebarItem extends StatelessWidget {
  const _SidebarItem({
    required this.item,
    required this.selected,
    this.compact = false,
  });

  final _DashboardNavItem item;
  final bool selected;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go(item.route),
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: 12,
        ),
        decoration: BoxDecoration(
          color: selected ? AppColors.sidebarActive : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(
            color: selected ? AppColors.sidebarActive : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisAlignment: compact
              ? MainAxisAlignment.center
              : MainAxisAlignment.start,
          children: [
            Icon(
              item.icon,
              size: 19,
              color: selected ? Colors.white : AppColors.sidebarMuted,
            ),
            if (!compact) ...[
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  item.label,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: selected ? Colors.white : AppColors.sidebarText,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SidebarFooter extends StatelessWidget {
  const _SidebarFooter({
    required this.user,
    required this.onLogout,
    this.compact = false,
  });

  final AppUser user;
  final VoidCallback onLogout;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (compact)
            Center(
              child: CircleAvatar(
                radius: 20,
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
            )
          else
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
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
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
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
          const SizedBox(height: AppSpacing.sm),
          if (!compact)
            AppBadge(
              label: user.role.label,
              backgroundColor: Colors.white.withValues(alpha: 0.12),
              foregroundColor: Colors.white,
            ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: AppButton(
              label: compact ? 'Logout' : 'Log out',
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
    final greeting = _greetingForNow();
    final firstName = user.displayName.trim().split(' ').first;
    final width = MediaQuery.sizeOf(context).width;
    final compactDesktop = width < 1380;
    final wrapHeader = width < 1260;
    final searchControl = _SearchControl(
      placeholder: searchPlaceholder,
      compact: width < 720,
      width: wrapHeader
          ? (width < 720 ? width - 40 : 320)
          : (compactDesktop ? 280 : 340),
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            wrapHeader ? 20 : 32,
            20,
            wrapHeader ? 20 : 32,
            20,
          ),
          child: wrapHeader
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _HeaderTitleBlock(
                      title: title,
                      greeting: greeting,
                      firstName: firstName,
                      subtitle: _subtitleForTitle(title),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        searchControl,
                        _ContextChip(
                          label: user.instituteLabel,
                          compact: compactDesktop,
                        ),
                        const NotificationBellButton(),
                        const _HeaderIconButton(
                          icon: Icons.help_outline_rounded,
                        ),
                        const _HeaderIconButton(icon: Icons.tune_rounded),
                        _HeaderUserChip(user: user, onLogout: onLogout),
                      ],
                    ),
                  ],
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: _HeaderTitleBlock(
                        title: title,
                        greeting: greeting,
                        firstName: firstName,
                        subtitle: _subtitleForTitle(title),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    searchControl,
                    const SizedBox(width: AppSpacing.md),
                    _ContextChip(
                      label: user.instituteLabel,
                      compact: compactDesktop,
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

  String _subtitleForTitle(String title) {
    return switch (title) {
      'Question Bank' =>
        'Curate cleaner questions, metadata, and reusable assessment assets.',
      'Exams' =>
        'Manage paper structure, schedules, and submissions from one clear workspace.',
      'Results' =>
        'Track performance, trends, and weak areas with better clarity.',
      'Academic Setup' =>
        'Configure institute structure, cohorts, and permissions with confidence.',
      _ => 'Your exam intelligence overview for today.',
    };
  }

  String _greetingForNow() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 17) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }
}

class _SearchControl extends StatelessWidget {
  const _SearchControl({
    required this.placeholder,
    required this.width,
    this.compact = false,
  });

  final String placeholder;
  final double width;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: SizedBox(
        height: 48,
        child: AppTextField(
          enabled: false,
          hint: placeholder,
          prefixIcon: const Icon(Icons.search_rounded, size: 20),
          suffixIcon: compact
              ? null
              : Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceStrong,
                        borderRadius: BorderRadius.circular(AppRadius.xs),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        'Ctrl K',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}

class _HeaderTitleBlock extends StatelessWidget {
  const _HeaderTitleBlock({
    required this.title,
    required this.greeting,
    required this.firstName,
    required this.subtitle,
  });

  final String title;
  final String greeting;
  final String firstName;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Workspace / $title',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: AppColors.textMuted,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$greeting, $firstName',
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _ContextChip extends StatelessWidget {
  const _ContextChip({required this.label, this.compact = false});

  final String label;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.corporate_fare_outlined,
            size: 18,
            color: AppColors.secondary,
          ),
          const SizedBox(width: AppSpacing.sm),
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: compact ? 140 : 220),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(
                context,
              ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          const Icon(
            Icons.keyboard_arrow_down_rounded,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.button),
        border: Border.all(color: AppColors.border),
      ),
      child: IconButton(
        onPressed: () {},
        icon: Icon(icon, size: 18),
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
        height: 44,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.button),
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
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.secondary,
            child: Text(
              user.displayName.isEmpty
                  ? '?'
                  : user.displayName[0].toUpperCase(),
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
                Text(
                  user.role.label,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
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
        borderRadius: BorderRadius.circular(AppRadius.sm),
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
    return ColoredBox(
      color: AppColors.background,
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
