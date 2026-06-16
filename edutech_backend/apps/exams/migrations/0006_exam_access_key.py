import secrets
import string

from django.db import migrations, models


ALPHABET = string.ascii_uppercase + string.digits


def generate_key():
    return "".join(secrets.choice(ALPHABET) for _ in range(8))


def assign_access_keys(apps, schema_editor):
    Exam = apps.get_model("exams", "Exam")

    for exam in Exam.objects.all().iterator():
        key = (exam.access_key or "").strip().upper()
        while not key or Exam.objects.filter(
            institute_id=exam.institute_id,
            access_key=key,
        ).exclude(pk=exam.pk).exists():
            key = generate_key()
        exam.access_key = key
        exam.save(update_fields=["access_key"])


class Migration(migrations.Migration):
    dependencies = [
        ("exams", "0005_rename_exams_exams_exam_id_9db569_idx_exams_exams_exam_id_14b527_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="access_key",
            field=models.CharField(blank=True, default="", max_length=16),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="exam",
            name="access_key_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(assign_access_keys, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="exam",
            constraint=models.UniqueConstraint(
                fields=("institute", "access_key"),
                name="unique_exam_access_key_per_institute",
            ),
        ),
        migrations.AddIndex(
            model_name="exam",
            index=models.Index(
                fields=["institute", "access_key_enabled"],
                name="exams_exam_institu_6ab1df_idx",
            ),
        ),
    ]
