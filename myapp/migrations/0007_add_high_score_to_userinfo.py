from django.db import migrations, models

def add_high_score(apps, schema_editor):
    UserInfo = apps.get_model('myapp', 'UserInfo')
    for user_info in UserInfo.objects.all():
        if user_info.high_score_titlegame is None:
            user_info.high_score_titlegame = 0  # Or set a default value
            user_info.save()

class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0006_newtable_books_userinfo_high_score_titlegame'),  # Replace with your last migration number
    ]

    operations = [
        migrations.AddField(
            model_name='userinfo',
            name='high_score_titlegame',
            field=models.IntegerField(default=0),
        ),
        migrations.RunPython(add_high_score),  # Set the default value for existing records
    ]
