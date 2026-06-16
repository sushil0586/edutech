import uuid

from django.db import migrations, models
from django.db.models import Q


OPTION_CATALOG_SEED = [
    ("exam_type", "practice", "Practice", "Reusable practice session for self-paced learning.", 10, True),
    ("exam_type", "quiz", "Quiz", "Short evaluative assessment for quick checks.", 20, False),
    ("exam_type", "test", "Test", "Standard classroom or coaching test.", 30, False),
    ("exam_type", "assessment", "Assessment", "Formal assessment with tighter delivery controls.", 40, False),
    ("exam_type", "mock_exam", "Mock Exam", "Full-length mock aligned to a real exam pattern.", 50, False),
    ("exam_type", "final_exam", "Final Exam", "High-stakes final examination.", 60, False),
    ("exam_delivery_mode", "online", "Online", "Students take the exam in the web workspace.", 10, True),
    ("exam_delivery_mode", "offline", "Offline", "Exam is delivered outside the platform.", 20, False),
    ("exam_delivery_mode", "hybrid", "Hybrid", "Delivery combines online and offline activity.", 30, False),
    ("exam_timer_mode", "global", "Global Timer", "One timer runs for the entire exam.", 10, True),
    ("exam_timer_mode", "section", "Section Timer", "Each section controls its own timer.", 20, False),
    ("exam_timer_mode", "hybrid", "Hybrid Timer", "Exam uses a mix of global and sectional timing.", 30, False),
    ("exam_navigation_mode", "free_exam", "Free Across Exam", "Students can move anywhere in the exam.", 10, True),
    ("exam_navigation_mode", "free_section", "Free Within Section", "Movement is free inside the active section.", 20, False),
    ("exam_navigation_mode", "sequential", "Sequential Sections", "Sections must be completed in order.", 30, False),
    ("exam_navigation_mode", "hybrid", "Hybrid", "Mixed navigation controls across sections.", 40, False),
    ("exam_attempt_policy", "single", "Single Attempt", "Only one attempt is allowed.", 10, True),
    ("exam_attempt_policy", "latest", "Latest Attempt Counted", "Latest submission becomes the official result.", 20, False),
    ("exam_attempt_policy", "best", "Best Attempt Counted", "Highest-scoring attempt is counted.", 30, False),
    ("exam_attempt_policy", "unlimited_practice", "Unlimited Practice", "Students can repeat for practice.", 40, False),
    ("exam_result_publish_mode", "immediate", "Immediate", "Results can be published immediately after evaluation.", 10, False),
    ("exam_result_publish_mode", "scheduled", "Scheduled", "Results are published at a scheduled time.", 20, False),
    ("exam_result_publish_mode", "after_review", "After Review", "Results are held until review is complete.", 30, True),
    ("exam_review_mode", "none", "No Review", "No post-submission review is allowed.", 10, False),
    ("exam_review_mode", "attempted_only", "Attempted Only", "Students review only attempted questions.", 20, True),
    ("exam_review_mode", "all_questions", "All Questions", "Students review all exam questions.", 30, False),
    ("exam_review_mode", "solution_review", "Solution Review", "Review includes solutions and explanations.", 40, False),
    ("exam_security_mode", "normal", "Standard Online", "Normal online delivery with basic safeguards.", 10, True),
    ("exam_security_mode", "focus", "Focus Monitoring", "Focus mode with stricter switching controls.", 20, False),
    ("exam_security_mode", "fullscreen", "Fullscreen Required", "Students must stay in fullscreen.", 30, False),
    ("exam_security_mode", "violation_limited", "Violation Limited", "Exam ends after repeated violations.", 40, False),
    ("exam_security_mode", "proctored", "Enhanced Monitoring", "Use stronger invigilation or proctoring controls.", 50, False),
    ("exam_assignment_mode", "scope", "Program / Cohort Scope", "Assign by academic scope.", 10, True),
    ("exam_assignment_mode", "selected_students", "Selected Students", "Assign only to chosen learners.", 20, False),
    ("exam_economy_access_policy", "", "Open Access", "No star or entitlement requirement.", 10, True),
    ("exam_economy_access_policy", "free", "Explicitly Free", "Marked free for reporting and policy clarity.", 20, False),
    ("exam_economy_access_policy", "stars_only", "Stars Only", "Requires stars to unlock.", 30, False),
    ("exam_economy_access_policy", "entitlement_only", "Entitlement Only", "Requires an entitlement code.", 40, False),
    ("exam_economy_access_policy", "stars_or_entitlement", "Stars or Entitlement", "Either stars or entitlement grants access.", 50, False),
    ("question_type", "mcq_single", "MCQ Single", "Single-correct multiple-choice question.", 10, True),
    ("question_type", "mcq_multiple", "MCQ Multiple", "Multiple-correct multiple-choice question.", 20, False),
    ("question_type", "true_false", "True / False", "Binary true or false question.", 30, False),
    ("question_type", "short_answer", "Short Answer", "Open-response short-answer question.", 40, False),
    ("question_difficulty", "foundation", "Foundation", "Entry-level or prerequisite difficulty.", 10, False),
    ("question_difficulty", "intermediate", "Intermediate", "Balanced everyday teaching difficulty.", 20, True),
    ("question_difficulty", "advanced", "Advanced", "Challenging or competitive difficulty.", 30, False),
    ("question_content_format", "markdown_latex", "Markdown + LaTeX", "Rich text with math support.", 10, True),
    ("question_content_format", "plain_text", "Plain Text", "Plain text without rich formatting.", 20, False),
    ("question_attachment_type", "image", "Image", "Standard image attachment.", 10, True),
    ("question_attachment_type", "diagram", "Diagram", "Diagram or chart attachment.", 20, False),
    ("question_attachment_type", "pdf", "PDF", "Document attachment.", 30, False),
    ("question_attachment_type", "audio", "Audio", "Audio support file.", 40, False),
    ("question_attachment_type", "video", "Video", "Video support file.", 50, False),
    ("question_attachment_type", "other", "Other", "Any other file attachment.", 60, False),
]


def seed_option_catalog(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")

    for namespace, code, label, description, sort_order, is_default in OPTION_CATALOG_SEED:
        OptionCatalogEntry.objects.update_or_create(
            namespace=namespace,
            code=code,
            defaults={
                "label": label,
                "description": description,
                "sort_order": sort_order,
                "is_default": is_default,
                "is_active": True,
                "metadata": {},
            },
        )


def unseed_option_catalog(apps, schema_editor):
    OptionCatalogEntry = apps.get_model("academics", "OptionCatalogEntry")
    namespaces = sorted({item[0] for item in OPTION_CATALOG_SEED})
    OptionCatalogEntry.objects.filter(namespace__in=namespaces).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("academics", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OptionCatalogEntry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("namespace", models.CharField(max_length=80)),
                ("code", models.CharField(blank=True, max_length=80)),
                ("label", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_default", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "ordering": ["namespace", "sort_order", "label"],
            },
        ),
        migrations.AddConstraint(
            model_name="optioncatalogentry",
            constraint=models.UniqueConstraint(
                fields=("namespace", "code"),
                name="unique_option_catalog_code_per_namespace",
            ),
        ),
        migrations.AddConstraint(
            model_name="optioncatalogentry",
            constraint=models.UniqueConstraint(
                condition=Q(("is_default", True)),
                fields=("namespace",),
                name="unique_default_option_catalog_entry_per_namespace",
            ),
        ),
        migrations.AddIndex(
            model_name="optioncatalogentry",
            index=models.Index(fields=["namespace", "is_active"], name="academics_o_namespa_845505_idx"),
        ),
        migrations.AddIndex(
            model_name="optioncatalogentry",
            index=models.Index(fields=["namespace", "sort_order"], name="academics_o_namespa_783984_idx"),
        ),
        migrations.AddIndex(
            model_name="optioncatalogentry",
            index=models.Index(fields=["is_default"], name="academics_o_is_defa_866865_idx"),
        ),
        migrations.RunPython(seed_option_catalog, unseed_option_catalog),
    ]
