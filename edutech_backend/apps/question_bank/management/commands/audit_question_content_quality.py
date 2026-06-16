import re
from collections import Counter, defaultdict
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.institutes.models import Institute
from apps.question_bank.models import MasterQuestion, Question


def normalize_text(value):
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


class Command(BaseCommand):
    help = (
        "Audit question content quality by topic and flag repeated stems, weak pattern variety, "
        "and high duplicate concentration in Question or MasterQuestion libraries."
    )

    def add_arguments(self, parser):
        parser.add_argument("institute_code", help="Institute code to audit.")
        parser.add_argument(
            "--source",
            default="question",
            choices=["question", "master"],
            help="Audit operational Question rows or canonical MasterQuestion rows.",
        )
        parser.add_argument(
            "--subject-code",
            default="",
            help="Optional subject code filter.",
        )
        parser.add_argument(
            "--topic-code",
            default="",
            help="Optional topic code filter.",
        )
        parser.add_argument(
            "--seed-batch",
            default="",
            help="Optional metadata seed_batch filter.",
        )
        parser.add_argument(
            "--markdown-out",
            default="",
            help="Optional markdown report output path.",
        )
        parser.add_argument(
            "--min-distinct-ratio",
            type=float,
            default=0.20,
            help="Minimum acceptable distinct-text ratio per topic. Default: 0.20",
        )
        parser.add_argument(
            "--max-top-repeat-share",
            type=float,
            default=0.20,
            help="Maximum acceptable share of the most repeated visible question text in a topic. Default: 0.20",
        )
        parser.add_argument(
            "--min-pattern-count",
            type=int,
            default=5,
            help="Minimum acceptable number of distinct question_pattern values per topic. Default: 5",
        )

    def handle(self, *args, **options):
        institute = self._resolve_institute(options["institute_code"].strip())
        rows = self._fetch_rows(
            institute=institute,
            source=options["source"],
            subject_code=options["subject_code"].strip(),
            topic_code=options["topic_code"].strip(),
            seed_batch=options["seed_batch"].strip(),
        )
        if not rows:
            raise CommandError("No question rows matched the provided filters.")

        report = self._build_report(
            institute=institute,
            source=options["source"],
            rows=rows,
            min_distinct_ratio=options["min_distinct_ratio"],
            max_top_repeat_share=options["max_top_repeat_share"],
            min_pattern_count=options["min_pattern_count"],
            seed_batch=options["seed_batch"].strip(),
        )

        markdown = self._render_markdown(report)
        self.stdout.write(markdown)

        output_path = options["markdown_out"].strip()
        if output_path:
            path = Path(output_path).expanduser()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(markdown, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"\nMarkdown report written to {path}"))

    def _resolve_institute(self, institute_code):
        institute = Institute.objects.filter(code=institute_code).first()
        if institute is None:
            raise CommandError(f"Institute not found: {institute_code}")
        return institute

    def _fetch_rows(self, *, institute, source, subject_code, topic_code, seed_batch):
        if source == "master":
            queryset = MasterQuestion.objects.filter(
                source_institute=institute,
                is_active=True,
            ).select_related("source_subject", "source_topic")
            if subject_code:
                queryset = queryset.filter(source_subject__code=subject_code)
            if topic_code:
                queryset = queryset.filter(source_topic__code=topic_code)
        else:
            queryset = Question.objects.filter(
                institute=institute,
                is_active=True,
            ).select_related("subject", "topic")
            if subject_code:
                queryset = queryset.filter(subject__code=subject_code)
            if topic_code:
                queryset = queryset.filter(topic__code=topic_code)

        if seed_batch:
            queryset = queryset.filter(metadata__seed_batch=seed_batch)

        return list(queryset.order_by("created_at"))

    def _build_report(
        self,
        *,
        institute,
        source,
        rows,
        min_distinct_ratio,
        max_top_repeat_share,
        min_pattern_count,
        seed_batch,
    ):
        grouped = defaultdict(list)
        for row in rows:
            subject = row.source_subject if source == "master" else row.subject
            topic = row.source_topic if source == "master" else row.topic
            topic_code = topic.code if topic else "NO-TOPIC"
            topic_name = topic.name if topic else "No topic"
            grouped[(subject.code, subject.name, topic_code, topic_name)].append(row)

        topic_reports = []
        total_issues = 0
        for (subject_code, subject_name, topic_code, topic_name), topic_rows in sorted(grouped.items()):
            text_counter = Counter()
            raw_text_counter = Counter()
            pattern_counter = Counter()
            type_counter = Counter()

            for row in topic_rows:
                normalized = normalize_text(row.question_text)
                text_counter[normalized] += 1
                raw_text_counter[row.question_text.strip()] += 1
                pattern_counter[(row.metadata or {}).get("question_pattern", "unclassified")] += 1
                type_counter[row.question_type] += 1

            total = len(topic_rows)
            distinct_text_count = len(text_counter)
            distinct_ratio = (distinct_text_count / total) if total else 0
            top_text, top_text_count = raw_text_counter.most_common(1)[0]
            top_repeat_share = top_text_count / total if total else 0
            pattern_count = len(pattern_counter)

            flags = []
            if distinct_ratio < min_distinct_ratio:
                flags.append(f"low distinct ratio ({distinct_ratio:.0%})")
            if top_repeat_share > max_top_repeat_share:
                flags.append(f"top repeated stem too high ({top_repeat_share:.0%})")
            if pattern_count < min_pattern_count:
                flags.append(f"low pattern variety ({pattern_count})")

            total_issues += len(flags)

            topic_reports.append(
                {
                    "subject_code": subject_code,
                    "subject_name": subject_name,
                    "topic_code": topic_code,
                    "topic_name": topic_name,
                    "total": total,
                    "distinct_text_count": distinct_text_count,
                    "distinct_ratio": distinct_ratio,
                    "pattern_count": pattern_count,
                    "pattern_counter": pattern_counter,
                    "type_counter": type_counter,
                    "top_text": top_text,
                    "top_text_count": top_text_count,
                    "top_repeat_share": top_repeat_share,
                    "flags": flags,
                }
            )

        return {
            "institute_code": institute.code,
            "source": source,
            "seed_batch": seed_batch or "all active rows",
            "total_rows": len(rows),
            "topic_count": len(topic_reports),
            "issue_count": total_issues,
            "topic_reports": sorted(
                topic_reports,
                key=lambda item: (
                    0 if item["flags"] else 1,
                    item["distinct_ratio"],
                    -item["top_repeat_share"],
                    item["subject_code"],
                    item["topic_code"],
                ),
            ),
            "thresholds": {
                "min_distinct_ratio": min_distinct_ratio,
                "max_top_repeat_share": max_top_repeat_share,
                "min_pattern_count": min_pattern_count,
            },
        }

    def _render_markdown(self, report):
        lines = [
            "# Question Content Audit",
            "",
            f"- Institute: `{report['institute_code']}`",
            f"- Source: `{report['source']}`",
            f"- Scope: `{report['seed_batch']}`",
            f"- Total rows audited: `{report['total_rows']}`",
            f"- Topics audited: `{report['topic_count']}`",
            f"- Flag count: `{report['issue_count']}`",
            "",
            "## Thresholds",
            "",
            f"- Minimum distinct-text ratio: `{report['thresholds']['min_distinct_ratio']:.0%}`",
            f"- Maximum top-repeat share: `{report['thresholds']['max_top_repeat_share']:.0%}`",
            f"- Minimum pattern count: `{report['thresholds']['min_pattern_count']}`",
            "",
            "## Topic Review",
            "",
        ]

        for topic in report["topic_reports"]:
            lines.extend(
                [
                    f"### {topic['subject_name']} -> {topic['topic_name']}",
                    "",
                    f"- Subject code: `{topic['subject_code']}`",
                    f"- Topic code: `{topic['topic_code']}`",
                    f"- Total questions: `{topic['total']}`",
                    f"- Distinct visible texts: `{topic['distinct_text_count']}`",
                    f"- Distinct ratio: `{topic['distinct_ratio']:.0%}`",
                    f"- Distinct pattern count: `{topic['pattern_count']}`",
                    f"- Top repeated stem count: `{topic['top_text_count']}`",
                    f"- Top repeated stem share: `{topic['top_repeat_share']:.0%}`",
                    f"- Status: `{'NEEDS REVIEW' if topic['flags'] else 'OK'}`",
                ]
            )

            if topic["flags"]:
                lines.append(f"- Flags: {', '.join(topic['flags'])}")

            lines.append("- Question type mix:")
            for key, count in topic["type_counter"].most_common():
                lines.append(f"  - `{key}`: `{count}`")

            lines.append("- Pattern mix:")
            for key, count in topic["pattern_counter"].most_common():
                lines.append(f"  - `{key}`: `{count}`")

            lines.extend(
                [
                    "- Most repeated visible question text:",
                    "",
                    "```text",
                    topic["top_text"],
                    "```",
                    "",
                ]
            )

        return "\n".join(lines)
