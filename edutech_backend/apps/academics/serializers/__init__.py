from rest_framework import serializers

from apps.academics.models import AcademicYear, Cohort, OptionCatalogEntry, Program, Subject, Topic


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = "__all__"


class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = "__all__"


class CohortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cohort
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = "__all__"


class OptionCatalogEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionCatalogEntry
        fields = "__all__"
