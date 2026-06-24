from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("question_bank", "0005_question_passage_order_questionpassage_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="masterquestion",
            name="content_format",
            field=models.CharField(
                choices=[
                    ("plain_text", "Plain Text"),
                    ("markdown_latex", "Markdown + LaTeX"),
                    ("rich_text_html", "Rich Text Editor"),
                ],
                default="markdown_latex",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="masterquestionoption",
            name="content_format",
            field=models.CharField(
                choices=[
                    ("plain_text", "Plain Text"),
                    ("markdown_latex", "Markdown + LaTeX"),
                    ("rich_text_html", "Rich Text Editor"),
                ],
                default="markdown_latex",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="question",
            name="content_format",
            field=models.CharField(
                choices=[
                    ("plain_text", "Plain Text"),
                    ("markdown_latex", "Markdown + LaTeX"),
                    ("rich_text_html", "Rich Text Editor"),
                ],
                default="markdown_latex",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="questionoption",
            name="content_format",
            field=models.CharField(
                choices=[
                    ("plain_text", "Plain Text"),
                    ("markdown_latex", "Markdown + LaTeX"),
                    ("rich_text_html", "Rich Text Editor"),
                ],
                default="markdown_latex",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="questionpassage",
            name="content_format",
            field=models.CharField(
                choices=[
                    ("plain_text", "Plain Text"),
                    ("markdown_latex", "Markdown + LaTeX"),
                    ("rich_text_html", "Rich Text Editor"),
                ],
                default="markdown_latex",
                max_length=20,
            ),
        ),
    ]
