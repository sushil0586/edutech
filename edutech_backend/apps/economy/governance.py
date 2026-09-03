from decimal import Decimal, InvalidOperation

from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import AccountRole
from apps.accounts.policies import has_active_role


def _account_profile(user):
    return getattr(user, "account_profile", None)


def is_platform_admin(user) -> bool:
    profile = _account_profile(user)
    return has_active_role(profile, AccountRole.PLATFORM_ADMIN)


def is_institute_admin(user) -> bool:
    profile = _account_profile(user)
    return has_active_role(profile, AccountRole.INSTITUTE_ADMIN)


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
            "role": AccountRole.PLATFORM_ADMIN,
            "can_grant_stars": True,
            "max_grant_stars": None,
            "can_confirm_orders": True,
            "max_confirm_order_amount": None,
            "max_confirm_order_currency": None,
            "catalog_governance_scope": policy.platform_catalog_governance_scope,
            "support_scope": policy.platform_support_scope,
            "config_source": "database",
        }

    if is_institute_admin(user):
        return {
            "role": AccountRole.INSTITUTE_ADMIN,
            "can_grant_stars": bool(policy.institute_admin_can_grant_stars),
            "max_grant_stars": int(policy.institute_admin_max_grant_stars),
            "can_confirm_orders": bool(policy.institute_admin_can_confirm_orders),
            "max_confirm_order_amount": f"{_max_confirm_order_amount():.2f}",
            "max_confirm_order_currency": policy.institute_admin_confirm_order_currency,
            "catalog_governance_scope": policy.institute_catalog_governance_scope,
            "support_scope": policy.institute_support_scope,
            "config_source": "database",
        }

    raise PermissionDenied("You do not have permission to access economy operator policy.")


def get_or_create_economy_operator_policy_config():
    from apps.economy.models import EconomyOperatorPolicyConfig

    config_object, _ = EconomyOperatorPolicyConfig.objects.get_or_create(singleton_key="default")
    return config_object
