from dataclasses import dataclass

from apps.academics.management.seed_presets import CLASS_7_CBSE_CORE
from apps.academics.services import normalize_academic_code


@dataclass(frozen=True)
class VisibleChapter:
    chapter_code: str
    chapter_name: str
    sort_order: int
    internal_topic_codes: tuple[str, ...]
    notes: str = ""


def _leaf_topic_codes_for_subject(preset, subject_code):
    normalized_subject_code = normalize_academic_code(subject_code)
    for subject in preset.get("subjects", []):
        if normalize_academic_code(subject.get("code")) != normalized_subject_code:
            continue
        codes = []
        for topic in subject.get("topics", []):
            for child_name, child_code, child_sort_order in topic.get("children", []):
                del child_name, child_sort_order
                codes.append(normalize_academic_code(child_code))
        return tuple(codes)
    return tuple()


CLASS_7_MATH_VISIBLE_CHAPTERS = (
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-INTEGERS",
        chapter_name="Integers",
        sort_order=10,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-FRACDEC",
        chapter_name="Fractions and Decimals",
        sort_order=20,
        internal_topic_codes=(
            "MATH-FRACTIONS-EQUIVALENT",
            "MATH-FRACTIONS-MULTIPLY",
            "MATH-FRACTIONS-DIVIDE",
            "MATH-ARITH-DECIMALS",
        ),
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-DATA",
        chapter_name="Data Handling",
        sort_order=30,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-EQUATIONS",
        chapter_name="Simple Equations",
        sort_order=40,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-LINESANGLES",
        chapter_name="Lines and Angles",
        sort_order=50,
        internal_topic_codes=(
            "MATH-GEOMETRY-LINES",
            "MATH-GEOMETRY-ANGLES",
        ),
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-TRIANGLES",
        chapter_name="The Triangle and Its Properties",
        sort_order=60,
        internal_topic_codes=("MATH-GEOMETRY-TRIANGLES",),
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-CONGRUENCE",
        chapter_name="Congruence of Triangles",
        sort_order=70,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-COMPQUANT",
        chapter_name="Comparing Quantities",
        sort_order=80,
        internal_topic_codes=(),
        notes="Needs a canonical curated chapter pack.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-RATIONAL",
        chapter_name="Rational Numbers",
        sort_order=90,
        internal_topic_codes=(),
        notes="Needs a canonical curated chapter pack.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-PRACGEO",
        chapter_name="Practical Geometry",
        sort_order=100,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-PERIAREA",
        chapter_name="Perimeter and Area",
        sort_order=110,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-ALGEXP",
        chapter_name="Algebraic Expressions",
        sort_order=120,
        internal_topic_codes=(
            "MATH-ALGEBRA-LETTERS",
            "MATH-ALGEBRA-VARIABLES",
            "MATH-ALGEBRA-PATTERNS",
        ),
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-EXPPOW",
        chapter_name="Exponents and Powers",
        sort_order=130,
        internal_topic_codes=(),
        notes="Needs a canonical curated chapter pack.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-SYMMETRY",
        chapter_name="Symmetry",
        sort_order=140,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
    VisibleChapter(
        chapter_code="CLS7-MATH-CH-SOLIDS",
        chapter_name="Visualising Solid Shapes",
        sort_order=150,
        internal_topic_codes=(),
        notes="Currently backed by the standalone older question bank and not yet mapped to the curated preset.",
    ),
)


VISIBLE_CHAPTER_REGISTRY = {
    ("CLS7", "CLS7-MATH"): CLASS_7_MATH_VISIBLE_CHAPTERS,
}


def get_visible_chapters(program_code, subject_code):
    key = (
        normalize_academic_code(program_code),
        normalize_academic_code(subject_code),
    )
    return VISIBLE_CHAPTER_REGISTRY.get(key, ())


def get_visible_chapter(program_code, subject_code, chapter_code):
    normalized_chapter_code = normalize_academic_code(chapter_code)
    for chapter in get_visible_chapters(program_code, subject_code):
        if normalize_academic_code(chapter.chapter_code) == normalized_chapter_code:
            return chapter
    return None


def get_mapped_internal_topic_codes(program_code, subject_code):
    topic_codes = []
    for chapter in get_visible_chapters(program_code, subject_code):
        topic_codes.extend(chapter.internal_topic_codes)
    return tuple(topic_codes)


def get_unmapped_leaf_topic_codes(program_code, subject_code):
    key = (
        normalize_academic_code(program_code),
        normalize_academic_code(subject_code),
    )
    if key != ("CLS7", "CLS7-MATH"):
        return tuple()

    preset_leaf_codes = set(_leaf_topic_codes_for_subject(CLASS_7_CBSE_CORE, "CLS7-MATH"))
    mapped_codes = set(get_mapped_internal_topic_codes(program_code, subject_code))
    return tuple(sorted(preset_leaf_codes - mapped_codes))
