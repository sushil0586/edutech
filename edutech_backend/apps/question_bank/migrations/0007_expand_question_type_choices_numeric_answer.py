from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("question_bank", "0006_expand_content_format_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="masterquestion",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("mcq_single", "MCQ Single"),
                    ("mcq_multiple", "MCQ Multiple"),
                    ("true_false", "True / False"),
                    ("short_answer", "Short Answer"),
                    ("numeric_answer", "Numeric Answer"),
                ],
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="question",
            name="question_type",
            field=models.CharField(
                choices=[
                    ("mcq_single", "MCQ Single"),
                    ("mcq_multiple", "MCQ Multiple"),
                    ("true_false", "True / False"),
                    ("short_answer", "Short Answer"),
                    ("numeric_answer", "Numeric Answer"),
                ],
                max_length=30,
            ),
        ),
    ]
