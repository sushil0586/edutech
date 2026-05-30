from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0001_initial"),
        ("teachers", "0001_initial"),
        ("exams", "0003_exam_runtime_configuration"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="assignment_mode",
            field=models.CharField(
                choices=[
                    ("scope", "Program/Cohort Scope"),
                    ("selected_students", "Selected Students"),
                ],
                default="scope",
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name="ExamStudentAssignment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("assigned_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="student_exam_assignments", to="teachers.teacherprofile")),
                ("exam", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="student_assignments", to="exams.exam")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="exam_assignments", to="students.studentprofile")),
            ],
            options={
                "ordering": ["student__first_name", "student__last_name", "student__admission_no"],
            },
        ),
        migrations.AddConstraint(
            model_name="examstudentassignment",
            constraint=models.UniqueConstraint(fields=("exam", "student"), name="unique_exam_student_assignment"),
        ),
        migrations.AddIndex(
            model_name="examstudentassignment",
            index=models.Index(fields=["exam", "student"], name="exams_exams_exam_id_9db569_idx"),
        ),
        migrations.AddIndex(
            model_name="examstudentassignment",
            index=models.Index(fields=["student", "is_active"], name="exams_exams_student__2f9158_idx"),
        ),
    ]
