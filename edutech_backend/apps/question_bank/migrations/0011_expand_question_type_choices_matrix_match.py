from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("question_bank", "0010_expand_question_type_choices_assertion_reason"),
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
                    ("assertion_reason", "Assertion / Reason"),
                    ("matrix_match", "Matrix Match"),
                    ("short_answer", "Short Answer"),
                    ("fill_in_blanks", "Fill in the Blanks"),
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
                    ("assertion_reason", "Assertion / Reason"),
                    ("matrix_match", "Matrix Match"),
                    ("short_answer", "Short Answer"),
                    ("fill_in_blanks", "Fill in the Blanks"),
                    ("numeric_answer", "Numeric Answer"),
                    ("essay_manual_review", "Essay Manual Review"),
                ],
                max_length=30,
            ),
        ),
    ]
