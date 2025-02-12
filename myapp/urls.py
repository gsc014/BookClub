from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import login_user, signup_user, random_book


urlpatterns = [
    path('profile/', views.profile, name='profile_api'),
    # path('settings/', views.settings, name='settings_api'),
    # path('', views.home, name='home'),
    path('api/login/', login_user, name='login_user'),
    path('api/signup/', signup_user, name='signup_user'),
    path('random-book/', random_book, name='random_book'),
]