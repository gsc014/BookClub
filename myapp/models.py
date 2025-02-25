from django.db import models

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

