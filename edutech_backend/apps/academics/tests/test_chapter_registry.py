from django.test import SimpleTestCase

from apps.academics.chapter_registry import (
    CLASS_7_MATH_VISIBLE_CHAPTERS,
    get_mapped_internal_topic_codes,
    get_unmapped_leaf_topic_codes,
    get_visible_chapter,
    get_visible_chapters,
)
from apps.academics.management.seed_presets import CLASS_7_CBSE_CORE


class ChapterRegistryTestCase(SimpleTestCase):
    def test_class_7_math_registry_exposes_15_visible_chapters(self):
        chapters = get_visible_chapters("cls7", "cls7-math")

        self.assertEqual(len(chapters), 15)
        self.assertEqual(chapters[0].chapter_name, "Integers")
        self.assertEqual(chapters[-1].chapter_name, "Visualising Solid Shapes")

    def test_can_lookup_specific_visible_chapter(self):
        chapter = get_visible_chapter("CLS7", "CLS7-MATH", "cls7-math-ch-fracdec")

        self.assertIsNotNone(chapter)
        self.assertEqual(chapter.chapter_name, "Fractions and Decimals")
        self.assertEqual(
            chapter.internal_topic_codes,
            (
                "MATH-FRACTIONS-EQUIVALENT",
                "MATH-FRACTIONS-MULTIPLY",
                "MATH-FRACTIONS-DIVIDE",
                "MATH-ARITH-DECIMALS",
            ),
        )

    def test_mapped_internal_topic_codes_are_unique(self):
        mapped_codes = get_mapped_internal_topic_codes("CLS7", "CLS7-MATH")

        self.assertEqual(len(mapped_codes), len(set(mapped_codes)))

    def test_mapped_internal_topic_codes_exist_in_seed_preset(self):
        preset_math = next(
            subject
            for subject in CLASS_7_CBSE_CORE["subjects"]
            if subject["code"] == "CLS7-MATH"
        )
        preset_leaf_codes = {
            child_code
            for topic in preset_math["topics"]
            for _, child_code, _ in topic["children"]
        }

        self.assertTrue(set(get_mapped_internal_topic_codes("CLS7", "CLS7-MATH")).issubset(preset_leaf_codes))

    def test_unmapped_leaf_topic_codes_match_enrichment_or_internal_only_topics(self):
        unmapped_codes = get_unmapped_leaf_topic_codes("CLS7", "CLS7-MATH")

        self.assertEqual(
            unmapped_codes,
            (
                "MATH-ARITH-EXPRESSIONS",
                "MATH-ARITH-ORDER",
                "MATH-LOGIC-NUMBERPLAY",
                "MATH-LOGIC-PATTERNS",
                "MATH-LOGIC-PUZZLES",
                "MATH-NUMBERS-LARGE",
                "MATH-NUMBERS-PLACE",
                "MATH-NUMBERS-SYSTEMS",
            ),
        )

    def test_chapter_codes_are_unique(self):
        chapter_codes = [chapter.chapter_code for chapter in CLASS_7_MATH_VISIBLE_CHAPTERS]

        self.assertEqual(len(chapter_codes), len(set(chapter_codes)))
