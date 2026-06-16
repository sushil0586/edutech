from django.urls import path

from apps.economy.views import (
    AdminConfirmPaymentOrderView,
    AdminGrantStarsView,
    AdminStudentRewardEventListView,
    AdminStudentUnlockRefreshView,
    AdminStudentWalletView,
    StudentCreateStarPackOrderView,
    StudentCreateSubscriptionOrderView,
    StudentLedgerView,
    StudentPaymentOrderListView,
    StudentRewardEventListView,
    StudentSpendStarsView,
    StudentStarPackListView,
    StudentSubscriptionListView,
    StudentSubscriptionPlanListView,
    StudentUnlockStateListView,
    StudentWalletView,
)

app_name = "economy"

urlpatterns = [
    path("wallet/", StudentWalletView.as_view(), name="student-wallet"),
    path("ledger/", StudentLedgerView.as_view(), name="student-ledger"),
    path("rewards/", StudentRewardEventListView.as_view(), name="student-rewards"),
    path("unlocks/", StudentUnlockStateListView.as_view(), name="student-unlocks"),
    path("star-packs/", StudentStarPackListView.as_view(), name="student-star-packs"),
    path("subscription-plans/", StudentSubscriptionPlanListView.as_view(), name="student-subscription-plans"),
    path("orders/", StudentPaymentOrderListView.as_view(), name="student-orders"),
    path("orders/star-pack/", StudentCreateStarPackOrderView.as_view(), name="student-create-star-pack-order"),
    path(
        "orders/subscription/",
        StudentCreateSubscriptionOrderView.as_view(),
        name="student-create-subscription-order",
    ),
    path("subscriptions/", StudentSubscriptionListView.as_view(), name="student-subscriptions"),
    path("spend-stars/", StudentSpendStarsView.as_view(), name="student-spend-stars"),
    path("admin/grant-stars/", AdminGrantStarsView.as_view(), name="admin-grant-stars"),
    path(
        "admin/orders/<uuid:order_id>/confirm/",
        AdminConfirmPaymentOrderView.as_view(),
        name="admin-confirm-payment-order",
    ),
    path("admin/student/<uuid:student_id>/wallet/", AdminStudentWalletView.as_view(), name="admin-student-wallet"),
    path(
        "admin/student/<uuid:student_id>/rewards/",
        AdminStudentRewardEventListView.as_view(),
        name="admin-student-rewards",
    ),
    path(
        "admin/student/<uuid:student_id>/refresh-unlocks/",
        AdminStudentUnlockRefreshView.as_view(),
        name="admin-student-refresh-unlocks",
    ),
]
