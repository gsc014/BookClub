from django.db import models
from django.contrib.auth.models import User



class NewTable(models.Model):
    id = models.AutoField(primary_key=True)
    works_key = models.CharField(max_length=255)
    isbn_10 = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'new_table'
        managed = False


class Review(models.Model):
    id = models.AutoField(primary_key=True)
    book_id = models.IntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, null = True, blank = True)
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
    high_score_titlegame = models.IntegerField(default=0)

class UserBookList(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, blank = True, null = True)
    name = models.CharField(max_length=255)
    book_ids = models.JSONField(default=list)

class Books(models.Model):
    id = models.AutoField(primary_key=True)
    key = models.CharField(max_length=255, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    subjects = models.TextField(null=True, blank=True)
    author = models.CharField(max_length=255)
    cover = models.IntegerField(null=True, blank=True)
    first_published = models.IntegerField(null=True, blank=True)

class Author(models.Model):
    id = models.AutoField(primary_key=True)
    key = models.CharField(max_length=255, unique=True, db_index=True)
    name = models.CharField(max_length=255)

class RecommendedBooks(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, blank = True, null = True)
    book_id = models.IntegerField()
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    cover = models.IntegerField(null=True, blank=True)
    first_published = models.IntegerField(null=True, blank=True)