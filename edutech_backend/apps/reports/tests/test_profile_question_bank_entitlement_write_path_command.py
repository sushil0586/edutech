from django.test import SimpleTestCase

from apps.reports.management.commands.profile_question_bank_entitlement_write_path import Command


class ProfileQuestionBankEntitlementWritePathCommandTestCase(SimpleTestCase):
    def test_query_sql_samples_truncates_and_limits(self):
        command = Command()
        query_context = type(
            "QueryContext",
            (),
            {
                "captured_queries": [
                    {"sql": "SELECT " + "x" * 400},
                    {"sql": "SELECT 2"},
                    {"sql": "SELECT 3"},
                ]
            },
        )()

        samples = command._query_sql_samples(query_context, limit=2, max_length=20)

        self.assertEqual(len(samples), 2)
        self.assertTrue(samples[0].endswith("..."))
        self.assertEqual(samples[1], "SELECT 2")
