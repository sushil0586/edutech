from rest_framework import serializers

from apps.institutes.models import Institute


class InstituteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institute
        fields = "__all__"
