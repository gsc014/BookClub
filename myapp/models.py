from django.db import models
from django.contrib.auth.models import User

class Work(models.Model):
    id = models.AutoField(primary_key=True)
    key = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    subjects = models.TextField(null=True, blank=True)
    author = models.CharField(max_length=255)
    first_published = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.title

    class Meta:
        managed = False  # Django won't manage migrations
        db_table = 'works'  # Table name in open_lib.db


class Review(models.Model):
    id = models.AutoField(primary_key=True)
    book_id = models.IntegerField()
    text = models.TextField()
    rating = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

class UserInfo(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, blank = True, null = True)
    bio = models.TextField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

class UserBookList(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, blank = True, null = True)
    name = models.CharField(max_length=255)
    book_ids = models.JSONField(default=list)
