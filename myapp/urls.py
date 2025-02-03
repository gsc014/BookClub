from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import login_user


urlpatterns = [
    path('profile/', views.profile, name='profile_api'),
    path('settings/', views.settings, name='settings_api'),
    path('', views.home, name='home'),
    path('api/login/', login_user, name='login_user'),
        

    # path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    # path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    # path('profile/', views.profile, name='profile'),
    # path('settings/', views.settings, name='settings'),
]