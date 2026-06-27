from decimal import Decimal, InvalidOperation

from django.conf import settings
from rest_framework.exceptions import PermissionDenied


def _account_profile(user):
    return getattr(user, "account_profile", None)


def is_platform_admin(user) -> bool:
    profile = _account_profile(user)
    return bool(profile and profile.is_active and profile.role == "platform_admin")


def is_institute_admin(user) -> bool:
    profile = _account_profile(user)
    return bool(profile and profile.is_active and profile.role == "institute_admin")


def _max_confirm_order_amount() -> Decimal:
    value = get_or_create_economy_operator_policy_config().institute_admin_max_confirm_order_amount
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("5000.00")


def enforce_institute_admin_star_grant_policy(*, user, stars: int) -> None:
    if is_platform_admin(user):
        return
    if not is_institute_admin(user):
        raise PermissionDenied("You do not have permission to grant stars.")

    policy = get_or_create_economy_operator_policy_config()
    if not policy.institute_admin_can_grant_stars:
        raise PermissionDenied("Institute admins cannot grant stars in the current economy policy.")

    max_stars = int(policy.institute_admin_max_grant_stars)
    if stars > max_stars:
        raise PermissionDenied(
            f"Institute admins can grant at most {max_stars} stars per action in the current economy policy."
        )


def enforce_institute_admin_order_confirmation_policy(*, user, payment_order) -> None:
    if is_platform_admin(user):
        return
    if not is_institute_admin(user):
        raise PermissionDenied("You do not have permission to confirm payment orders.")

    policy = get_or_create_economy_operator_policy_config()
    if not policy.institute_admin_can_confirm_orders:
        raise PermissionDenied("Institute admins cannot confirm payment orders in the current economy policy.")

    max_amount = _max_confirm_order_amount()
    if payment_order.amount > max_amount:
        raise PermissionDenied(
            "Institute admins can confirm orders only up to "
            f"{max_amount:.2f} {payment_order.currency} in the current economy policy."
        )


def get_economy_operator_policy(*, user) -> dict:
    policy = get_or_create_economy_operator_policy_config()
    if is_platform_admin(user):
        return {
            "role": "platform_admin",
            "can_grant_stars": True,
            "max_grant_stars": None,
            "can_confirm_orders": True,
            "max_confirm_order_amount": None,
            "max_confirm_order_currency": None,
            "catalog_governance_scope": "platform_only",
            "support_scope": "cross_institute",
            "config_source": "database",
        }

    if is_institute_admin(user):
        return {
            "role": "institute_admin",
            "can_grant_stars": bool(policy.institute_admin_can_grant_stars),
            "max_grant_stars": int(policy.institute_admin_max_grant_stars),
            "can_confirm_orders": bool(policy.institute_admin_can_confirm_orders),
            "max_confirm_order_amount": f"{_max_confirm_order_amount():.2f}",
            "max_confirm_order_currency": policy.institute_admin_confirm_order_currency,
            "catalog_governance_scope": "platform_only",
            "support_scope": "institute_only",
            "config_source": "database",
        }

    raise PermissionDenied("You do not have permission to access economy operator policy.")


def get_or_create_economy_operator_policy_config():
    from apps.economy.models import EconomyOperatorPolicyConfig

    defaults = {
        "institute_admin_can_confirm_orders": getattr(
            settings, "ECONOMY_INSTITUTE_ADMIN_CAN_CONFIRM_ORDERS", True
        ),
        "institute_admin_max_confirm_order_amount": getattr(
            settings, "ECONOMY_INSTITUTE_ADMIN_MAX_CONFIRM_ORDER_AMOUNT", Decimal("5000.00")
        ),
        "institute_admin_confirm_order_currency": "INR",
        "institute_admin_can_grant_stars": getattr(
            settings, "ECONOMY_INSTITUTE_ADMIN_CAN_GRANT_STARS", True
        ),
        "institute_admin_max_grant_stars": getattr(
            settings, "ECONOMY_INSTITUTE_ADMIN_MAX_GRANT_STARS", 250
        ),
    }
    config_object, _ = EconomyOperatorPolicyConfig.objects.get_or_create(
        singleton_key="default",
        defaults=defaults,
    )
    return config_object
