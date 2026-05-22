import 'dart:async';

import 'package:education_frontend/app/router/app_routes.dart';
import 'package:education_frontend/core/network/api_error_message.dart';
import 'package:education_frontend/core/storage/ui_preferences_store.dart';
import 'package:education_frontend/core/utils/web_download.dart';
import 'package:education_frontend/features/academics/domain/models/academic_lookup_option.dart';
import 'package:education_frontend/features/academics/presentation/providers/academic_lookup_providers.dart';
import 'package:education_frontend/features/auth/presentation/providers/auth_controller.dart';
import 'package:education_frontend/features/dashboard/presentation/providers/dashboard_providers.dart';
import 'package:education_frontend/features/dashboard/domain/models/teacher_question_performance_item.dart';
import 'package:education_frontend/features/dashboard/presentation/widgets/dashboard_shell.dart';
import 'package:education_frontend/features/question_bank/data/repositories/question_bank_repository.dart';
import 'package:education_frontend/features/question_bank/domain/models/teacher_question_model.dart';
import 'package:education_frontend/features/question_bank/presentation/helpers/question_bank_refresh.dart';
import 'package:education_frontend/features/question_bank/presentation/providers/question_bank_providers.dart';
import 'package:education_frontend/shared/domain/models/rich_attachment_model.dart';
import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/widgets/app_badge.dart';
import 'package:education_frontend/shared/widgets/app_button.dart';
import 'package:education_frontend/shared/widgets/app_card.dart';
import 'package:education_frontend/shared/widgets/app_dialog_shell.dart';
import 'package:education_frontend/shared/widgets/app_empty_state.dart';
import 'package:education_frontend/shared/widgets/app_error_state.dart';
import 'package:education_frontend/shared/widgets/app_loader.dart';
import 'package:education_frontend/shared/widgets/app_rich_text_renderer.dart';
import 'package:education_frontend/shared/widgets/app_text_field.dart';
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
    final next = [topicId, ..._recentTopicIds.where((item) => item != topicId)]
        .take(5)
        .toList();
    setState(() {
      _recentTopicIds = next;
    });
    await ref.read(uiPreferencesStoreProvider).writeStringList(
      _recentTopicPrefsKey,
      next,
    );
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
      builder: (context) => _QuestionImportDialog(instituteId: user.instituteId!),
    );
    invalidateQuestionBankViews(ref);
  }

  Future<void> _performBulkAction(Map<String, dynamic> payload) async {
    try {
      await ref.read(questionBankRepositoryProvider).performBulkAction(payload);
      ref.read(selectedQuestionIdsProvider.notifier).clear();
      invalidateQuestionBankViews(ref);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bulk action completed.')),
        );
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
        onRemoveTag: (mapId) => ref
            .read(questionBankRepositoryProvider)
            .deleteTagMap(mapId),
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
        await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (context) => _QuestionEditorDialog(
            currentInstituteId: user.instituteId ?? '',
            currentTeacherId: user.teacherProfileId,
            subjects: subjects,
            topics: topics,
            initialQuestion: question,
            seedQuestion: seedQuestion,
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

    final filters = ref.watch(questionFilterProvider);
    final questionPageValue = ref.watch(questionPageProvider);
    final questionPerformanceValue = ref.watch(teacherQuestionPerformanceProvider);
    final selectedQuestionIds = ref.watch(selectedQuestionIdsProvider);
    final isCompact = ref.watch(compactQuestionViewProvider);
    final subjectsValue = ref.watch(subjectOptionsProvider);
    final topicsValue = ref.watch(allTopicOptionsProvider);

    return DashboardShell(
      title: 'Question Bank',
      user: user,
      currentRoute: AppRoutes.questionBank,
      onLogout: () => ref.read(authControllerProvider.notifier).logout(),
      body: ListView(
        children: [
          AppCard(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Teacher question bank',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      AppButton(
                        label: 'New question',
                        onPressed: () => _openQuestionDialog(),
                        icon: Icons.add,
                      ),
                      const SizedBox(width: 12),
                      AppButton(
                        label: 'Import CSV',
                        onPressed: _openImportDialog,
                        variant: AppButtonVariant.secondary,
                        icon: Icons.upload_file_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Filter, search, create, and edit single-answer MCQ or true/false questions without bypassing backend validations.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      SizedBox(
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
                      _LookupDropdown(
                        label: 'Subject',
                        value: filters.subjectId,
                        items: subjectsValue.maybeWhen(
                          data: (items) => items,
                          orElse: () => const <AcademicLookupOption>[],
                        ),
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
                        items: topicsValue
                            .maybeWhen(
                              data: (items) => items,
                              orElse: () => const <AcademicLookupOption>[],
                            )
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
                        label: 'Question type',
                        value: filters.questionType,
                        items: const {
                          'mcq_single': 'MCQ single',
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
                      OutlinedButton(
                        onPressed: () {
                          _searchController.clear();
                          _updateFilters(const TeacherQuestionFilterState());
                          ref.read(selectedQuestionIdsProvider.notifier).clear();
                          setState(() => _showFavoritesOnly = false);
                        },
                        child: const Text('Clear filters'),
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
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
          if (selectedQuestionIds.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: AppCard(
                child: Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      '${selectedQuestionIds.length} selected',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    AppButton(
                      label: 'Activate',
                      onPressed: () => _performBulkAction({
                        'action': 'activate',
                        'question_ids': selectedQuestionIds.toList(),
                      }),
                      variant: AppButtonVariant.secondary,
                    ),
                    AppButton(
                      label: 'Deactivate',
                      onPressed: () => _performBulkAction({
                        'action': 'deactivate',
                        'question_ids': selectedQuestionIds.toList(),
                      }),
                      variant: AppButtonVariant.secondary,
                    ),
                    AppButton(
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
                            'question_ids': selectedQuestionIds.toList(),
                          });
                        }
                      },
                      variant: AppButtonVariant.secondary,
                    ),
                    AppButton(
                      label: 'Change topic',
                      onPressed: () async {
                        final topicId = await _openLookupChoiceDialog(
                          context: context,
                          title: 'Move to topic',
                          options: topicsValue.maybeWhen(
                            data: (items) => items,
                            orElse: () => const <AcademicLookupOption>[],
                          ),
                        );
                        if (topicId != null) {
                          await _performBulkAction({
                            'action': 'set_topic',
                            'topic': topicId,
                            'question_ids': selectedQuestionIds.toList(),
                          });
                        }
                      },
                      variant: AppButtonVariant.secondary,
                    ),
                    AppButton(
                      label: 'Assign tag',
                      onPressed: () async {
                        if (!context.mounted) return;
                        final tags = await ref
                            .read(questionBankRepositoryProvider)
                            .fetchTags();
                        if (!context.mounted) return;
                        final tagId = await showDialog<String>(
                          context: context,
                          builder: (context) => _StringSelectionDialog(
                            title: 'Assign tag',
                            options: {for (final tag in tags) tag.id: tag.name},
                          ),
                        );
                        if (tagId != null) {
                          await _performBulkAction({
                            'action': 'assign_tag',
                            'tag': tagId,
                            'question_ids': selectedQuestionIds.toList(),
                          });
                        }
                      },
                      variant: AppButtonVariant.secondary,
                    ),
                    AppButton(
                      label: 'Delete',
                      onPressed: () => _performBulkAction({
                        'action': 'delete',
                        'question_ids': selectedQuestionIds.toList(),
                      }),
                      variant: AppButtonVariant.ghost,
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
                                (item) => _favoriteQuestionIds.contains(item.id),
                              )
                              .toList()
                        : page.items;
                    return Column(
                      children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${visibleItems.length}${_showFavoritesOnly ? ' favorite' : ''} questions',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Checkbox(
                      value: visibleItems.isNotEmpty &&
                          visibleItems.every(
                            (item) => selectedQuestionIds.contains(item.id),
                          ),
                      onChanged: (value) {
                        if (value ?? false) {
                          ref
                              .read(selectedQuestionIdsProvider.notifier)
                              .replaceAll(visibleItems.map((item) => item.id));
                        } else {
                          ref.read(selectedQuestionIdsProvider.notifier).clear();
                        }
                      },
                    ),
                    const Text('Select page'),
                  ],
                ),
                const SizedBox(height: 12),
                if (visibleItems.isEmpty)
                  const AppEmptyState(
                    title: 'No questions match these filters',
                    message:
                        'Try a broader search, adjust the filters, or create the first question for this area.',
                  )
                else
                  ...visibleItems.map((question) {
                    final performance = questionPerformanceValue.maybeWhen(
                      data: (items) {
                        for (final item in items) {
                          if (item.questionId == question.id) {
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
                        selected: selectedQuestionIds.contains(question.id),
                        isFavorite: _favoriteQuestionIds.contains(question.id),
                        onToggleSelect: () => ref
                            .read(selectedQuestionIdsProvider.notifier)
                            .toggle(question.id),
                        onEdit: () => _openQuestionDialog(question: question),
                        onDuplicate: () =>
                            _openQuestionDialog(seedQuestion: question),
                        onPreview: () => _previewQuestion(question),
                        onToggleFavorite: () => _toggleFavorite(question.id),
                        onEditTags: () => _openTagEditor(question),
                      ),
                    );
                  }),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    AppButton(
                      label: 'Previous',
                      onPressed: page.previous == null
                          ? null
                          : () {
                              _updateFilters(
                                filters.copyWith(page: filters.page - 1),
                              );
                            },
                      variant: AppButtonVariant.secondary,
                    ),
                    Text('Page ${filters.page}'),
                    AppButton(
                      label: 'Next',
                      onPressed: page.next == null
                          ? null
                          : () {
                              _updateFilters(
                                filters.copyWith(page: filters.page + 1),
                              );
                            },
                      variant: AppButtonVariant.secondary,
                    ),
                  ],
                ),
                      ],
                    );
                  },
                ),
              ],
            ),
            loading: () => const AppLoader(label: 'Loading question bank'),
            error: (error, _) =>
                AppErrorState(message: readApiErrorMessage(error)),
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
    builder: (context) => _StringSelectionDialog(title: title, options: options),
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
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
                      AppRichTextRenderer(
                        content: question.questionText,
                        contentFormat: question.contentFormat,
                        attachments: const <RichAttachmentModel>[],
                        compact: true,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Wrap(
                        spacing: AppSpacing.xs,
                        runSpacing: AppSpacing.xs,
                        children: [
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
                          AppBadge(
                            label: question.isVerified
                                ? 'Verified'
                                : 'Unverified',
                            backgroundColor: question.isVerified
                                ? AppColors.success.withValues(alpha: 0.12)
                                : AppColors.warning.withValues(alpha: 0.12),
                            foregroundColor: question.isVerified
                                ? AppColors.success
                                : AppColors.warning,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Wrap(
                  spacing: 4,
                  children: [
                    IconButton(
                      onPressed: onPreview,
                      icon: const Icon(Icons.visibility_outlined),
                      tooltip: 'Preview question',
                    ),
                    IconButton(
                      onPressed: onDuplicate,
                      icon: const Icon(Icons.content_copy_outlined),
                      tooltip: 'Duplicate question',
                    ),
                    IconButton(
                      onPressed: onEditTags,
                      icon: const Icon(Icons.sell_outlined),
                      tooltip: 'Edit tags',
                    ),
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
                    IconButton(
                      onPressed: onEdit,
                      icon: const Icon(Icons.edit_outlined),
                      tooltip: 'Edit question',
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _MetaChip(label: question.questionType),
                _MetaChip(label: question.difficultyLevel),
                if (question.isDraft) _MetaChip(label: 'Draft'),
                _MetaChip(label: 'Marks ${question.defaultMarks}'),
                _MetaChip(label: 'Negative ${question.negativeMarks}'),
                if (performance != null) ...[
                  _MetaChip(label: 'Used ${performance!.usageCount}x'),
                  _MetaChip(label: 'Wrong ${performance!.wrongAttemptPercentage}%'),
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
                    .map((tag) => AppBadge(label: tag.name))
                    .toList(),
              ),
            ],
            if (performance != null &&
                (double.tryParse(performance!.wrongAttemptPercentage) ?? 0) >= 50) ...[
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
                    label: '${question.attachments.length} attachment${question.attachments.length == 1 ? '' : 's'}',
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
                      color: option.isCorrect ? AppColors.success : AppColors.textSecondary,
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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
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
  State<_QuestionTagEditorDialog> createState() => _QuestionTagEditorDialogState();
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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
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
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
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
  const _StringSelectionDialog({
    required this.title,
    required this.options,
  });

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
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Text(label),
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
      child: DropdownButtonFormField<String?>(
        initialValue: value,
        decoration: InputDecoration(labelText: label),
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
      child: DropdownButtonFormField<String?>(
        initialValue: value,
        decoration: InputDecoration(labelText: label),
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
  ConsumerState<_QuestionImportDialog> createState() => _QuestionImportDialogState();
}

class _QuestionImportDialogState extends ConsumerState<_QuestionImportDialog> {
  QuestionImportPreview? _preview;
  bool _isLoading = false;
  String? _error;
  String? _selectedFileName;

  Future<void> _downloadTemplate() async {
    try {
      final messenger = ScaffoldMessenger.of(context);
      final template = await ref.read(questionBankRepositoryProvider).fetchImportTemplate();
      final csvContent = template['csv_content']?.toString() ?? '';
      await downloadTextFile(
        filename: 'nexora_question_import_template.csv',
        content: csvContent,
        mimeType: 'text/csv',
      );
      if (!mounted) return;
      await Clipboard.setData(ClipboardData(text: csvContent));
      messenger.showSnackBar(
        const SnackBar(content: Text('Template downloaded for web and copied to clipboard.')),
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
      final preview = await ref.read(questionBankRepositoryProvider).previewImport(
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
      final result = await ref.read(questionBankRepositoryProvider).finalizeImport(
            instituteId: widget.instituteId,
            preview: _preview!,
          );
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
      primaryActionLabel: _preview == null ? 'Preview import' : 'Import valid rows',
      onPrimaryAction: _preview == null ? _pickAndPreview : _finalizeImport,
      secondaryActionLabel: 'Download template',
      onSecondaryAction: _downloadTemplate,
      isSaving: _isLoading,
      maxWidth: 920,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_selectedFileName != null) Text('Selected file: $_selectedFileName'),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.error,
                fontWeight: FontWeight.w600,
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
                      row.questionText.isEmpty ? 'Row ${row.rowNumber}' : row.questionText,
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
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
                        color: row.isValid ? AppColors.success : AppColors.error,
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
    this.initialQuestion,
    this.seedQuestion,
  });

  final String currentInstituteId;
  final String? currentTeacherId;
  final List<AcademicLookupOption> subjects;
  final List<AcademicLookupOption> topics;
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
        savedQuestion = await ref.read(questionBankRepositoryProvider).createQuestion(payload);
      }

      if (_newAttachments.isNotEmpty) {
        for (var i = 0; i < _newAttachments.length; i++) {
          final attachment = _newAttachments[i];
          final bytes = attachment.file.bytes;
          if (bytes == null) {
            continue;
          }
          await ref.read(questionBankRepositoryProvider).createAttachment(
            questionId: savedQuestion.id,
            file: MultipartFile.fromBytes(bytes, filename: attachment.file.name),
            attachmentType: attachment.attachmentType,
            title: attachment.title.isEmpty ? attachment.file.name : attachment.title,
            displayOrder: savedQuestion.attachments.length + i + 1,
            altText: attachment.altText,
            isInline: attachment.attachmentType == 'image' || attachment.attachmentType == 'diagram',
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

    return AppDialogShell(
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
      child: Form(
        key: _formKey,
        child: Column(
          children: [
                        DropdownButtonFormField<String>(
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
                                  if (value == null) {
                                    return;
                                  }
                                  setState(() {
                                    _difficulty = value;
                                  });
                                },
                              ),
                            ),
                          ],
                        ),
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
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AppColors.textSecondary),
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
                        const SizedBox(height: 14),
                        AppCard(
                          backgroundColor: AppColors.surfaceMuted,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Attachments and diagrams',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
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
                                        DropdownMenuItem(value: 'image', child: Text('Image')),
                                        DropdownMenuItem(value: 'diagram', child: Text('Diagram')),
                                        DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                                        DropdownMenuItem(value: 'other', child: Text('Other')),
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
                                  helperText: 'Describe the diagram or image for accessibility.',
                                ),
                              ),
                              const SizedBox(height: 14),
                              AppButton(
                                label: 'Upload image or diagram',
                                onPressed: _pickAttachment,
                                variant: AppButtonVariant.secondary,
                                icon: Icons.attach_file_rounded,
                              ),
                              if (widget.initialQuestion?.attachments.isNotEmpty ?? false) ...[
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
                                    title: Text(entry.value.title.isEmpty ? entry.value.file.name : entry.value.title),
                                    subtitle: Text(
                                      '${entry.value.attachmentType} • ${entry.value.altText.isEmpty ? 'No alt text' : entry.value.altText}',
                                    ),
                                    trailing: IconButton(
                                      onPressed: () => setState(() => _newAttachments.removeAt(entry.key)),
                                      icon: const Icon(Icons.delete_outline),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
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
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _defaultMarksController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
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
                                keyboardType:
                                    const TextInputType.numberWithOptions(
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
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Text(
                              'Options',
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const Spacer(),
                            if (_questionType == 'mcq_single')
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
                        ...List.generate(_options.length, (index) {
                          final option = _options[index];
                          final canDelete =
                              _questionType == 'mcq_single' &&
                              _options.length > 2;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
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
                                      if (value == null ||
                                          value.trim().isEmpty) {
                                        return 'Option text is required.';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Checkbox(
                                  value: option.isCorrect,
                                  onChanged: (value) {
                                    setState(() {
                                      for (final item in _options) {
                                        item.isCorrect = false;
                                      }
                                      option.isCorrect = value ?? false;
                                    });
                                  },
                                ),
                                const Text('Correct'),
                                if (canDelete)
                                  IconButton(
                                    onPressed: () {
                                      setState(() {
                                        final removed = _options.removeAt(
                                          index,
                                        );
                                        removed.textController.dispose();
                                      });
                                    },
                                    icon: const Icon(Icons.delete_outline),
                                  ),
                              ],
                            ),
                          );
                        }),
          ],
        ),
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
