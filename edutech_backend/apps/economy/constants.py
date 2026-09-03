from apps.economy.models import LedgerEntrySourceType, RewardRuleType

DERIVED_CONTENT_ENTITLEMENT_PREFIX = "unlock"

REFERRAL_CODE_METADATA_KEY = "referral_code"
REFERRAL_EVENT_ID_METADATA_KEY = "referral_event_id"
REFEREE_STUDENT_ID_METADATA_KEY = "referee_student_id"
REFERRER_STUDENT_ID_METADATA_KEY = "referrer_student_id"

SIGNUP_TRIGGER = "signup"
TRIGGER_METADATA_KEY = "trigger"

MASTER_QUESTION_SEED_LANES_METADATA_KEY = "master_question_seed_lanes"
SEED_LANE_METADATA_KEY = "seed_lane"

SUBSCRIPTION_COMMERCIAL_PATHS = frozenset(
    {
        "subscription_only",
        "subscription_or_stars",
    }
)

SPONSORED_COMMERCIAL_PATHS = frozenset(
    {
        "institute_sponsored",
        "platform_managed",
    }
)

COMMERCIAL_PATH_ALIASES = {
    "free_exam": "free",
    "star_unlock_exam": "stars_only",
    "subscription_covered_exam": "subscription_only",
    "subscription_or_stars_exam": "subscription_or_stars",
    "institute_sponsored_exam": "institute_sponsored",
    "platform_sponsored_exam": "platform_managed",
    "platform_managed_exam": "platform_managed",
}

REWARD_RULE_LEDGER_SOURCE_TYPES = {
    RewardRuleType.SIGNUP: LedgerEntrySourceType.SIGNUP_BONUS,
    RewardRuleType.REFERRAL: LedgerEntrySourceType.REFERRAL_BONUS,
    RewardRuleType.EXAM_COMPLETION: LedgerEntrySourceType.EXAM_REWARD,
    RewardRuleType.SCORE_THRESHOLD: LedgerEntrySourceType.EXAM_REWARD,
}

DEFAULT_REWARD_LEDGER_SOURCE_TYPE = LedgerEntrySourceType.ADJUSTMENT
