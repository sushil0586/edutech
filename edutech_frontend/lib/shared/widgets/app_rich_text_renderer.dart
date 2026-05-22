import 'package:education_frontend/shared/theme/app_colors.dart';
import 'package:education_frontend/shared/theme/app_spacing.dart';
import 'package:education_frontend/shared/domain/models/rich_attachment_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:url_launcher/url_launcher_string.dart';

class AppRichTextRenderer extends StatelessWidget {
  const AppRichTextRenderer({
    required this.content,
    super.key,
    this.contentFormat = 'markdown_latex',
    this.attachments = const <RichAttachmentModel>[],
    this.compact = false,
  });

  final String content;
  final String contentFormat;
  final List<RichAttachmentModel> attachments;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final blocks = _parseContentBlocks(content);
    final visibleAttachments = attachments.where((item) => item.isActive).toList()
      ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (blocks.isEmpty)
          Text(
            content.trim(),
            style: compact
                ? Theme.of(context).textTheme.bodyMedium
                : Theme.of(context).textTheme.bodyLarge,
          )
        else
          ...blocks.map((block) => Padding(
                padding: EdgeInsets.only(
                  bottom: compact ? AppSpacing.xs : AppSpacing.sm,
                ),
                child: switch (block.kind) {
                  _RichBlockKind.blockMath => _MathBlock(
                      expression: block.text,
                      compact: compact,
                    ),
                  _RichBlockKind.markdown => _MarkdownWithInlineMath(
                      content: block.text,
                      compact: compact,
                    ),
                },
              )),
        if (visibleAttachments.isNotEmpty) ...[
          SizedBox(height: compact ? AppSpacing.sm : AppSpacing.md),
          ...visibleAttachments.map(
            (attachment) => Padding(
              padding: EdgeInsets.only(
                bottom: compact ? AppSpacing.sm : AppSpacing.md,
              ),
              child: _AttachmentCard(attachment: attachment, compact: compact),
            ),
          ),
        ],
      ],
    );
  }
}

enum _RichBlockKind { markdown, blockMath }

class _RichBlock {
  const _RichBlock(this.kind, this.text);

  final _RichBlockKind kind;
  final String text;
}

List<_RichBlock> _parseContentBlocks(String content) {
  final trimmed = content.trim();
  if (trimmed.isEmpty) {
    return const [];
  }

  final lines = trimmed.split('\n');
  final blocks = <_RichBlock>[];
  final buffer = StringBuffer();
  var inMathBlock = false;
  final mathBuffer = StringBuffer();

  for (final line in lines) {
    final stripped = line.trim();
    if (stripped.startsWith(r'$$') && stripped.endsWith(r'$$') && stripped.length > 4) {
      if (buffer.isNotEmpty) {
        blocks.add(_RichBlock(_RichBlockKind.markdown, buffer.toString().trimRight()));
        buffer.clear();
      }
      blocks.add(_RichBlock(_RichBlockKind.blockMath, stripped.substring(2, stripped.length - 2).trim()));
      continue;
    }

    if (stripped.startsWith(r'$$')) {
      if (buffer.isNotEmpty) {
        blocks.add(_RichBlock(_RichBlockKind.markdown, buffer.toString().trimRight()));
        buffer.clear();
      }
      inMathBlock = true;
      mathBuffer.clear();
      final startValue = stripped.substring(2).trim();
      if (startValue.isNotEmpty) {
        mathBuffer.writeln(startValue);
      }
      continue;
    }

    if (inMathBlock) {
      if (stripped.endsWith(r'$$')) {
        final endValue = stripped.substring(0, stripped.length - 2).trim();
        if (endValue.isNotEmpty) {
          mathBuffer.writeln(endValue);
        }
        blocks.add(_RichBlock(_RichBlockKind.blockMath, mathBuffer.toString().trim()));
        mathBuffer.clear();
        inMathBlock = false;
      } else {
        mathBuffer.writeln(line);
      }
      continue;
    }

    buffer.writeln(line);
  }

  if (buffer.isNotEmpty) {
    blocks.add(_RichBlock(_RichBlockKind.markdown, buffer.toString().trimRight()));
  }

  return blocks;
}

class _MathBlock extends StatelessWidget {
  const _MathBlock({required this.expression, required this.compact});

  final String expression;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.md : AppSpacing.lg,
        vertical: compact ? AppSpacing.sm : AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Math.tex(
        expression,
        textStyle: (compact
                ? Theme.of(context).textTheme.bodyLarge
                : Theme.of(context).textTheme.titleMedium)
            ?.copyWith(color: AppColors.textPrimary),
      ),
    );
  }
}

class _MarkdownWithInlineMath extends StatelessWidget {
  const _MarkdownWithInlineMath({
    required this.content,
    required this.compact,
  });

  final String content;
  final bool compact;

  static final RegExp _inlineMathPattern = RegExp(r'\\\((.+?)\\\)');

  @override
  Widget build(BuildContext context) {
    if (!_inlineMathPattern.hasMatch(content) && !content.contains(r'\[')) {
      return MarkdownBody(
        data: content,
        selectable: true,
        styleSheet: MarkdownStyleSheet(
          p: (compact
                  ? Theme.of(context).textTheme.bodyMedium
                  : Theme.of(context).textTheme.bodyLarge)
              ?.copyWith(height: 1.55),
          strong: const TextStyle(fontWeight: FontWeight.w700),
          em: const TextStyle(fontStyle: FontStyle.italic),
          blockquote: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: AppColors.textSecondary,
                height: 1.55,
              ),
          code: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontFamily: 'monospace',
                backgroundColor: AppColors.surfaceMuted,
              ),
          listBullet: Theme.of(context).textTheme.bodyLarge,
        ),
        onTapLink: (text, href, title) {
          if (href != null) {
            launchUrlString(href);
          }
        },
      );
    }

    final parts = <Widget>[];
    final matches = _inlineMathPattern.allMatches(content).toList();
    var cursor = 0;
    for (final match in matches) {
      if (match.start > cursor) {
        final text = content.substring(cursor, match.start);
        if (text.trim().isNotEmpty) {
          parts.add(_InlineMarkdownText(content: text, compact: compact));
        }
      }
      final expression = match.group(1) ?? '';
      parts.add(
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Math.tex(
            expression,
            textStyle: (compact
                    ? Theme.of(context).textTheme.bodyLarge
                    : Theme.of(context).textTheme.titleSmall)
                ?.copyWith(color: AppColors.textPrimary),
          ),
        ),
      );
      cursor = match.end;
    }
    if (cursor < content.length) {
      final text = content.substring(cursor);
      if (text.trim().isNotEmpty) {
        parts.add(_InlineMarkdownText(content: text, compact: compact));
      }
    }

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 2,
      runSpacing: 6,
      children: parts,
    );
  }
}

class _InlineMarkdownText extends StatelessWidget {
  const _InlineMarkdownText({
    required this.content,
    required this.compact,
  });

  final String content;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return MarkdownBody(
      data: content,
      selectable: true,
      shrinkWrap: true,
      styleSheet: MarkdownStyleSheet(
        p: (compact
                ? Theme.of(context).textTheme.bodyMedium
                : Theme.of(context).textTheme.bodyLarge)
            ?.copyWith(height: 1.55),
      ),
    );
  }
}

class _AttachmentCard extends StatelessWidget {
  const _AttachmentCard({
    required this.attachment,
    required this.compact,
  });

  final RichAttachmentModel attachment;
  final bool compact;

  bool get _isVisual =>
      attachment.attachmentType == 'image' || attachment.attachmentType == 'diagram';

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: attachment.fileUrl.isEmpty ? null : () => launchUrlString(attachment.fileUrl),
      child: Ink(
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Padding(
          padding: EdgeInsets.all(compact ? AppSpacing.sm : AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _isVisual ? Icons.image_outlined : Icons.attach_file_rounded,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      attachment.title.isEmpty ? 'Attachment' : attachment.title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ],
              ),
              if (attachment.altText.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  attachment.altText,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ],
              if (_isVisual && attachment.fileUrl.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.sm),
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    attachment.fileUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _AttachmentFallback(
                      attachmentType: attachment.attachmentType,
                    ),
                  ),
                ),
              ] else if (!_isVisual) ...[
                const SizedBox(height: AppSpacing.sm),
                _AttachmentFallback(attachmentType: attachment.attachmentType),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _AttachmentFallback extends StatelessWidget {
  const _AttachmentFallback({required this.attachmentType});

  final String attachmentType;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        'Open ${attachmentType.replaceAll('_', ' ')} attachment',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
      ),
    );
  }
}
