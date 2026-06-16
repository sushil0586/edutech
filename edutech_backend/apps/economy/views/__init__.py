from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPlatformOrInstituteAdmin, IsStudent
from apps.accounts.scopes import (
    get_scoped_object_or_403,
    scope_queryset_for_institute,
    scope_student_profile_queryset,
    scope_student_queryset,
)
from apps.economy.models import PaymentOrder, StarLedger, StudentRewardEvent, StudentUnlockState
from apps.economy.serializers import (
    AdminGrantStarsSerializer,
    ConfirmPaymentOrderSerializer,
    CreateStarPackOrderSerializer,
    CreateSubscriptionOrderSerializer,
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
from apps.students.models import StudentProfile
from common.responses import action_response


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
