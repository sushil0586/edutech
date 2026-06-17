from rest_framework import serializers

from apps.academics.models import AcademicYear, Cohort, OptionCatalogEntry, Program, Subject, Topic


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class AcademicYearListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = (
            "id",
            "institute",
            "name",
            "start_date",
            "end_date",
            "is_current",
            "is_active",
        )
        read_only_fields = fields


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = "__all__"


class ProgramListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = (
            "id",
            "institute",
            "name",
            "code",
            "category",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = "__all__"


class CohortListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = (
            "id",
            "institute",
            "program",
            "academic_year",
            "name",
            "code",
            "capacity",
            "is_active",
        )
        read_only_fields = fields


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class SubjectListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = (
            "id",
            "institute",
            "program",
            "name",
            "code",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = "__all__"


class TopicListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = (
            "id",
            "institute",
            "subject",
            "parent_topic",
            "name",
            "code",
            "difficulty_level",
            "sort_order",
            "is_active",
        )
        read_only_fields = fields


class OptionCatalogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionCatalogEntry
        fields = "__all__"


class OptionCatalogEntryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionCatalogEntry
        fields = (
            "id",
            "namespace",
            "code",
            "label",
            "description",
            "sort_order",
            "is_default",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
