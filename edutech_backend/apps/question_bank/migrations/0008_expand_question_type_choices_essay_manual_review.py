from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("question_bank", "0007_expand_question_type_choices_numeric_answer"),
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
                    ("essay_manual_review", "Essay Manual Review"),
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
                    ("essay_manual_review", "Essay Manual Review"),
                ],
                max_length=30,
            ),
        ),
    ]
