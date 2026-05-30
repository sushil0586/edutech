import django.db.models.deletion
from django.db import migrations, models


def backfill_exam_question_sections(apps, schema_editor):
    ExamQuestion = apps.get_model("exams", "ExamQuestion")
    ExamSection = apps.get_model("exams", "ExamSection")

    for exam_question in ExamQuestion.objects.exclude(section_name="").iterator():
        matching_section = (
            ExamSection.objects.filter(
                exam_id=exam_question.exam_id,
                name=exam_question.section_name,
            )
            .order_by("section_order", "created_at")
            .first()
        )
        if matching_section is None:
            continue
        ExamQuestion.objects.filter(pk=exam_question.pk).update(section_id=matching_section.pk)


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="examquestion",
            name="section",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="exam_questions",
                to="exams.examsection",
            ),
        ),
        migrations.RunPython(backfill_exam_question_sections, migrations.RunPython.noop),
    ]
