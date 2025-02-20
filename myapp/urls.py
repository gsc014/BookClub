from django.urls import path
from . import views
from .views import login_user, signup_user, random_book, search_books, profile, settings


urlpatterns = [
    path('profile/', profile, name='profile_api'),
    path('api/settings/', settings, name='settings_api'),
    # path('', views.home, name='home'),
    path('api/login/', login_user, name='login_user'),
    path('api/signup/', signup_user, name='signup_user'),
    path('random-book/', random_book, name='random_book'),
    path('api/search/', search_books, name='search_books'),
]