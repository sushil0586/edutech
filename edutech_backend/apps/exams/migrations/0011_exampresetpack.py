from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("institutes", "0001_initial"),
        ("exams", "0010_exam_exams_exam_institu_11e0e5_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExamPresetPack",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(default=True)),
                ("scope_type", models.CharField(choices=[("platform", "Platform"), ("institute", "Institute")], default="platform", max_length=20)),
                ("code", models.CharField(max_length=100)),
                ("label", models.CharField(max_length=255)),
                ("family", models.CharField(max_length=120)),
                ("note", models.TextField(blank=True)),
                ("chip", models.CharField(blank=True, max_length=120)),
                ("config", models.JSONField(blank=True, default=dict)),
                ("institute", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="exam_preset_packs", to="institutes.institute")),
            ],
            options={
                "ordering": ["scope_type", "family", "label", "-updated_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="exampresetpack",
            constraint=models.UniqueConstraint(fields=("scope_type", "institute", "code"), name="unique_exam_preset_pack_code_per_scope"),
        ),
        migrations.AddIndex(
            model_name="exampresetpack",
            index=models.Index(fields=["scope_type", "institute"], name="exams_examp_scope_t_613f61_idx"),
        ),
        migrations.AddIndex(
            model_name="exampresetpack",
            index=models.Index(fields=["code"], name="exams_examp_code_1c7118_idx"),
        ),
        migrations.AddIndex(
            model_name="exampresetpack",
            index=models.Index(fields=["is_active"], name="exams_examp_is_acti_04d118_idx"),
        ),
    ]
