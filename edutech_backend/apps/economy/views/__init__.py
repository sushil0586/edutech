from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPlatformAdmin, IsPlatformOrInstituteAdmin, IsStudent
from apps.accounts.scopes import (
    get_scoped_object_or_403,
    scope_queryset_for_institute,
    scope_student_profile_queryset,
    scope_student_queryset,
)
from apps.economy.models import (
    ContentAccessPolicy,
    PaymentOrder,
    ReferralProgram,
    RewardRule,
    StarLedger,
    StarPack,
    StudentRewardEvent,
    StudentUnlockState,
    SubscriptionPlan,
    UnlockRule,
)
from apps.economy.governance import (
    enforce_institute_admin_order_confirmation_policy,
    enforce_institute_admin_star_grant_policy,
    get_or_create_economy_operator_policy_config,
    get_economy_operator_policy,
)
from apps.economy.serializers import (
    AdminContentAccessPolicySerializer,
    AdminRewardRuleSerializer,
    AdminReferralProgramSerializer,
    AdminStarPackSerializer,
    AdminSubscriptionPlanSerializer,
    AdminUnlockRuleSerializer,
    AdminGrantStarsSerializer,
    ConfirmPaymentOrderSerializer,
    CreateStarPackOrderSerializer,
    CreateSubscriptionOrderSerializer,
    EconomyCatalogItemStatusUpdateSerializer,
    EconomyPolicyAuditLogSerializer,
    EconomyOperatorPolicyConfigSerializer,
    PaymentOrderSerializer,
    PaymentTransactionSerializer,
    SpendStarsForContentSerializer,
    StarLedgerSerializer,
    StarPackSerializer,
    StudentRewardEventSerializer,
    StudentSubscriptionSerializer,
    StudentEconomyProfileSerializer,
    StudentUnlockStateSerializer,
    SubscriptionPlanSerializer,
)
from apps.economy.services import (
    complete_payment_order,
    create_star_pack_payment_order,
    create_subscription_payment_order,
    evaluate_and_sync_unlock_state,
    get_or_create_student_economy_profile,
    grant_admin_stars,
    list_active_star_packs,
    list_active_subscription_plans,
    list_student_payment_orders,
    list_student_subscriptions,
    spend_stars_for_content,
)
from apps.reports.models import AuditLog
from apps.students.models import StudentProfile
from apps.reports.services import create_audit_log
from common.responses import action_response


ECONOMY_CATALOG_MODEL_MAP = {
    "reward_rule": RewardRule,
    "referral_program": ReferralProgram,
    "star_pack": StarPack,
    "subscription_plan": SubscriptionPlan,
}


def _serialize_economy_catalog_item(item_type, obj):
    institute_name = getattr(getattr(obj, "institute", None), "name", "")
    payload = {
        "id": str(obj.id),
        "item_type": item_type,
        "name": getattr(obj, "name", ""),
        "is_active": obj.is_active,
        "updated_at": obj.updated_at,
        "institute": str(obj.institute_id) if getattr(obj, "institute_id", None) else None,
        "institute_name": institute_name,
        "code": "",
        "secondary_label": "",
        "metric_label": "",
    }

    if item_type == "reward_rule":
        payload["secondary_label"] = (
            f"{obj.rule_type.replace('_', ' ')}"
            + (f" · {obj.subject.name}" if obj.subject_id else "")
        )
        payload["metric_label"] = f"{obj.stars_awarded} stars"
    elif item_type == "referral_program":
        payload["secondary_label"] = f"{obj.reward_side.replace('_', ' ')} reward"
        payload["metric_label"] = f"{obj.referrer_stars}/{obj.referee_stars} stars"
    elif item_type == "star_pack":
        payload["code"] = obj.code
        payload["secondary_label"] = f"{obj.currency} {obj.price_amount}"
        payload["metric_label"] = f"{obj.stars_credited} stars"
    elif item_type == "subscription_plan":
        payload["code"] = obj.code
        active_cycles = [cycle for cycle in obj.cycles.all() if cycle.is_active]
        payload["secondary_label"] = (
            f"{len(active_cycles)} active cycle{'s' if len(active_cycles) != 1 else ''}"
        )
        if active_cycles:
            cheapest_cycle = min(active_cycles, key=lambda cycle: cycle.price_amount)
            payload["metric_label"] = f"from {cheapest_cycle.currency} {cheapest_cycle.price_amount}"
        else:
            payload["metric_label"] = "No active cycle"
    return payload


def _economy_catalog_group_payload(*, item_type, queryset):
    model = ECONOMY_CATALOG_MODEL_MAP[item_type]
    total = model.objects.count()
    active = model.objects.filter(is_active=True).count()
    return {
        "item_type": item_type,
        "total": total,
        "active": active,
        "inactive": total - active,
        "items": [_serialize_economy_catalog_item(item_type, item) for item in queryset],
    }


class StudentWalletView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        profile = get_or_create_student_economy_profile(student)
        return Response(
            StudentEconomyProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class StudentLedgerView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StarLedger.objects.select_related("student", "created_by"),
                request.user,
            )
            .filter(is_active=True)
            .order_by("-effective_at", "-created_at")
        )
        return Response(StarLedgerSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class StudentRewardEventListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StudentRewardEvent.objects.select_related(
                    "student",
                    "reward_rule",
                    "ledger_entry",
                    "ledger_entry__created_by",
                ),
                request.user,
            )
            .filter(is_active=True)
            .order_by("-processed_at", "-created_at")
        )
        return Response(
            StudentRewardEventSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentUnlockStateListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        queryset = (
            scope_student_queryset(
                StudentUnlockState.objects.select_related("student", "subject", "granted_by"),
                request.user,
            )
            .filter(is_active=True)
            .order_by("content_type", "content_key")
        )
        return Response(
            StudentUnlockStateSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentStarPackListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_active_star_packs(institute=student.institute)
        return Response(StarPackSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class StudentSubscriptionPlanListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_active_subscription_plans(institute=student.institute)
        return Response(
            SubscriptionPlanSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentPaymentOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_student_payment_orders(student=student)
        return Response(
            PaymentOrderSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentSubscriptionListView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user.account_profile.student_profile
        queryset = list_student_subscriptions(student=student)
        return Response(
            StudentSubscriptionSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class StudentCreateStarPackOrderView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateStarPackOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        payment_order = create_star_pack_payment_order(
            student=student,
            star_pack=serializer.validated_data["star_pack"],
            provider_name=serializer.validated_data["provider_name"],
            provider_order_reference=serializer.validated_data["provider_order_reference"],
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data=PaymentOrderSerializer(payment_order).data,
            message="Star pack payment order created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StudentCreateSubscriptionOrderView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateSubscriptionOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        payment_order = create_subscription_payment_order(
            student=student,
            plan_cycle=serializer.validated_data["subscription_plan_cycle"],
            provider_name=serializer.validated_data["provider_name"],
            provider_order_reference=serializer.validated_data["provider_order_reference"],
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data=PaymentOrderSerializer(payment_order).data,
            message="Subscription payment order created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StudentSpendStarsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = SpendStarsForContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = request.user.account_profile.student_profile
        result = spend_stars_for_content(
            student=student,
            content_type=serializer.validated_data["content_type"],
            content_key=serializer.validated_data["content_key"],
            subject=serializer.validated_data.get("subject"),
            created_by=request.user,
        )

        return action_response(
            data={
                "spent_stars": result["spent_stars"],
                "message": result["message"],
                "ledger_entry": (
                    StarLedgerSerializer(result["ledger_entry"]).data
                    if result["ledger_entry"] is not None
                    else None
                ),
                "unlock_state": StudentUnlockStateSerializer(result["unlock_state"]).data,
            },
            message=result["message"],
            status_code=status.HTTP_200_OK,
        )


class AdminGrantStarsView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request):
        serializer = AdminGrantStarsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enforce_institute_admin_star_grant_policy(
            user=request.user,
            stars=serializer.validated_data["stars"],
        )

        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute", "program"),
                request.user,
            ),
            user=request.user,
            value=serializer.validated_data["student"],
            not_found_message="Student not found in your scope.",
        )

        ledger_entry = grant_admin_stars(
            student=student,
            stars=serializer.validated_data["stars"],
            reason=serializer.validated_data["reason"],
            created_by=request.user,
            source_reference=serializer.validated_data["source_reference"],
            metadata={"trigger": "admin_grant"},
        )

        return action_response(
            data=StarLedgerSerializer(ledger_entry).data,
            message="Stars granted successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminEconomyPolicyView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request):
        return Response(get_economy_operator_policy(user=request.user), status=status.HTTP_200_OK)


class AdminEconomyPolicyConfigView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        return Response(
            EconomyOperatorPolicyConfigSerializer(config_object).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        previous_state = {
            "institute_admin_can_confirm_orders": config_object.institute_admin_can_confirm_orders,
            "institute_admin_max_confirm_order_amount": str(config_object.institute_admin_max_confirm_order_amount),
            "institute_admin_confirm_order_currency": config_object.institute_admin_confirm_order_currency,
            "institute_admin_can_grant_stars": config_object.institute_admin_can_grant_stars,
            "institute_admin_max_grant_stars": config_object.institute_admin_max_grant_stars,
        }
        serializer = EconomyOperatorPolicyConfigSerializer(
            config_object,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_policy_update",
            entity_type="economy_operator_policy_config",
            entity_id=config_object.id,
            message="Economy operator policy updated.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=serializer.data,
            message="Economy operator policy updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminEconomyPolicyAuditListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        config_object = get_or_create_economy_operator_policy_config()
        queryset = (
            AuditLog.objects.filter(
                entity_type="economy_operator_policy_config",
                entity_id=str(config_object.id),
                is_active=True,
            )
            .select_related("user")
            .order_by("-created_at")[:20]
        )
        return Response(
            EconomyPolicyAuditLogSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminEconomyCatalogOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        reward_rules = RewardRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "name",
        )[:8]
        referral_programs = ReferralProgram.objects.select_related("institute").order_by(
            "institute__name",
            "name",
        )[:8]
        star_packs = StarPack.objects.select_related("institute").order_by(
            "institute__name",
            "sort_order",
            "price_amount",
            "name",
        )[:8]
        subscription_plans = SubscriptionPlan.objects.select_related("institute").prefetch_related(
            "cycles",
        ).order_by("institute__name", "name")[:8]

        return Response(
            {
                "reward_rules": _economy_catalog_group_payload(
                    item_type="reward_rule",
                    queryset=reward_rules,
                ),
                "referral_programs": _economy_catalog_group_payload(
                    item_type="referral_program",
                    queryset=referral_programs,
                ),
                "star_packs": _economy_catalog_group_payload(
                    item_type="star_pack",
                    queryset=star_packs,
                ),
                "subscription_plans": _economy_catalog_group_payload(
                    item_type="subscription_plan",
                    queryset=subscription_plans,
                ),
            },
            status=status.HTTP_200_OK,
        )


class AdminEconomyCatalogItemStatusView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, item_type, item_id):
        model = ECONOMY_CATALOG_MODEL_MAP.get(item_type)
        if model is None:
            return Response(
                {"detail": "Unsupported economy catalog item type."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EconomyCatalogItemStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance = get_scoped_object_or_403(
            model.objects.select_related("institute"),
            user=request.user,
            value=item_id,
            not_found_message="Economy catalog item not found.",
        )
        previous_state = instance.is_active
        instance.is_active = serializer.validated_data["is_active"]
        instance.save(update_fields=["is_active", "updated_at"])

        create_audit_log(
            user=request.user,
            action="economy_catalog_item_status_update",
            entity_type=item_type,
            entity_id=instance.id,
            message=f"Economy catalog item status updated for {instance.name}.",
            metadata={
                "before": {"is_active": previous_state},
                "after": {"is_active": instance.is_active},
                "item_name": instance.name,
            },
            request=request,
        )

        return action_response(
            data=_serialize_economy_catalog_item(item_type, instance),
            message="Economy catalog item status updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminStarPackListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = StarPack.objects.select_related("institute").order_by(
            "institute__name",
            "sort_order",
            "price_amount",
            "name",
        )
        return Response(
            AdminStarPackSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminStarPackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_star_pack_create",
            entity_type="star_pack",
            entity_id=instance.id,
            message=f"Star pack created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "code": instance.code,
                "stars_credited": instance.stars_credited,
                "price_amount": str(instance.price_amount),
                "currency": instance.currency,
            },
            request=request,
        )
        return action_response(
            data=AdminStarPackSerializer(instance).data,
            message="Star pack created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminStarPackDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, star_pack_id):
        instance = get_scoped_object_or_403(
            StarPack.objects.select_related("institute"),
            user=request.user,
            value=star_pack_id,
            not_found_message="Star pack not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "code": instance.code,
            "stars_credited": instance.stars_credited,
            "price_amount": str(instance.price_amount),
            "currency": instance.currency,
            "sort_order": instance.sort_order,
            "is_active": instance.is_active,
        }
        serializer = AdminStarPackSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_star_pack_update",
            entity_type="star_pack",
            entity_id=updated_instance.id,
            message=f"Star pack updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=serializer.data,
            message="Star pack updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminSubscriptionPlanListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = SubscriptionPlan.objects.select_related("institute").prefetch_related(
            "cycles__star_credit_rules",
        ).order_by("institute__name", "name")
        return Response(
            AdminSubscriptionPlanSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminSubscriptionPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        refreshed_instance = (
            SubscriptionPlan.objects.select_related("institute")
            .prefetch_related("cycles__star_credit_rules")
            .get(pk=instance.pk)
        )
        create_audit_log(
            user=request.user,
            action="economy_subscription_plan_create",
            entity_type="subscription_plan",
            entity_id=refreshed_instance.id,
            message=f"Subscription plan created: {refreshed_instance.name}.",
            metadata={
                "institute_id": str(refreshed_instance.institute_id),
                "code": refreshed_instance.code,
                "cycle_count": refreshed_instance.cycles.count(),
            },
            request=request,
        )
        return action_response(
            data=AdminSubscriptionPlanSerializer(refreshed_instance).data,
            message="Subscription plan created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminSubscriptionPlanDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, plan_id):
        instance = get_scoped_object_or_403(
            SubscriptionPlan.objects.select_related("institute").prefetch_related("cycles__star_credit_rules"),
            user=request.user,
            value=plan_id,
            not_found_message="Subscription plan not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "code": instance.code,
            "description": instance.description,
            "is_active": instance.is_active,
            "cycle_count": instance.cycles.count(),
        }
        serializer = AdminSubscriptionPlanSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        refreshed_instance = (
            SubscriptionPlan.objects.select_related("institute")
            .prefetch_related("cycles__star_credit_rules")
            .get(pk=updated_instance.pk)
        )
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in ("institute", "name", "code", "description", "is_active")
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        if "cycles" in request.data:
            changed_fields["cycle_count"] = {
                "before": previous_state["cycle_count"],
                "after": refreshed_instance.cycles.count(),
            }
        create_audit_log(
            user=request.user,
            action="economy_subscription_plan_update",
            entity_type="subscription_plan",
            entity_id=refreshed_instance.id,
            message=f"Subscription plan updated: {refreshed_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminSubscriptionPlanSerializer(refreshed_instance).data,
            message="Subscription plan updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminReferralProgramListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = ReferralProgram.objects.select_related("institute").order_by("institute__name", "name")
        return Response(
            AdminReferralProgramSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminReferralProgramSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_referral_program_create",
            entity_type="referral_program",
            entity_id=instance.id,
            message=f"Referral program created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "reward_side": instance.reward_side,
                "referrer_stars": instance.referrer_stars,
                "referee_stars": instance.referee_stars,
            },
            request=request,
        )
        return action_response(
            data=AdminReferralProgramSerializer(instance).data,
            message="Referral program created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminReferralProgramDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, program_id):
        instance = get_scoped_object_or_403(
            ReferralProgram.objects.select_related("institute"),
            user=request.user,
            value=program_id,
            not_found_message="Referral program not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "name": instance.name,
            "referrer_stars": instance.referrer_stars,
            "referee_stars": instance.referee_stars,
            "reward_side": instance.reward_side,
            "valid_from": instance.valid_from.isoformat() if instance.valid_from else None,
            "valid_until": instance.valid_until.isoformat() if instance.valid_until else None,
            "is_active": instance.is_active,
        }
        serializer = AdminReferralProgramSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_referral_program_update",
            entity_type="referral_program",
            entity_id=updated_instance.id,
            message=f"Referral program updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminReferralProgramSerializer(updated_instance).data,
            message="Referral program updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminRewardRuleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = RewardRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "name",
        )
        return Response(
            AdminRewardRuleSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminRewardRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_reward_rule_create",
            entity_type="reward_rule",
            entity_id=instance.id,
            message=f"Reward rule created: {instance.name}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "rule_type": instance.rule_type,
                "stars_awarded": instance.stars_awarded,
                "subject_id": str(instance.subject_id) if instance.subject_id else None,
            },
            request=request,
        )
        return action_response(
            data=AdminRewardRuleSerializer(instance).data,
            message="Reward rule created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminRewardRuleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, rule_id):
        instance = get_scoped_object_or_403(
            RewardRule.objects.select_related("institute", "subject"),
            user=request.user,
            value=rule_id,
            not_found_message="Reward rule not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "name": instance.name,
            "rule_type": instance.rule_type,
            "stars_awarded": instance.stars_awarded,
            "score_threshold_percentage": (
                str(instance.score_threshold_percentage)
                if instance.score_threshold_percentage is not None
                else None
            ),
            "completion_count_threshold": instance.completion_count_threshold,
            "streak_count_threshold": instance.streak_count_threshold,
            "priority": instance.priority,
            "valid_from": instance.valid_from.isoformat() if instance.valid_from else None,
            "valid_until": instance.valid_until.isoformat() if instance.valid_until else None,
            "is_active": instance.is_active,
        }
        serializer = AdminRewardRuleSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_reward_rule_update",
            entity_type="reward_rule",
            entity_id=updated_instance.id,
            message=f"Reward rule updated: {updated_instance.name}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminRewardRuleSerializer(updated_instance).data,
            message="Reward rule updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminContentAccessPolicyListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = ContentAccessPolicy.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "content_type",
            "content_key",
        )
        return Response(
            AdminContentAccessPolicySerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminContentAccessPolicySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_content_access_policy_create",
            entity_type="content_access_policy",
            entity_id=instance.id,
            message=f"Content access policy created for {instance.content_type}:{instance.content_key}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "policy_type": instance.policy_type,
                "star_cost": instance.star_cost,
                "entitlement_code": instance.entitlement_code,
            },
            request=request,
        )
        return action_response(
            data=AdminContentAccessPolicySerializer(instance).data,
            message="Content access policy created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminContentAccessPolicyDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, policy_id):
        instance = get_scoped_object_or_403(
            ContentAccessPolicy.objects.select_related("institute", "subject"),
            user=request.user,
            value=policy_id,
            not_found_message="Content access policy not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "content_type": instance.content_type,
            "content_key": instance.content_key,
            "content_label": instance.content_label,
            "policy_type": instance.policy_type,
            "star_cost": instance.star_cost,
            "entitlement_code": instance.entitlement_code,
            "priority": instance.priority,
            "is_active": instance.is_active,
        }
        serializer = AdminContentAccessPolicySerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_content_access_policy_update",
            entity_type="content_access_policy",
            entity_id=updated_instance.id,
            message=f"Content access policy updated for {updated_instance.content_type}:{updated_instance.content_key}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminContentAccessPolicySerializer(updated_instance).data,
            message="Content access policy updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminUnlockRuleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = UnlockRule.objects.select_related("institute", "subject").order_by(
            "institute__name",
            "priority",
            "content_type",
            "content_key",
        )
        return Response(
            AdminUnlockRuleSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AdminUnlockRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        create_audit_log(
            user=request.user,
            action="economy_unlock_rule_create",
            entity_type="unlock_rule",
            entity_id=instance.id,
            message=f"Unlock rule created for {instance.content_type}:{instance.content_key}.",
            metadata={
                "institute_id": str(instance.institute_id),
                "rule_type": instance.rule_type,
                "required_star_balance": instance.required_star_balance,
                "required_entitlement_code": instance.required_entitlement_code,
            },
            request=request,
        )
        return action_response(
            data=AdminUnlockRuleSerializer(instance).data,
            message="Unlock rule created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminUnlockRuleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def patch(self, request, rule_id):
        instance = get_scoped_object_or_403(
            UnlockRule.objects.select_related("institute", "subject"),
            user=request.user,
            value=rule_id,
            not_found_message="Unlock rule not found.",
        )
        previous_state = {
            "institute": str(instance.institute_id),
            "subject": str(instance.subject_id) if instance.subject_id else None,
            "content_type": instance.content_type,
            "content_key": instance.content_key,
            "content_label": instance.content_label,
            "rule_type": instance.rule_type,
            "required_star_balance": instance.required_star_balance,
            "required_entitlement_code": instance.required_entitlement_code,
            "required_completion_count": instance.required_completion_count,
            "required_score_percentage": (
                str(instance.required_score_percentage)
                if instance.required_score_percentage is not None
                else None
            ),
            "admin_override_allowed": instance.admin_override_allowed,
            "priority": instance.priority,
            "is_active": instance.is_active,
        }
        serializer = AdminUnlockRuleSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()
        changed_fields = {
            key: {
                "before": previous_state.get(key),
                "after": serializer.data.get(key),
            }
            for key in previous_state
            if str(previous_state.get(key)) != str(serializer.data.get(key))
        }
        create_audit_log(
            user=request.user,
            action="economy_unlock_rule_update",
            entity_type="unlock_rule",
            entity_id=updated_instance.id,
            message=f"Unlock rule updated for {updated_instance.content_type}:{updated_instance.content_key}.",
            metadata={"changed_fields": changed_fields},
            request=request,
        )
        return action_response(
            data=AdminUnlockRuleSerializer(updated_instance).data,
            message="Unlock rule updated successfully.",
            status_code=status.HTTP_200_OK,
        )


class AdminConfirmPaymentOrderView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request, order_id):
        serializer = ConfirmPaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_order = get_scoped_object_or_403(
            scope_queryset_for_institute(
                PaymentOrder.objects.select_related(
                    "student",
                    "star_pack",
                    "subscription_plan_cycle",
                    "subscription_plan_cycle__plan",
                ),
                request.user,
            ),
            user=request.user,
            value=order_id,
            not_found_message="Payment order not found in your scope.",
        )
        enforce_institute_admin_order_confirmation_policy(
            user=request.user,
            payment_order=payment_order,
        )

        result = complete_payment_order(
            payment_order=payment_order,
            provider_transaction_reference=serializer.validated_data["provider_transaction_reference"],
            created_by=request.user,
            metadata=serializer.validated_data.get("metadata") or {},
        )
        return action_response(
            data={
                "payment_order": PaymentOrderSerializer(result["payment_order"]).data,
                "payment_transaction": (
                    PaymentTransactionSerializer(result["payment_transaction"]).data
                    if result["payment_transaction"] is not None
                    else None
                ),
                "ledger_entry": (
                    StarLedgerSerializer(result["ledger_entry"]).data
                    if result["ledger_entry"] is not None
                    else None
                ),
                "student_subscription": (
                    StudentSubscriptionSerializer(result["student_subscription"]).data
                    if result["student_subscription"] is not None
                    else None
                ),
            },
            message=(
                "Payment order was already completed."
                if not result["created"]
                else "Payment order completed successfully."
            ),
            status_code=status.HTTP_200_OK,
        )


class AdminStudentWalletView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        profile = get_or_create_student_economy_profile(student)
        return Response(
            StudentEconomyProfileSerializer(profile).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentRewardEventListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        queryset = (
            StudentRewardEvent.objects.select_related(
                "student",
                "reward_rule",
                "ledger_entry",
                "ledger_entry__created_by",
            )
            .filter(student=student, is_active=True)
            .order_by("-processed_at", "-created_at")
        )
        return Response(
            StudentRewardEventSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentPaymentOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def get(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )
        queryset = list_student_payment_orders(student=student)
        return Response(
            PaymentOrderSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )


class AdminStudentUnlockRefreshView(APIView):
    permission_classes = [IsAuthenticated, IsPlatformOrInstituteAdmin]

    def post(self, request, student_id):
        student = get_scoped_object_or_403(
            scope_student_profile_queryset(
                StudentProfile.objects.select_related("institute"),
                request.user,
            ),
            user=request.user,
            value=student_id,
            not_found_message="Student not found in your scope.",
        )

        unlock_states = []
        existing_states = StudentUnlockState.objects.filter(student=student, is_active=True)
        for unlock_state in existing_states:
            refreshed = evaluate_and_sync_unlock_state(
                student=student,
                content_type=unlock_state.content_type,
                content_key=unlock_state.content_key,
                subject=unlock_state.subject,
                granted_by=request.user,
            )
            unlock_states.append(refreshed)

        return action_response(
            data=StudentUnlockStateSerializer(unlock_states, many=True).data,
            message="Unlock states refreshed successfully.",
            status_code=status.HTTP_200_OK,
        )
