import 'dart:async';

import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/core/storage/ui_preferences_store.dart';
import 'package:education_frontend/core/utils/web_download.dart';
import 'package:education_frontend/features/academics/domain/models/academic_lookup_option.dart';
import 'package:education_frontend/features/academics/presentation/providers/academic_lookup_providers.dart';
import 'package:education_frontend/features/auth/domain/models/app_role.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/question_bank/data/repositories/question_bank_repository.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:education_frontend/features/question_bank/presentation/helpers/question_bank_refresh.dart';
import 'package:education_frontend/features/question_bank/presentation/providers/question_bank_providers.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_dropdown.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:education_frontend/shared/widgets/app_section_header.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
import 'package:education_frontend/shared/widgets/app_workspace_scaffold.dart';
import 'package:education_frontend/shared/widgets/action_button_group_component.dart';
import 'package:education_frontend/shared/widgets/compact_action_menu_component.dart';
import 'package:education_frontend/shared/widgets/dashboard_stat_card.dart';
import 'package:education_frontend/shared/widgets/filter_bar_component.dart';
import 'package:education_frontend/shared/widgets/loading_skeleton_component.dart';
import 'package:education_frontend/shared/widgets/pagination_bar_component.dart';
import 'package:education_frontend/shared/widgets/status_badge_component.dart';
import 'package:education_frontend/shared/widgets/workspace_page_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';

class QuestionBankPage extends ConsumerStatefulWidget {
  const QuestionBankPage({super.key});

  @override
  ConsumerState<QuestionBankPage> createState() => _QuestionBankPageState();
}

class _QuestionBankPageState extends ConsumerState<QuestionBankPage> {
  static const _filterPrefsKey = 'question_bank_last_filters';
  static const _favoritePrefsKey = 'question_bank_favorites';
  static const _recentTopicPrefsKey = 'question_bank_recent_topics';

  late final TextEditingController _searchController;
  Set<String> _favoriteQuestionIds = <String>{};
  List<String> _recentTopicIds = const <String>[];
  bool _showFavoritesOnly = false;
  bool _hasLoadedPreferences = false;
  String? _programFilterId;
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: ref.read(questionFilterProvider).search,
    );
    Future.microtask(_loadPreferences);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applySearch() {
    _updateFilters(
      ref
          .read(questionFilterProvider)
          .copyWith(search: _searchController.text, page: 1),
    );
  }

  Future<void> _loadPreferences() async {
    final store = ref.read(uiPreferencesStoreProvider);
    final savedFilter = await store.readJson(_filterPrefsKey);
    final favorites = await store.readStringList(_favoritePrefsKey);
    final recentTopics = await store.readStringList(_recentTopicPrefsKey);
    if (!mounted) return;
    if (savedFilter != null) {
      final loadedFilter = TeacherQuestionFilterState(
        subjectId: savedFilter['subjectId']?.toString(),
        topicId: savedFilter['topicId']?.toString(),
        questionType: savedFilter['questionType']?.toString(),
        difficultyLevel: savedFilter['difficultyLevel']?.toString(),
        missingExplanationOnly: savedFilter['missingExplanationOnly'] == true,
        ordering: savedFilter['ordering']?.toString(),
        page: 1,
        pageSize: (savedFilter['pageSize'] as int?) ?? 20,
        search: savedFilter['search']?.toString() ?? '',
      );
      _searchController.text = loadedFilter.search;
      ref.read(questionFilterProvider.notifier).update(loadedFilter);
    }
    setState(() {
      _favoriteQuestionIds = favorites.toSet();
      _recentTopicIds = recentTopics;
      _showFavoritesOnly = savedFilter?['showFavoritesOnly'] == true;
      _hasLoadedPreferences = true;
    });
  }

  Future<void> _persistPreferences(TeacherQuestionFilterState filters) async {
    if (!_hasLoadedPreferences) return;
    await ref.read(uiPreferencesStoreProvider).writeJson(_filterPrefsKey, {
      'subjectId': filters.subjectId,
      'topicId': filters.topicId,
      'questionType': filters.questionType,
      'difficultyLevel': filters.difficultyLevel,
      'missingExplanationOnly': filters.missingExplanationOnly,
      'ordering': filters.ordering,
      'pageSize': filters.pageSize,
      'search': filters.search,
      'showFavoritesOnly': _showFavoritesOnly,
    });
  }

  void _updateFilters(TeacherQuestionFilterState next) {
    ref.read(questionFilterProvider.notifier).update(next);
    unawaited(_persistPreferences(next));
    final topicId = next.topicId;
    if (topicId != null && topicId.isNotEmpty) {
      _rememberRecentTopic(topicId);
    }
  }

  Future<void> _rememberRecentTopic(String topicId) async {
    final next = [
      topicId,
      ..._recentTopicIds.where((item) => item != topicId),
    ].take(5).toList();
    setState(() {
      _recentTopicIds = next;
    });
    await ref
        .read(uiPreferencesStoreProvider)
        .writeStringList(_recentTopicPrefsKey, next);
  }

  Future<void> _toggleFavorite(String questionId) async {
    final next = {..._favoriteQuestionIds};
    if (!next.add(questionId)) {
      next.remove(questionId);
    }
    setState(() {
      _favoriteQuestionIds = next;
    });
    await ref
        .read(uiPreferencesStoreProvider)
        .writeStringList(_favoritePrefsKey, next.toList());
  }

  Future<void> _openImportDialog() async {
    final user = ref.read(currentUserProvider);
    if (user == null || (user.instituteId ?? '').isEmpty) {
      return;
    }
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) =>
          _QuestionImportDialog(instituteId: user.instituteId!),
    );
    invalidateQuestionBankViews(ref);
  }

  Future<void> _performBulkAction(Map<String, dynamic> payload) async {
    try {
      await ref.read(questionBankRepositoryProvider).performBulkAction(payload);
      ref.read(selectedQuestionIdsProvider.notifier).clear();
      invalidateQuestionBankViews(ref);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Bulk action completed.')));
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    }
  }

  Future<void> _previewQuestion(TeacherQuestionModel question) async {
    await showDialog<void>(
      context: context,
      builder: (context) => _QuestionPreviewDialog(question: question),
    );
  }

  Future<void> _openTagEditor(TeacherQuestionModel question) async {
    final tags = await ref.read(questionBankRepositoryProvider).fetchTags();
    if (!mounted) return;
    final didSave = await showDialog<bool>(
      context: context,
      builder: (context) => _QuestionTagEditorDialog(
        question: question,
        availableTags: tags,
        onAddTag: (tagId) => ref
            .read(questionBankRepositoryProvider)
            .createTagMap(questionId: question.id, tagId: tagId),
        onRemoveTag: (mapId) =>
            ref.read(questionBankRepositoryProvider).deleteTagMap(mapId),
      ),
    );
    if (didSave == true) {
      invalidateQuestionBankListOnly(ref);
    }
  }

  Future<void> _openQuestionDialog({
    TeacherQuestionModel? question,
    TeacherQuestionModel? seedQuestion,
  }) async {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      return;
    }

    final subjects = ref
        .read(subjectOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );
    final topics = ref
        .read(allTopicOptionsProvider)
        .maybeWhen(
          data: (items) => items,
          orElse: () => const <AcademicLookupOption>[],
        );
    final didSave =
        await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (context) => _QuestionEditorDialog(
              currentInstituteId: user.instituteId ?? '',
              currentTeacherId: user.teacherProfileId,
              subjects: subjects,
              topics: topics,
              initialQuestion: question,
              seedQuestion: seedQuestion,
              fullPage: true,
            ),
          ),
        ) ??
        false;

    if (didSave) {
      invalidateQuestionBankViews(ref);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    if (user == null) {
      return const SizedBox.shrink();
    }
    final workspaceLabel = user.role == AppRole.instituteAdmin
        ? 'Institute'
        : 'Teacher';

    final filters = ref.watch(questionFilterProvider);
    final questionPageValue = ref.watch(questionPageProvider);
    final questionPerformanceValue = ref.watch(
      teacherQuestionPerformanceProvider,
    );
    final selectedQuestionIds = ref.watch(selectedQuestionIdsProvider);
    final isCompact = ref.watch(compactQuestionViewProvider);
    final programsValue = ref.watch(programOptionsProvider);
    final subjectsValue = ref.watch(subjectOptionsProvider);
    final topicsValue = ref.watch(allTopicOptionsProvider);
    final programs = programsValue.maybeWhen(
      data: (items) => items,
      orElse: () => const <AcademicLookupOption>[],
    );
    final allSubjects = subjectsValue.maybeWhen(
      data: (items) => items,
      orElse: () => const <AcademicLookupOption>[],
    );
    final filteredSubjects =
        _programFilterId == null || _programFilterId!.isEmpty
        ? allSubjects
        : allSubjects
              .where((item) => item.programId == _programFilterId)
              .toList();
    final allTopics = topicsValue.maybeWhen(
      data: (items) => items,
      orElse: () => const <AcademicLookupOption>[],
    );
    final subjectNames = {
      for (final subject in allSubjects) subject.id: subject.name,
    };
    final topicNames = {for (final topic in allTopics) topic.id: topic.name};
    final programNames = {
      for (final program in programs) program.id: program.name,
    };
    final totalQuestions = questionPageValue.maybeWhen(
      data: (page) => page.totalCount,
      orElse: () => 0,
    );
    final weakSignalCount = questionPerformanceValue.maybeWhen(
      data: (items) => items.length,
      orElse: () => 0,
    );

    return DashboardShell(
      title: 'Question Bank',
      user: user,
      currentRoute: AppRoutes.questionBank,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: ListView(
        children: [
          WorkspacePageIntro(
            eyebrow: '$workspaceLabel question bank',
            title: 'Question library',
            subtitle:
                'Search, filter, author, preview, and import questions from one consistent assessment workspace.',
            breadcrumbs: [workspaceLabel, 'Question Bank'],
            primaryAction: FilledButton.icon(
              onPressed: () => _openQuestionDialog(),
              icon: const Icon(Icons.add_circle_outline),
              label: const Text('Create question'),
            ),
            secondaryActions: [
              OutlinedButton.icon(
                onPressed: _openImportDialog,
                icon: const Icon(Icons.upload_file_outlined),
                label: const Text('Import CSV'),
              ),
            ],
            metrics: [
              DashboardStatCard(
                label: 'Total questions',
                value: '$totalQuestions',
                helper: 'Current filtered inventory',
                icon: Icons.library_books_outlined,
              ),
              DashboardStatCard(
                label: 'Favorites',
                value: '${_favoriteQuestionIds.length}',
                helper: 'Saved by this user',
                icon: Icons.star_outline_rounded,
                tint: AppColors.amber,
              ),
              DashboardStatCard(
                label: 'Weak signals',
                value: '$weakSignalCount',
                helper: 'Quality signals returned',
                icon: Icons.insights_outlined,
                tint: AppColors.rose,
              ),
              DashboardStatCard(
                label: 'Selection',
                value: '${selectedQuestionIds.length}',
                helper: 'Bulk action ready',
                icon: Icons.checklist_rounded,
                tint: AppColors.accent,
              ),
            ],
          ),
          AppCard(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppSectionHeader(
                    eyebrow: 'Filters and discovery',
                    title: '$workspaceLabel question bank',
                    subtitle:
                        'Filter, search, create, and edit single-answer MCQ or true/false questions without bypassing backend validations.',
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  FilterBarComponent(
                    onReset: () {
                      _searchController.clear();
                      _updateFilters(const TeacherQuestionFilterState());
                      ref.read(selectedQuestionIdsProvider.notifier).clear();
                      setState(() {
                        _showFavoritesOnly = false;
                        _programFilterId = null;
                        _statusFilter = null;
                      });
                    },
                    search: SizedBox(
                      width: 280,
                      child: AppTextField(
                        controller: _searchController,
                        onFieldSubmitted: (_) => _applySearch(),
                        label: 'Search question text',
                        hint: 'Search by wording or explanation',
                        suffixIcon: IconButton(
                          onPressed: _applySearch,
                          icon: const Icon(Icons.search),
                        ),
                      ),
                    ),
                    children: [
                      _LookupDropdown(
                        label: 'Class / program',
                        value: _programFilterId,
                        items: programs,
                        onChanged: (value) {
                          setState(() {
                            _programFilterId = value;
                          });
                          if (filters.subjectId != null &&
                              !filteredSubjects.any(
                                (item) => item.id == filters.subjectId,
                              )) {
                            _updateFilters(
                              filters.copyWith(
                                clearSubject: true,
                                clearTopic: true,
                                page: 1,
                              ),
                            );
                          }
                        },
                      ),
                      _LookupDropdown(
                        label: 'Subject',
                        value: filters.subjectId,
                        items: filteredSubjects,
                        onChanged: (value) {
                          _updateFilters(
                            filters.copyWith(
                              subjectId: value,
                              clearTopic: true,
                              page: 1,
                            ),
                          );
                        },
                      ),
                      _LookupDropdown(
                        label: 'Topic',
                        value: filters.topicId,
                        items: allTopics
                            .where(
                              (topic) =>
                                  filters.subjectId == null ||
                                  filters.subjectId!.isEmpty ||
                                  topic.subjectId == filters.subjectId,
                            )
                            .toList(),
                        onChanged: (value) {
                          _updateFilters(
                            filters.copyWith(topicId: value, page: 1),
                          );
                        },
                      ),
                      _StringDropdown(
                        label: 'Status',
                        value: _statusFilter,
                        items: const {
                          'published': 'Published',
                          'draft': 'Draft',
                          'active': 'Active',
                          'inactive': 'Inactive',
                        },
                        onChanged: (value) {
                          setState(() {
                            _statusFilter = value;
                          });
                        },
                      ),
                      _StringDropdown(
                        label: 'Question type',
                        value: filters.questionType,
                        items: const {
                          'mcq_single': 'MCQ single',
                          'mcq_multiple': 'MCQ multiple',
                          'true_false': 'True / False',
                        },
                        onChanged: (value) {
                          _updateFilters(
                            filters.copyWith(questionType: value, page: 1),
                          );
                        },
                      ),
                      _StringDropdown(
                        label: 'Sort by',
                        value: filters.ordering,
                        items: const {
                          '-created_at': 'Recently used',
                          'difficulty_level': 'Difficulty',
                          '-usage_count': 'Usage',
                          '-wrong_count': 'Wrong %',
                          '-skipped_count': 'Skip %',
                        },
                        onChanged: (value) {
                          _updateFilters(
                            filters.copyWith(ordering: value, page: 1),
                          );
                        },
                      ),
                      _StringDropdown(
                        label: 'Difficulty',
                        value: filters.difficultyLevel,
                        items: const {
                          'foundation': 'Foundation',
                          'intermediate': 'Intermediate',
                          'advanced': 'Advanced',
                        },
                        onChanged: (value) {
                          _updateFilters(
                            filters.copyWith(difficultyLevel: value, page: 1),
                          );
                        },
                      ),
                      ChoiceChip(
                        label: Text(isCompact ? 'Compact' : 'Detailed'),
                        selected: isCompact,
                        onSelected: (value) {
                          ref
                              .read(compactQuestionViewProvider.notifier)
                              .set(value);
                        },
                      ),
                      FilterChip(
                        label: const Text('Missing explanation'),
                        selected: filters.missingExplanationOnly,
                        onSelected: (value) {
                          _updateFilters(
                            filters.copyWith(
                              missingExplanationOnly: value,
                              page: 1,
                            ),
                          );
                        },
                      ),
                      FilterChip(
                        label: const Text('Favorites'),
                        selected: _showFavoritesOnly,
                        onSelected: (value) {
                          setState(() => _showFavoritesOnly = value);
                          unawaited(_persistPreferences(filters));
                        },
                      ),
                    ],
                  ),
                  if (_recentTopicIds.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        Text(
                          'Recent topics',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        ...topicsValue
                            .maybeWhen(
                              data: (items) => items,
                              orElse: () => const <AcademicLookupOption>[],
                            )
                            .where((item) => _recentTopicIds.contains(item.id))
                            .map(
                              (topic) => ActionChip(
                                label: Text(topic.name),
                                onPressed: () => _updateFilters(
                                  filters.copyWith(
                                    subjectId: topic.subjectId,
                                    topicId: topic.id,
                                    page: 1,
                                  ),
                                ),
                              ),
                            ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          WorkspaceSectionCard(
            title: 'Question inventory',
            subtitle:
                'Review filtered questions, select records for bulk actions, and open question operations from one consistent list.',
            body: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (selectedQuestionIds.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: AppCard(
                      backgroundColor: AppColors.surfaceMuted,
                      borderColor: AppColors.subtleAccent.withValues(
                        alpha: 0.5,
                      ),
                      child: Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            '${selectedQuestionIds.length} selected',
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          ActionButtonGroupComponent(
                            expand: false,
                            maxVisibleActions: 4,
                            items: [
                              ActionButtonGroupItem(
                                label: 'Activate',
                                onPressed: () => _performBulkAction({
                                  'action': 'activate',
                                  'question_ids': selectedQuestionIds.toList(),
                                }),
                                isPrimary: true,
                              ),
                              ActionButtonGroupItem(
                                label: 'Deactivate',
                                onPressed: () => _performBulkAction({
                                  'action': 'deactivate',
                                  'question_ids': selectedQuestionIds.toList(),
                                }),
                              ),
                              ActionButtonGroupItem(
                                label: 'Set difficulty',
                                onPressed: () async {
                                  final choice = await _openSimpleChoiceDialog(
                                    context: context,
                                    title: 'Update difficulty',
                                    options: const {
                                      'foundation': 'Foundation',
                                      'intermediate': 'Intermediate',
                                      'advanced': 'Advanced',
                                    },
                                  );
                                  if (choice != null) {
                                    await _performBulkAction({
                                      'action': 'set_difficulty',
                                      'difficulty_level': choice,
                                      'question_ids': selectedQuestionIds
                                          .toList(),
                                    });
                                  }
                                },
                              ),
                              ActionButtonGroupItem(
                                label: 'Change topic',
                                onPressed: () async {
                                  final topicId = await _openLookupChoiceDialog(
                                    context: context,
                                    title: 'Move to topic',
                                    options: topicsValue.maybeWhen(
                                      data: (items) => items,
                                      orElse: () =>
                                          const <AcademicLookupOption>[],
                                    ),
                                  );
                                  if (topicId != null) {
                                    await _performBulkAction({
                                      'action': 'set_topic',
                                      'topic': topicId,
                                      'question_ids': selectedQuestionIds
                                          .toList(),
                                    });
                                  }
                                },
                              ),
                              ActionButtonGroupItem(
                                label: 'Assign tag',
                                onPressed: () async {
                                  if (!context.mounted) return;
                                  final tags = await ref
                                      .read(questionBankRepositoryProvider)
                                      .fetchTags();
                                  if (!context.mounted) return;
                                  final tagId = await showDialog<String>(
                                    context: context,
                                    builder: (context) =>
                                        _StringSelectionDialog(
                                          title: 'Assign tag',
                                          options: {
                                            for (final tag in tags)
                                              tag.id: tag.name,
                                          },
                                        ),
                                  );
                                  if (tagId != null) {
                                    await _performBulkAction({
                                      'action': 'assign_tag',
                                      'tag': tagId,
                                      'question_ids': selectedQuestionIds
                                          .toList(),
                                    });
                                  }
                                },
                              ),
                              ActionButtonGroupItem(
                                label: 'Delete',
                                onPressed: () => _performBulkAction({
                                  'action': 'delete',
                                  'question_ids': selectedQuestionIds.toList(),
                                }),
                                isDestructive: true,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                questionPageValue.when(
                  data: (page) => Column(
                    children: [
                      Builder(
                        builder: (context) {
                          final visibleItems = _showFavoritesOnly
                              ? page.items
                                    .where(
                                      (item) => _favoriteQuestionIds.contains(
                                        item.id,
                                      ),
                                    )
                                    .toList()
                              : page.items;
                          final locallyFilteredItems = visibleItems.where((
                            item,
                          ) {
                            final matchesProgram =
                                _programFilterId == null ||
                                _programFilterId!.isEmpty ||
                                item.programId == _programFilterId;
                            final matchesStatus = switch (_statusFilter) {
                              'draft' => item.isDraft,
                              'published' => item.isVerified,
                              'active' => item.isActive,
                              'inactive' => !item.isActive,
                              _ => true,
                            };
                            return matchesProgram && matchesStatus;
                          }).toList();
                          return Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${locallyFilteredItems.length}${_showFavoritesOnly ? ' favorite' : ''} questions',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                          ),
                                    ),
                                  ),
                                  Checkbox(
                                    value:
                                        locallyFilteredItems.isNotEmpty &&
                                        locallyFilteredItems.every(
                                          (item) => selectedQuestionIds
                                              .contains(item.id),
                                        ),
                                    onChanged: (value) {
                                      if (value ?? false) {
                                        ref
                                            .read(
                                              selectedQuestionIdsProvider
                                                  .notifier,
                                            )
                                            .replaceAll(
                                              locallyFilteredItems.map(
                                                (item) => item.id,
                                              ),
                                            );
                                      } else {
                                        ref
                                            .read(
                                              selectedQuestionIdsProvider
                                                  .notifier,
                                            )
                                            .clear();
                                      }
                                    },
                                  ),
                                  const Text('Select page'),
                                ],
                              ),
                              const SizedBox(height: 12),
                              if (locallyFilteredItems.isEmpty)
                                const AppEmptyState(
                                  title: 'No questions match these filters',
                                  message:
                                      'Try a broader search, adjust the filters, or create the first question for this area.',
                                )
                              else
                                ...locallyFilteredItems.map((question) {
                                  final performance = questionPerformanceValue
                                      .maybeWhen(
                                        data: (items) {
                                          for (final item in items) {
                                            if (item.questionId ==
                                                question.id) {
                                              return item;
                                            }
                                          }
                                          return null;
                                        },
                                        orElse: () => null,
                                      );
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 14),
                                    child: _QuestionCard(
                                      question: question,
                                      performance: performance,
                                      isCompact: isCompact,
                                      programName:
                                          programNames[question.programId],
                                      subjectName:
                                          subjectNames[question.subjectId],
                                      topicName: question.topicId == null
                                          ? null
                                          : topicNames[question.topicId],
                                      selected: selectedQuestionIds.contains(
                                        question.id,
                                      ),
                                      isFavorite: _favoriteQuestionIds.contains(
                                        question.id,
                                      ),
                                      onToggleSelect: () => ref
                                          .read(
                                            selectedQuestionIdsProvider
                                                .notifier,
                                          )
                                          .toggle(question.id),
                                      onEdit: () => _openQuestionDialog(
                                        question: question,
                                      ),
                                      onDuplicate: () => _openQuestionDialog(
                                        seedQuestion: question,
                                      ),
                                      onPreview: () =>
                                          _previewQuestion(question),
                                      onToggleFavorite: () =>
                                          _toggleFavorite(question.id),
                                      onEditTags: () =>
                                          _openTagEditor(question),
                                    ),
                                  );
                                }),
                              const SizedBox(height: 12),
                              PaginationBarComponent(
                                label: 'Page ${filters.page}',
                                onPrevious: page.previous == null
                                    ? null
                                    : () {
                                        _updateFilters(
                                          filters.copyWith(
                                            page: filters.page - 1,
                                          ),
                                        );
                                      },
                                onNext: page.next == null
                                    ? null
                                    : () {
                                        _updateFilters(
                                          filters.copyWith(
                                            page: filters.page + 1,
                                          ),
                                        );
                                      },
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                  loading: () => const LoadingSkeletonComponent(
                    type: LoadingSkeletonType.list,
                    itemCount: 4,
                  ),
                  error: (error, _) =>
                      AppErrorState(message: readApiErrorMessage(error)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

Future<String?> _openSimpleChoiceDialog({
  required BuildContext context,
  required String title,
  required Map<String, String> options,
}) {
  return showDialog<String>(
    context: context,
    builder: (context) =>
        _StringSelectionDialog(title: title, options: options),
  );
}

Future<String?> _openLookupChoiceDialog({
  required BuildContext context,
  required String title,
  required List<AcademicLookupOption> options,
}) {
  return showDialog<String>(
    context: context,
    builder: (context) => _StringSelectionDialog(
      title: title,
      options: {for (final option in options) option.id: option.name},
    ),
  );
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.question,
    required this.programName,
    required this.subjectName,
    required this.topicName,
    required this.onEdit,
    required this.onDuplicate,
    required this.onPreview,
    required this.onToggleFavorite,
    required this.onEditTags,
    required this.selected,
    required this.isFavorite,
    required this.onToggleSelect,
    required this.isCompact,
    this.performance,
  });

  final TeacherQuestionModel question;
  final TeacherQuestionPerformanceItem? performance;
  final String? programName;
  final String? subjectName;
  final String? topicName;
  final VoidCallback onEdit;
  final VoidCallback onDuplicate;
  final VoidCallback onPreview;
  final VoidCallback onToggleFavorite;
  final VoidCallback onEditTags;
  final bool selected;
  final bool isFavorite;
  final VoidCallback onToggleSelect;
  final bool isCompact;

  @override
  Widget build(BuildContext context) {
    final previewText = question.questionText.replaceAll('\n', ' ').trim();
    return AppCard(
      backgroundColor: selected ? AppColors.backgroundSoft : AppColors.surface,
      borderColor: selected ? AppColors.primary : AppColors.border,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(value: selected, onChanged: (_) => onToggleSelect()),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        previewText.isEmpty ? 'Untitled question' : previewText,
                        maxLines: isCompact ? 2 : 3,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Wrap(
                        spacing: AppSpacing.xs,
                        runSpacing: AppSpacing.xs,
                        children: [
                          if ((programName ?? '').isNotEmpty)
                            _MetaChip(label: programName!),
                          if ((subjectName ?? '').isNotEmpty)
                            _MetaChip(label: subjectName!),
                          if ((topicName ?? '').isNotEmpty)
                            _MetaChip(label: topicName!),
                          _QualityBadge(
                            label: question.hasMinimumOptions
                                ? 'Options ready'
                                : 'Check options',
                            ok: question.hasMinimumOptions,
                          ),
                          _QualityBadge(
                            label: question.hasCorrectOption
                                ? 'Correct answer set'
                                : 'No correct answer',
                            ok: question.hasCorrectOption,
                          ),
                          _QualityBadge(
                            label: question.hasExplanation
                                ? 'Has explanation'
                                : 'Missing explanation',
                            ok: question.hasExplanation,
                          ),
                          StatusBadgeComponent(
                            label: question.isDraft
                                ? 'Draft'
                                : question.isVerified
                                ? 'Published'
                                : question.isActive
                                ? 'Active'
                                : 'Inactive',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      onPressed: onToggleFavorite,
                      icon: Icon(
                        isFavorite
                            ? Icons.star_rounded
                            : Icons.star_border_rounded,
                      ),
                      tooltip: isFavorite
                          ? 'Remove from favorites'
                          : 'Add to favorites',
                    ),
                    CompactActionMenuComponent(
                      tooltip: 'Question actions',
                      items: [
                        CompactActionMenuItem(
                          value: 'preview',
                          label: 'Preview question',
                          icon: Icons.visibility_outlined,
                          onSelected: onPreview,
                        ),
                        CompactActionMenuItem(
                          value: 'duplicate',
                          label: 'Duplicate question',
                          icon: Icons.content_copy_outlined,
                          onSelected: onDuplicate,
                        ),
                        CompactActionMenuItem(
                          value: 'tags',
                          label: 'Edit tags',
                          icon: Icons.sell_outlined,
                          onSelected: onEditTags,
                        ),
                        CompactActionMenuItem(
                          value: 'edit',
                          label: 'Edit question',
                          icon: Icons.edit_outlined,
                          onSelected: onEdit,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _MetaChip(label: _questionTypeLabel(question.questionType)),
                _MetaChip(label: _difficultyLabel(question.difficultyLevel)),
                _MetaChip(label: 'Marks ${question.defaultMarks}'),
                _MetaChip(label: 'Negative ${question.negativeMarks}'),
                _MetaChip(label: 'Used ${question.usageCount}x'),
                if (performance != null) ...[
                  _MetaChip(
                    label: 'Wrong ${performance!.wrongAttemptPercentage}%',
                  ),
                  _MetaChip(label: 'Skip ${performance!.skipPercentage}%'),
                ],
              ],
            ),
            if (question.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: question.tags
                    .map(
                      (tag) => AppBadge(
                        label: tag.name,
                        backgroundColor: AppColors.subtleAccent,
                        foregroundColor: AppColors.primary,
                      ),
                    )
                    .toList(),
              ),
            ],
            if (performance != null &&
                (double.tryParse(performance!.wrongAttemptPercentage) ?? 0) >=
                    50) ...[
              const SizedBox(height: 12),
              Text(
                'Students often answer this question incorrectly. Review its wording and explanation.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ] else if (performance != null &&
                (double.tryParse(performance!.skipPercentage) ?? 0) >= 40) ...[
              const SizedBox(height: 12),
              Text(
                'Students skip this question frequently. Consider simplifying the prompt or adding better explanation support.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            if (!isCompact && question.explanation.trim().isNotEmpty) ...[
              const SizedBox(height: 14),
              AppRichTextRenderer(
                content: question.explanation,
                contentFormat: question.contentFormat,
                compact: true,
              ),
            ] else if (!isCompact) ...[
              const SizedBox(height: 14),
              Text(
                'No teacher explanation added yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.warning,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            if (question.attachments.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  AppBadge(
                    label:
                        '${question.attachments.length} attachment${question.attachments.length == 1 ? '' : 's'}',
                    backgroundColor: AppColors.primary.withValues(alpha: 0.08),
                    foregroundColor: AppColors.primary,
                  ),
                ],
              ),
            ],
            if (!isCompact) ...[
              const SizedBox(height: 16),
              ...question.options.map(
                (option) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    option.isCorrect
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    color: option.isCorrect ? const Color(0xFF0B5D5B) : null,
                  ),
                  title: AppRichTextRenderer(
                    content: option.optionText,
                    contentFormat: option.contentFormat,
                    compact: true,
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

class _QuestionPreviewDialog extends StatelessWidget {
  const _QuestionPreviewDialog({required this.question});

  final TeacherQuestionModel question;

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: 'Question preview',
      subtitle:
          'Use this quick preview to validate wording, explanation, tags, and answer structure before placing the question in an exam.',
      eyebrow: 'Teacher workflow',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: 'Close',
      onPrimaryAction: () => Navigator.of(context).pop(),
      secondaryActionLabel: 'Done',
      onSecondaryAction: () => Navigator.of(context).pop(),
      maxWidth: 820,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaChip(label: question.questionType),
              _MetaChip(label: question.difficultyLevel),
              _MetaChip(label: 'Marks ${question.defaultMarks}'),
              if (question.isDraft) _MetaChip(label: 'Draft'),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AppRichTextRenderer(
            content: question.questionText,
            contentFormat: question.contentFormat,
            attachments: question.attachments,
          ),
          const SizedBox(height: AppSpacing.md),
          ...question.options.map(
            (option) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: AppCard(
                child: Row(
                  children: [
                    Icon(
                      option.isCorrect
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: option.isCorrect
                          ? AppColors.success
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppRichTextRenderer(
                        content: option.optionText,
                        contentFormat: option.contentFormat,
                        compact: true,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Explanation',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.xs),
          question.explanation.trim().isEmpty
              ? const Text('No explanation added yet.')
              : AppRichTextRenderer(
                  content: question.explanation,
                  contentFormat: question.contentFormat,
                ),
        ],
      ),
    );
  }
}

class _QuestionTagEditorDialog extends StatefulWidget {
  const _QuestionTagEditorDialog({
    required this.question,
    required this.availableTags,
    required this.onAddTag,
    required this.onRemoveTag,
  });

  final TeacherQuestionModel question;
  final List<QuestionTagLite> availableTags;
  final Future<void> Function(String tagId) onAddTag;
  final Future<void> Function(String tagMapId) onRemoveTag;

  @override
  State<_QuestionTagEditorDialog> createState() =>
      _QuestionTagEditorDialogState();
}

class _QuestionTagEditorDialogState extends State<_QuestionTagEditorDialog> {
  bool _isSaving = false;

  @override
  Widget build(BuildContext context) {
    final assignedTagIds = widget.question.tags.map((tag) => tag.id).toSet();
    final remainingTags = widget.availableTags
        .where((tag) => !assignedTagIds.contains(tag.id))
        .toList();
    return AppDialogShell(
      title: 'Edit tags',
      subtitle:
          'Keep tags tidy so teachers can search faster, reuse better filters, and jump from analytics to the right content.',
      eyebrow: 'Question bank',
      onClose: () => Navigator.of(context).pop(false),
      primaryActionLabel: 'Done',
      onPrimaryAction: () => Navigator.of(context).pop(true),
      isSaving: _isSaving,
      maxWidth: 720,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Assigned tags',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (widget.question.tags.isEmpty)
            const Text('No tags assigned yet.')
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: widget.question.tags
                  .map(
                    (tag) => InputChip(
                      label: Text(tag.name),
                      onDeleted: () async {
                        final navigator = Navigator.of(context);
                        setState(() => _isSaving = true);
                        await widget.onRemoveTag(tag.mapId);
                        if (!mounted) return;
                        setState(() => _isSaving = false);
                        navigator.pop(true);
                      },
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Add tag',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (remainingTags.isEmpty)
            const Text('All available tags are already linked.')
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: remainingTags
                  .map(
                    (tag) => ActionChip(
                      label: Text(tag.name),
                      onPressed: () async {
                        final navigator = Navigator.of(context);
                        setState(() => _isSaving = true);
                        await widget.onAddTag(tag.id);
                        if (!mounted) return;
                        setState(() => _isSaving = false);
                        navigator.pop(true);
                      },
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class _StringSelectionDialog extends StatelessWidget {
  const _StringSelectionDialog({required this.title, required this.options});

  final String title;
  final Map<String, String> options;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(title),
      content: SizedBox(
        width: 360,
        child: ListView(
          shrinkWrap: true,
          children: options.entries
              .map(
                (entry) => ListTile(
                  title: Text(entry.value),
                  onTap: () => Navigator.of(context).pop(entry.key),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE6F2EF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _QualityBadge extends StatelessWidget {
  const _QualityBadge({required this.label, required this.ok});

  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return AppBadge(
      label: label,
      backgroundColor: (ok ? AppColors.success : AppColors.warning).withValues(
        alpha: 0.12,
      ),
      foregroundColor: ok ? AppColors.success : AppColors.warning,
    );
  }
}

String _questionTypeLabel(String type) {
  switch (type) {
    case 'mcq_multiple':
      return 'MCQ multiple';
    case 'true_false':
      return 'True / False';
    case 'short_answer':
      return 'Short answer';
    default:
      return 'MCQ single';
  }
}

String _difficultyLabel(String difficulty) {
  if (difficulty.isEmpty) {
    return 'Unspecified';
  }
  return '${difficulty[0].toUpperCase()}${difficulty.substring(1)}';
}

class _LookupDropdown extends StatelessWidget {
  const _LookupDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String? value;
  final List<AcademicLookupOption> items;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 210,
      child: AppDropdown<String?>(
        value: value,
        label: label,
        hint: 'All ${label.toLowerCase()}',
        emptyLabel: 'No ${label.toLowerCase()} options',
        items: [
          const DropdownMenuItem<String?>(value: null, child: Text('All')),
          ...items.map(
            (item) => DropdownMenuItem<String?>(
              value: item.id,
              child: Text(item.name),
            ),
          ),
        ],
        onChanged: onChanged,
      ),
    );
  }
}

// ignore: unused_element
class _QuestionBankHero extends StatelessWidget {
  const _QuestionBankHero({
    required this.workspaceLabel,
    required this.highlights,
    required this.onCreateQuestion,
    required this.onImportCsv,
  });

  final String workspaceLabel;
  final List<String> highlights;
  final VoidCallback onCreateQuestion;
  final VoidCallback onImportCsv;

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.sizeOf(context).width >= 980;
    return AppCard(
      gradient: LinearGradient(
        colors: [
          AppColors.surface,
          AppColors.subtleAccent.withValues(alpha: 0.88),
          AppColors.surface,
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 3,
                  child: _QuestionBankHeroCopy(
                    workspaceLabel: workspaceLabel,
                    onCreateQuestion: onCreateQuestion,
                    onImportCsv: onImportCsv,
                  ),
                ),
                const SizedBox(width: AppSpacing.xl),
                Expanded(
                  flex: 2,
                  child: _QuestionBankHeroHighlights(items: highlights),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _QuestionBankHeroCopy(
                  workspaceLabel: workspaceLabel,
                  onCreateQuestion: onCreateQuestion,
                  onImportCsv: onImportCsv,
                ),
                const SizedBox(height: AppSpacing.xl),
                _QuestionBankHeroHighlights(items: highlights),
              ],
            ),
    );
  }
}

class _QuestionBankHeroCopy extends StatelessWidget {
  const _QuestionBankHeroCopy({
    required this.workspaceLabel,
    required this.onCreateQuestion,
    required this.onImportCsv,
  });

  final String workspaceLabel;
  final VoidCallback onCreateQuestion;
  final VoidCallback onImportCsv;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppBadge(
          label: '$workspaceLabel library',
          backgroundColor: AppColors.surface.withValues(alpha: 0.82),
          foregroundColor: AppColors.secondary,
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Build a cleaner question operation',
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Search, filter, tag, import, and improve your assessment inventory from a clearer workspace.',
          style: Theme.of(
            context,
          ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.xl),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            AppButton(
              label: 'New question',
              onPressed: onCreateQuestion,
              icon: Icons.add,
            ),
            AppButton(
              label: 'Import CSV',
              onPressed: onImportCsv,
              variant: AppButtonVariant.secondary,
              icon: Icons.upload_file_rounded,
            ),
          ],
        ),
      ],
    );
  }
}

class _QuestionBankHeroHighlights extends StatelessWidget {
  const _QuestionBankHeroHighlights({required this.items});

  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      backgroundColor: AppColors.surface.withValues(alpha: 0.76),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Operational pulse',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: AppSpacing.md),
          ...items
              .take(4)
              .map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.bolt_rounded,
                        size: 16,
                        color: AppColors.accent,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

// ignore: unused_element
class _QuestionBankMetricGrid extends StatelessWidget {
  const _QuestionBankMetricGrid({required this.cards});

  final List<Widget> cards;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.md,
      runSpacing: AppSpacing.md,
      children: cards.map((card) => SizedBox(width: 220, child: card)).toList(),
    );
  }
}

class _StringDropdown extends StatelessWidget {
  const _StringDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String? value;
  final Map<String, String> items;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 190,
      child: AppDropdown<String?>(
        value: value,
        label: label,
        hint: 'All ${label.toLowerCase()}',
        emptyLabel: 'No ${label.toLowerCase()} options',
        items: [
          const DropdownMenuItem<String?>(value: null, child: Text('All')),
          ...items.entries.map(
            (entry) => DropdownMenuItem<String?>(
              value: entry.key,
              child: Text(entry.value),
            ),
          ),
        ],
        onChanged: onChanged,
      ),
    );
  }
}

class _QuestionImportDialog extends ConsumerStatefulWidget {
  const _QuestionImportDialog({required this.instituteId});

  final String instituteId;

  @override
  ConsumerState<_QuestionImportDialog> createState() =>
      _QuestionImportDialogState();
}

class _QuestionImportDialogState extends ConsumerState<_QuestionImportDialog> {
  QuestionImportPreview? _preview;
  bool _isLoading = false;
  String? _error;
  String? _selectedFileName;

  Future<void> _downloadTemplate() async {
    try {
      final messenger = ScaffoldMessenger.of(context);
      final template = await ref
          .read(questionBankRepositoryProvider)
          .fetchImportTemplate();
      final csvContent = template['csv_content']?.toString() ?? '';
      await downloadTextFile(
        filename: 'nexora_question_import_template.csv',
        content: csvContent,
        mimeType: 'text/csv',
      );
      if (!mounted) return;
      await Clipboard.setData(ClipboardData(text: csvContent));
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Template downloaded for web and copied to clipboard.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = readApiErrorMessage(error);
      });
    }
  }

  Future<void> _pickAndPreview() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      withData: true,
      allowedExtensions: const ['csv'],
    );
    if (result == null || result.files.single.bytes == null) {
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
      _selectedFileName = result.files.single.name;
    });
    try {
      final preview = await ref
          .read(questionBankRepositoryProvider)
          .previewImport(
            instituteId: widget.instituteId,
            file: MultipartFile.fromBytes(
              result.files.single.bytes!,
              filename: result.files.single.name,
            ),
          );
      if (!mounted) return;
      setState(() {
        _preview = preview;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = readApiErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _finalizeImport() async {
    if (_preview == null) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(questionBankRepositoryProvider)
          .finalizeImport(instituteId: widget.instituteId, preview: _preview!);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Import completed. Created ${result['created_count'] ?? 0} questions with ${result['failed_count'] ?? 0} failures.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = readApiErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppDialogShell(
      title: 'Bulk import questions',
      subtitle:
          'Upload an Excel-friendly CSV, preview row issues, then finalize the valid rows.',
      eyebrow: 'Teacher productivity',
      onClose: () => Navigator.of(context).pop(),
      primaryActionLabel: _preview == null
          ? 'Preview import'
          : 'Import valid rows',
      onPrimaryAction: _preview == null ? _pickAndPreview : _finalizeImport,
      secondaryActionLabel: 'Download template',
      onSecondaryAction: _downloadTemplate,
      isSaving: _isLoading,
      maxWidth: 920,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            backgroundColor: AppColors.surfaceMuted,
            child: Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                _MetaChip(label: '1. Upload'),
                _MetaChip(label: '2. Validate'),
                _MetaChip(label: '3. Preview'),
                _MetaChip(label: '4. Confirm import'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (_selectedFileName != null)
            Text('Selected file: $_selectedFileName'),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            AppCard(
              backgroundColor: AppColors.error.withValues(alpha: 0.08),
              borderColor: AppColors.error.withValues(alpha: 0.22),
              child: Text(
                _error!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (_preview == null)
            const Text(
              'The template supports subject, topic, question text, options, correct answer, explanation, difficulty, and tags.',
            )
          else ...[
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MetaChip(label: 'Rows ${_preview!.totalRows}'),
                _MetaChip(label: 'Valid ${_preview!.validRows}'),
                _MetaChip(label: 'Invalid ${_preview!.invalidRows}'),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              height: 420,
              child: ListView.separated(
                itemCount: _preview!.rows.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final row = _preview!.rows[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    isThreeLine: !row.isValid && row.errors.isNotEmpty,
                    title: Text(
                      row.questionText.isEmpty
                          ? 'Row ${row.rowNumber}'
                          : row.questionText,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${row.subjectName}${row.topicName.isEmpty ? '' : ' • ${row.topicName}'} • ${row.questionType}',
                        ),
                        if (!row.isValid && row.errors.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            row.errors.entries
                                .map((entry) => '${entry.key}: ${entry.value}')
                                .join('  |  '),
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ],
                    ),
                    trailing: Text(
                      row.isValid ? 'Valid' : 'Issue',
                      style: TextStyle(
                        color: row.isValid
                            ? AppColors.success
                            : AppColors.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuestionEditorDialog extends ConsumerStatefulWidget {
  const _QuestionEditorDialog({
    required this.currentInstituteId,
    required this.currentTeacherId,
    required this.subjects,
    required this.topics,
    this.fullPage = false,
    this.initialQuestion,
    this.seedQuestion,
  });

  final String currentInstituteId;
  final String? currentTeacherId;
  final List<AcademicLookupOption> subjects;
  final List<AcademicLookupOption> topics;
  final bool fullPage;
  final TeacherQuestionModel? initialQuestion;
  final TeacherQuestionModel? seedQuestion;

  @override
  ConsumerState<_QuestionEditorDialog> createState() =>
      _QuestionEditorDialogState();
}

class _QuestionEditorDialogState extends ConsumerState<_QuestionEditorDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _questionController;
  late final TextEditingController _explanationController;
  late final TextEditingController _attachmentTitleController;
  late final TextEditingController _attachmentAltTextController;
  late final TextEditingController _defaultMarksController;
  late final TextEditingController _negativeMarksController;
  String? _subjectId;
  String? _topicId;
  String _questionType = 'mcq_single';
  String _difficulty = 'intermediate';
  String _contentFormat = 'markdown_latex';
  String _attachmentType = 'image';
  bool _isSaving = false;
  bool _saveAsDraft = false;
  late List<_EditableOption> _options;
  final List<_PendingAttachment> _newAttachments = <_PendingAttachment>[];

  bool get _isEditing => widget.initialQuestion != null;

  @override
  void initState() {
    super.initState();
    final question = widget.initialQuestion ?? widget.seedQuestion;
    _questionController = TextEditingController(
      text: question?.questionText ?? '',
    );
    _explanationController = TextEditingController(
      text: question?.explanation ?? '',
    );
    _attachmentTitleController = TextEditingController();
    _attachmentAltTextController = TextEditingController();
    _defaultMarksController = TextEditingController(
      text: question?.defaultMarks ?? '1.00',
    );
    _negativeMarksController = TextEditingController(
      text: question?.negativeMarks ?? '0.00',
    );
    _subjectId = question?.subjectId;
    _topicId = question?.topicId;
    _questionType = question?.questionType ?? 'mcq_single';
    _difficulty = question?.difficultyLevel ?? 'intermediate';
    _contentFormat = question?.contentFormat ?? 'markdown_latex';
    _saveAsDraft = question?.isDraft ?? false;
    _options =
        question?.options
            .map(
              (option) => _EditableOption(
                id: widget.initialQuestion == null ? null : option.id,
                textController: TextEditingController(text: option.optionText),
                isCorrect: option.isCorrect,
              ),
            )
            .toList() ??
        _defaultOptionsForType(_questionType);
  }

  @override
  void dispose() {
    _questionController.dispose();
    _explanationController.dispose();
    _attachmentTitleController.dispose();
    _attachmentAltTextController.dispose();
    _defaultMarksController.dispose();
    _negativeMarksController.dispose();
    for (final option in _options) {
      option.textController.dispose();
    }
    super.dispose();
  }

  Future<void> _pickAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      withData: true,
      type: FileType.custom,
      allowedExtensions: const ['png', 'jpg', 'jpeg', 'svg', 'pdf'],
    );
    if (result == null || result.files.isEmpty) {
      return;
    }
    final file = result.files.single;
    setState(() {
      _newAttachments.add(
        _PendingAttachment(
          file: file,
          title: _attachmentTitleController.text.trim(),
          altText: _attachmentAltTextController.text.trim(),
          attachmentType: _attachmentType,
        ),
      );
      _attachmentTitleController.clear();
      _attachmentAltTextController.clear();
      _attachmentType = 'image';
    });
  }

  List<_EditableOption> _defaultOptionsForType(String type) {
    if (type == 'true_false') {
      return [
        _EditableOption(textController: TextEditingController(text: 'True')),
        _EditableOption(textController: TextEditingController(text: 'False')),
      ];
    }

    return [
      _EditableOption(textController: TextEditingController()),
      _EditableOption(textController: TextEditingController()),
    ];
  }

  void _setQuestionType(String? value) {
    if (value == null || value == _questionType) {
      return;
    }

    for (final option in _options) {
      option.textController.dispose();
    }

    setState(() {
      _questionType = value;
      _options = _defaultOptionsForType(value);
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (_subjectId == null || _subjectId!.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Subject is required.')));
      return;
    }

    final filledOptions = _options
        .where((option) => option.textController.text.trim().isNotEmpty)
        .toList();

    final payload = {
      'institute': widget.currentInstituteId,
      'program': widget.subjects
          .firstWhere((subject) => subject.id == _subjectId)
          .programId,
      'subject': _subjectId,
      'topic': _topicId,
      'created_by_teacher': widget.currentTeacherId,
      'question_type': _questionType,
      'difficulty_level': _difficulty,
      'content_format': _contentFormat,
      'question_text': _questionController.text.trim(),
      'explanation': _explanationController.text.trim(),
      'default_marks': _defaultMarksController.text.trim(),
      'negative_marks': _negativeMarksController.text.trim(),
      'is_active': true,
      'is_verified': widget.initialQuestion?.isVerified ?? false,
      'metadata': {'is_draft': _saveAsDraft},
      'options': List.generate(
        filledOptions.length,
        (index) => {
          ...filledOptions[index].toJson(_contentFormat),
          'option_order': index + 1,
        },
      ),
    };

    setState(() {
      _isSaving = true;
    });

    try {
      TeacherQuestionModel savedQuestion;
      if (_isEditing) {
        savedQuestion = await ref
            .read(questionBankRepositoryProvider)
            .updateQuestion(widget.initialQuestion!.id, payload);
      } else {
        savedQuestion = await ref
            .read(questionBankRepositoryProvider)
            .createQuestion(payload);
      }

      if (_newAttachments.isNotEmpty) {
        for (var i = 0; i < _newAttachments.length; i++) {
          final attachment = _newAttachments[i];
          final bytes = attachment.file.bytes;
          if (bytes == null) {
            continue;
          }
          await ref
              .read(questionBankRepositoryProvider)
              .createAttachment(
                questionId: savedQuestion.id,
                file: MultipartFile.fromBytes(
                  bytes,
                  filename: attachment.file.name,
                ),
                attachmentType: attachment.attachmentType,
                title: attachment.title.isEmpty
                    ? attachment.file.name
                    : attachment.title,
                displayOrder: savedQuestion.attachments.length + i + 1,
                altText: attachment.altText,
                isInline:
                    attachment.attachmentType == 'image' ||
                    attachment.attachmentType == 'diagram',
              );
        }
      }
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(readApiErrorMessage(error))));
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredTopics = widget.topics
        .where((topic) => _subjectId == null || topic.subjectId == _subjectId)
        .toList();
    final isCompact = MediaQuery.sizeOf(context).width < 720;
    return widget.fullPage
        ? AppWorkspaceScaffold(
            shellRoute: AppRoutes.questionBank,
            shellTitle: 'Question Bank',
            title: _isEditing ? 'Question Authoring Workspace' : 'Add Question',
            subtitle:
                'This is now a proper workspace instead of a popup so teachers can author the prompt, options, explanation, and scoring in one clear flow.',
            eyebrow: 'Question bank',
            onClose: () => Navigator.of(context).pop(false),
            primaryActionLabel: _isEditing
                ? 'Save question'
                : 'Create question',
            onPrimaryAction: _save,
            isSaving: _isSaving,
            maxWidth: 1400,
            hero: AppCard(
              backgroundColor: AppColors.surfaceMuted,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isEditing
                              ? 'Editing a reusable bank question'
                              : 'Author a reusable exam-ready question',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'The old modal flow is replaced here with a full-page workspace so the content, scoring, and answer design are visible together.',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  AppBadge(
                    label: _saveAsDraft ? 'Draft mode' : 'Ready for use',
                    backgroundColor:
                        (_saveAsDraft ? AppColors.amber : AppColors.teal)
                            .withValues(alpha: 0.12),
                    foregroundColor: _saveAsDraft
                        ? AppColors.amber
                        : AppColors.teal,
                  ),
                ],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: _buildEditorWorkspaceContent(filteredTopics, isCompact),
            ),
          )
        : AppDialogShell(
            title: _isEditing ? 'Edit question' : 'Create question',
            subtitle:
                'Add a clear prompt, configure answer options, and keep everything ready for exam builder use.',
            eyebrow: 'Question bank',
            onClose: () => Navigator.of(context).pop(false),
            primaryActionLabel: _isEditing ? 'Save changes' : 'Create question',
            onPrimaryAction: _save,
            isSaving: _isSaving,
            maxWidth: 860,
            maxHeight: 760,
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: _buildEditorFormBody(filteredTopics, isCompact),
            ),
          );
  }

  Widget _buildEditorWorkspaceContent(
    List<AcademicLookupOption> filteredTopics,
    bool isCompact,
  ) {
    final formBody = _buildEditorFormBody(filteredTopics, isCompact);
    if (isCompact) {
      return formBody;
    }

    final filledOptions = _options
        .where((option) => option.textController.text.trim().isNotEmpty)
        .length;
    final subjectName = widget.subjects
        .cast<AcademicLookupOption?>()
        .firstWhere((subject) => subject?.id == _subjectId, orElse: () => null)
        ?.name;
    final topicName = filteredTopics
        .cast<AcademicLookupOption?>()
        .firstWhere((topic) => topic?.id == _topicId, orElse: () => null)
        ?.name;

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 1080) {
          return Column(
            children: [
              formBody,
              const SizedBox(height: AppSpacing.lg),
              _QuestionEditorSidebar(
                subjectName: subjectName,
                topicName: topicName,
                questionType: _questionType,
                difficulty: _difficulty,
                hasQuestionPrompt: _questionController.text.trim().isNotEmpty,
                hasExplanation: _explanationController.text.trim().isNotEmpty,
                filledOptionCount: filledOptions,
                attachmentCount:
                    _newAttachments.length +
                    (widget.initialQuestion?.attachments.length ?? 0),
                marks: _defaultMarksController.text.trim(),
                negativeMarks: _negativeMarksController.text.trim(),
                isDraft: _saveAsDraft,
              ),
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: 8, child: formBody),
            const SizedBox(width: AppSpacing.lg),
            SizedBox(
              width: 320,
              child: _QuestionEditorSidebar(
                subjectName: subjectName,
                topicName: topicName,
                questionType: _questionType,
                difficulty: _difficulty,
                hasQuestionPrompt: _questionController.text.trim().isNotEmpty,
                hasExplanation: _explanationController.text.trim().isNotEmpty,
                filledOptionCount: filledOptions,
                attachmentCount:
                    _newAttachments.length +
                    (widget.initialQuestion?.attachments.length ?? 0),
                marks: _defaultMarksController.text.trim(),
                negativeMarks: _negativeMarksController.text.trim(),
                isDraft: _saveAsDraft,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildEditorFormBody(
    List<AcademicLookupOption> filteredTopics,
    bool isCompact,
  ) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCard(
            backgroundColor: AppColors.surfaceMuted,
            child: Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                AppBadge(
                  label: _isEditing
                      ? 'Editing existing question'
                      : 'New bank question',
                  backgroundColor: AppColors.accent.withValues(alpha: 0.12),
                  foregroundColor: AppColors.accent,
                ),
                AppBadge(
                  label:
                      'Type: ${switch (_questionType) {
                        'mcq_multiple' => 'MCQ multiple',
                        'true_false' => 'True / False',
                        _ => 'MCQ single',
                      }}',
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.secondary,
                ),
                AppBadge(
                  label:
                      'Difficulty: ${_difficulty[0].toUpperCase()}${_difficulty.substring(1)}',
                  backgroundColor: AppColors.surface,
                  foregroundColor: AppColors.secondary,
                ),
                AppBadge(
                  label: _saveAsDraft ? 'Draft mode' : 'Ready for use',
                  backgroundColor:
                      (_saveAsDraft ? AppColors.amber : AppColors.teal)
                          .withValues(alpha: 0.12),
                  foregroundColor: _saveAsDraft
                      ? AppColors.amber
                      : AppColors.teal,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _QuestionAuthoringPanel(
            title: 'Marks, difficulty, and structure',
            subtitle:
                'Set the academic context, type, and scoring rules before you start editing the question content.',
            child: Column(
              children: [
                if (isCompact) ...[
                  DropdownButtonFormField<String>(
                    initialValue: _subjectId,
                    decoration: const InputDecoration(labelText: 'Subject'),
                    items: widget.subjects
                        .map(
                          (subject) => DropdownMenuItem<String>(
                            value: subject.id,
                            child: Text(subject.name),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _subjectId = value;
                        _topicId = null;
                      });
                    },
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String?>(
                    initialValue: _topicId,
                    decoration: const InputDecoration(labelText: 'Topic'),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('No topic'),
                      ),
                      ...filteredTopics.map(
                        (topic) => DropdownMenuItem<String?>(
                          value: topic.id,
                          child: Text(topic.name),
                        ),
                      ),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _topicId = value;
                      });
                    },
                  ),
                  const SizedBox(height: 14),
                ] else
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _subjectId,
                          decoration: const InputDecoration(
                            labelText: 'Subject',
                          ),
                          items: widget.subjects
                              .map(
                                (subject) => DropdownMenuItem<String>(
                                  value: subject.id,
                                  child: Text(subject.name),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            setState(() {
                              _subjectId = value;
                              _topicId = null;
                            });
                          },
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: DropdownButtonFormField<String?>(
                          initialValue: _topicId,
                          decoration: const InputDecoration(labelText: 'Topic'),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('No topic'),
                            ),
                            ...filteredTopics.map(
                              (topic) => DropdownMenuItem<String?>(
                                value: topic.id,
                                child: Text(topic.name),
                              ),
                            ),
                          ],
                          onChanged: (value) {
                            setState(() {
                              _topicId = value;
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                if (isCompact) ...[
                  DropdownButtonFormField<String>(
                    initialValue: _questionType,
                    decoration: const InputDecoration(
                      labelText: 'Question type',
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'mcq_single',
                        child: Text('MCQ single'),
                      ),
                      DropdownMenuItem(
                        value: 'mcq_multiple',
                        child: Text('MCQ multiple'),
                      ),
                      DropdownMenuItem(
                        value: 'true_false',
                        child: Text('True / False'),
                      ),
                    ],
                    onChanged: _setQuestionType,
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _difficulty,
                    decoration: const InputDecoration(labelText: 'Difficulty'),
                    items: const [
                      DropdownMenuItem(
                        value: 'foundation',
                        child: Text('Foundation'),
                      ),
                      DropdownMenuItem(
                        value: 'intermediate',
                        child: Text('Intermediate'),
                      ),
                      DropdownMenuItem(
                        value: 'advanced',
                        child: Text('Advanced'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _difficulty = value);
                    },
                  ),
                ] else ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _questionType,
                          decoration: const InputDecoration(
                            labelText: 'Question type',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'mcq_single',
                              child: Text('MCQ single'),
                            ),
                            DropdownMenuItem(
                              value: 'mcq_multiple',
                              child: Text('MCQ multiple'),
                            ),
                            DropdownMenuItem(
                              value: 'true_false',
                              child: Text('True / False'),
                            ),
                          ],
                          onChanged: _setQuestionType,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _difficulty,
                          decoration: const InputDecoration(
                            labelText: 'Difficulty',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'foundation',
                              child: Text('Foundation'),
                            ),
                            DropdownMenuItem(
                              value: 'intermediate',
                              child: Text('Intermediate'),
                            ),
                            DropdownMenuItem(
                              value: 'advanced',
                              child: Text('Advanced'),
                            ),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _difficulty = value);
                          },
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _contentFormat,
                  decoration: const InputDecoration(
                    labelText: 'Content format',
                    helperText:
                        'Use Markdown + LaTeX for formulas like \\(2x + 5 = 15\\), \\(H_2O\\), or \\(\\pi r^2\\).',
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'markdown_latex',
                      child: Text('Markdown + LaTeX'),
                    ),
                    DropdownMenuItem(
                      value: 'plain_text',
                      child: Text('Plain text'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => _contentFormat = value);
                  },
                ),
                const SizedBox(height: 14),
                AppCard(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Text(
                    'Tags are managed after save from the question actions menu, so the question can be classified first and tagged deliberately.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _QuestionAuthoringPanel(
            title: 'Question content',
            subtitle:
                'Write the full prompt clearly and keep the explanation ready for student review.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _questionController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Question text',
                    helperText:
                        'Examples: Solve \\(2x + 5 = 15\\) or Find the area of the shaded region shown in the diagram.',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Question text is required.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _explanationController,
                  maxLines: 5,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: 'Explanation',
                    helperText:
                        'Explain why the correct answer is right and why common mistakes are wrong.',
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Explanation and feedback',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSpacing.xs),
                if (_explanationController.text.trim().isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Explanation preview',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        AppRichTextRenderer(
                          content: _explanationController.text.trim(),
                          contentFormat: _contentFormat,
                          compact: true,
                        ),
                      ],
                    ),
                  )
                else
                  Text(
                    'Recommended: add an explanation so students can learn from this question during review.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                const SizedBox(height: 14),
                AppCard(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Rich content help',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      const Text(r'Inline formula: \(2x + 5 = 15\)'),
                      const Text(r'Chemistry: \(H_2O\)'),
                      const Text(r'Area formula: \(\pi r^2\)'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _QuestionAuthoringPanel(
            title: 'Attachments and media',
            subtitle:
                'Attach diagrams or supporting media and keep accessibility text ready where available.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isCompact) ...[
                  TextFormField(
                    controller: _attachmentTitleController,
                    decoration: const InputDecoration(
                      labelText: 'Attachment title',
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _attachmentType,
                    decoration: const InputDecoration(
                      labelText: 'Attachment type',
                    ),
                    items: const [
                      DropdownMenuItem(value: 'image', child: Text('Image')),
                      DropdownMenuItem(
                        value: 'diagram',
                        child: Text('Diagram'),
                      ),
                      DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _attachmentType = value);
                    },
                  ),
                ] else
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _attachmentTitleController,
                          decoration: const InputDecoration(
                            labelText: 'Attachment title',
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _attachmentType,
                          decoration: const InputDecoration(
                            labelText: 'Attachment type',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'image',
                              child: Text('Image'),
                            ),
                            DropdownMenuItem(
                              value: 'diagram',
                              child: Text('Diagram'),
                            ),
                            DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                            DropdownMenuItem(
                              value: 'other',
                              child: Text('Other'),
                            ),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setState(() => _attachmentType = value);
                          },
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _attachmentAltTextController,
                  decoration: const InputDecoration(
                    labelText: 'Alt text',
                    helperText:
                        'Describe the diagram or image for accessibility.',
                  ),
                ),
                const SizedBox(height: 14),
                AppButton(
                  label: 'Upload image or diagram',
                  onPressed: _pickAttachment,
                  variant: AppButtonVariant.secondary,
                  icon: Icons.attach_file_rounded,
                ),
                if (widget.initialQuestion?.attachments.isNotEmpty ??
                    false) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Existing attachments',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ...widget.initialQuestion!.attachments.map(
                    (attachment) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: AppRichTextRenderer(
                        content: '',
                        attachments: [attachment],
                        compact: true,
                      ),
                    ),
                  ),
                ],
                if (_newAttachments.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Attachments to upload',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ..._newAttachments.asMap().entries.map(
                    (entry) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.image_outlined),
                      title: Text(
                        entry.value.title.isEmpty
                            ? entry.value.file.name
                            : entry.value.title,
                      ),
                      subtitle: Text(
                        '${entry.value.attachmentType} • ${entry.value.altText.isEmpty ? 'No alt text' : entry.value.altText}',
                      ),
                      trailing: IconButton(
                        onPressed: () =>
                            setState(() => _newAttachments.removeAt(entry.key)),
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                SwitchListTile(
                  value: _saveAsDraft,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Save as draft'),
                  subtitle: const Text(
                    'Draft questions stay visible in the bank but clearly marked for teacher cleanup before regular use.',
                  ),
                  onChanged: (value) {
                    setState(() => _saveAsDraft = value);
                  },
                ),
                const SizedBox(height: 14),
                if (isCompact) ...[
                  TextFormField(
                    controller: _defaultMarksController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Default marks',
                    ),
                    validator: (value) {
                      if (value == null || double.tryParse(value) == null) {
                        return 'Enter a valid number.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _negativeMarksController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Negative marks',
                    ),
                    validator: (value) {
                      if (value == null || double.tryParse(value) == null) {
                        return 'Enter a valid number.';
                      }
                      return null;
                    },
                  ),
                ] else
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _defaultMarksController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Default marks',
                          ),
                          validator: (value) {
                            if (value == null ||
                                double.tryParse(value) == null) {
                              return 'Enter a valid number.';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: TextFormField(
                          controller: _negativeMarksController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: const InputDecoration(
                            labelText: 'Negative marks',
                          ),
                          validator: (value) {
                            if (value == null ||
                                double.tryParse(value) == null) {
                              return 'Enter a valid number.';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _QuestionAuthoringPanel(
            title: 'Options and answers',
            subtitle:
                'Set answer choices carefully and make the correct option obvious to the teacher authoring the item.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Options',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    if (_questionType != 'true_false')
                      OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            _options.add(
                              _EditableOption(
                                textController: TextEditingController(),
                              ),
                            );
                          });
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Add option'),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                AppCard(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Text(
                    _questionType == 'mcq_multiple'
                        ? 'Multiple correct answers are allowed for this question.'
                        : _questionType == 'true_false'
                        ? 'True / False questions keep exactly two fixed options.'
                        : 'Select one correct option for this question.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
          ...List.generate(_options.length, (index) {
            final option = _options[index];
            final canDelete =
                _questionType != 'true_false' && _options.length > 2;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AppCard(
                padding: const EdgeInsets.all(AppSpacing.md),
                backgroundColor: option.isCorrect
                    ? AppColors.teal.withValues(alpha: 0.08)
                    : AppColors.surfaceMuted,
                borderColor: option.isCorrect
                    ? AppColors.teal
                    : AppColors.border,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: option.textController,
                        readOnly: _questionType == 'true_false',
                        decoration: InputDecoration(
                          labelText: 'Option ${index + 1}',
                          helperText: _contentFormat == 'markdown_latex'
                              ? r'Supports LaTeX like \(x = 5\)'
                              : null,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Option text is required.';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      children: [
                        Checkbox(
                          value: option.isCorrect,
                          onChanged: (value) {
                            setState(() {
                              if (_questionType == 'mcq_single' ||
                                  _questionType == 'true_false') {
                                for (final item in _options) {
                                  item.isCorrect = false;
                                }
                              }
                              option.isCorrect = value ?? false;
                            });
                          },
                        ),
                        Text(
                          'Correct',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                        if (canDelete)
                          IconButton(
                            onPressed: () {
                              setState(() {
                                final removed = _options.removeAt(index);
                                removed.textController.dispose();
                              });
                            },
                            icon: const Icon(Icons.delete_outline),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _EditableOption {
  _EditableOption({
    required this.textController,
    this.id,
    this.isCorrect = false,
  });

  final String? id;
  final TextEditingController textController;
  bool isCorrect;

  Map<String, dynamic> toJson(String contentFormat) {
    return {
      if (id != null && id!.isNotEmpty) 'id': id,
      'content_format': contentFormat,
      'option_text': textController.text.trim(),
      'is_correct': isCorrect,
      'is_active': true,
    };
  }
}

class _QuestionEditorSidebar extends StatelessWidget {
  const _QuestionEditorSidebar({
    required this.subjectName,
    required this.topicName,
    required this.questionType,
    required this.difficulty,
    required this.hasQuestionPrompt,
    required this.hasExplanation,
    required this.filledOptionCount,
    required this.attachmentCount,
    required this.marks,
    required this.negativeMarks,
    required this.isDraft,
  });

  final String? subjectName;
  final String? topicName;
  final String questionType;
  final String difficulty;
  final bool hasQuestionPrompt;
  final bool hasExplanation;
  final int filledOptionCount;
  final int attachmentCount;
  final String marks;
  final String negativeMarks;
  final bool isDraft;

  String get _questionTypeLabel => switch (questionType) {
    'mcq_multiple' => 'MCQ multiple',
    'true_false' => 'True / False',
    _ => 'MCQ single',
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppCard(
          gradient: LinearGradient(
            colors: [
              AppColors.surface,
              AppColors.subtleAccent.withValues(alpha: 0.42),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Question snapshot',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.md),
              _SidebarDataRow(
                label: 'Subject',
                value: subjectName ?? 'Choose subject',
              ),
              _SidebarDataRow(
                label: 'Topic',
                value: topicName ?? 'No topic selected',
              ),
              _SidebarDataRow(label: 'Type', value: _questionTypeLabel),
              _SidebarDataRow(
                label: 'Difficulty',
                value:
                    '${difficulty[0].toUpperCase()}${difficulty.substring(1)}',
              ),
              _SidebarDataRow(
                label: 'Status',
                value: isDraft ? 'Draft mode' : 'Ready for use',
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Build checklist',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.md),
              _SidebarCheckItem(
                label: 'Question prompt drafted',
                ok: hasQuestionPrompt,
              ),
              _SidebarCheckItem(
                label: 'At least two answer options',
                ok: filledOptionCount >= 2,
              ),
              _SidebarCheckItem(
                label: 'Scoring reviewed',
                ok: marks.isNotEmpty,
              ),
              _SidebarCheckItem(
                label: 'Explanation or attachments added',
                ok: hasExplanation || attachmentCount > 0,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppCard(
          backgroundColor: AppColors.surfaceMuted,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Scoring overview',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  _MiniStatChip(
                    label: 'Marks',
                    value: marks.isEmpty ? '0' : marks,
                  ),
                  _MiniStatChip(
                    label: 'Negative',
                    value: negativeMarks.isEmpty ? '0' : negativeMarks,
                  ),
                  _MiniStatChip(
                    label: 'Options',
                    value: '$filledOptionCount ready',
                  ),
                  _MiniStatChip(
                    label: 'Attachments',
                    value: '$attachmentCount',
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SidebarDataRow extends StatelessWidget {
  const _SidebarDataRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _SidebarCheckItem extends StatelessWidget {
  const _SidebarCheckItem({required this.label, required this.ok});

  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            ok
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            size: 18,
            color: ok ? AppColors.success : AppColors.textMuted,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(label)),
        ],
      ),
    );
  }
}

class _MiniStatChip extends StatelessWidget {
  const _MiniStatChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.72)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _QuestionAuthoringPanel extends StatelessWidget {
  const _QuestionAuthoringPanel({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            subtitle,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          child,
        ],
      ),
    );
  }
}

class _PendingAttachment {
  const _PendingAttachment({
    required this.file,
    required this.title,
    required this.altText,
    required this.attachmentType,
  });

  final PlatformFile file;
  final String title;
  final String altText;
  final String attachmentType;
}
