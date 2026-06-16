from django.core.exceptions import ValidationError
from django.db import models

from common.models import BaseModel


class Country(BaseModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["code"], name="unique_country_code"),
            models.UniqueConstraint(fields=["name"], name="unique_country_name"),
        ]
        indexes = [
            models.Index(fields=["sort_order", "name"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        self.name = (self.name or "").strip()
        self.code = (self.code or "").strip().upper()
        if not self.name:
            raise ValidationError({"name": "Country name is required."})
        if not self.code:
            raise ValidationError({"code": "Country code is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class State(BaseModel):
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="states",
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["country__sort_order", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["country", "code"], name="unique_state_code_per_country"),
            models.UniqueConstraint(fields=["country", "name"], name="unique_state_name_per_country"),
        ]
        indexes = [
            models.Index(fields=["country", "sort_order", "name"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        self.name = (self.name or "").strip()
        self.code = (self.code or "").strip().upper()
        if not self.name:
            raise ValidationError({"name": "State name is required."})
        if not self.code:
            raise ValidationError({"code": "State code is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class City(BaseModel):
    state = models.ForeignKey(
        State,
        on_delete=models.CASCADE,
        related_name="cities",
    )
    name = models.CharField(max_length=100)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["state__sort_order", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["state", "name"], name="unique_city_name_per_state"),
        ]
        indexes = [
            models.Index(fields=["state", "sort_order", "name"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        self.name = (self.name or "").strip()
        if not self.name:
            raise ValidationError({"name": "City name is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class PostalCode(BaseModel):
    city = models.ForeignKey(
        City,
        on_delete=models.CASCADE,
        related_name="postal_codes",
    )
    code = models.CharField(max_length=20)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["city__sort_order", "sort_order", "code"]
        constraints = [
            models.UniqueConstraint(fields=["city", "code"], name="unique_postal_code_per_city"),
        ]
        indexes = [
            models.Index(fields=["city", "sort_order", "code"]),
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def clean(self):
        super().clean()
        self.code = (self.code or "").strip()
        if not self.code:
            raise ValidationError({"code": "Postal code is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} · {self.city.name}"
