from django.db import models

from common.models import BaseModel


class Institute(BaseModel):
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    logo = models.FileField(upload_to="institutes/logos/", blank=True, null=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["city", "state", "country"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
