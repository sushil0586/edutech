from django.test import SimpleTestCase

from apps.academics.assessment_family_contracts import (
    get_assessment_family_contract_defaults,
    load_assessment_family_contracts,
)


class AssessmentFamilyContractsTestCase(SimpleTestCase):
    def test_load_assessment_family_contracts_returns_expected_competitive_defaults(self):
        contracts = load_assessment_family_contracts()

        self.assertIn("competitive", contracts)
        self.assertIn("numeric_answer", contracts["competitive"]["allowed_question_types"])
        self.assertTrue(contracts["competitive"]["scoring_defaults"]["negative_marking_default"])

    def test_get_assessment_family_contract_defaults_returns_detached_copy(self):
        contract = get_assessment_family_contract_defaults("school")

        self.assertIsNotNone(contract)
        contract["allowed_question_types"].append("temporary_question_type")

        fresh_contract = get_assessment_family_contract_defaults("school")
        self.assertNotIn("temporary_question_type", fresh_contract["allowed_question_types"])
