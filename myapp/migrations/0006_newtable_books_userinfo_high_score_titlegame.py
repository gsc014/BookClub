# Generated by Django 5.1.4 on 2025-04-07 12:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0005_userbooklist'),
    ]

    operations = [
        migrations.CreateModel(
            name='NewTable',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('works_key', models.CharField(max_length=255)),
                ('isbn_10', models.CharField(max_length=255)),
            ],
            options={
                'db_table': 'new_table',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Books',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('key', models.CharField(db_index=True, max_length=255, unique=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('subjects', models.TextField(blank=True, null=True)),
                ('author', models.CharField(max_length=255)),
                ('cover', models.IntegerField(blank=True, null=True)),
                ('first_published', models.IntegerField(blank=True, null=True)),
            ],
        ),
        migrations.AddField(
            model_name='userinfo',
            name='high_score_titlegame',
            field=models.IntegerField(default=0),
        ),
    ]
