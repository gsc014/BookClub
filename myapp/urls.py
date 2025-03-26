from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import login_user, signup_user, random_book, search_books, retrieve_book_info, add_review, get_reviews, autocomplete, search_filter


urlpatterns = [
    # Keep the existing profile route for backward compatibility
    path('profile/', views.profile, name='profile_api'),
    
    # Add the new username-based profile route
    path('api/profile/<str:username>/', views.user_profile, name='user_profile'),
    
    # Your other existing URL patterns
    # path('api/settings/', views.settings, name='settings_api'),
    path('api/login/', login_user, name='login_user'),
    path('api/signup/', signup_user, name='signup_user'),
    path('random-book/', random_book, name='random_book'),
    path('api/search/', search_books, name='search_books'),
    path('api/book/<int:book_id>/', retrieve_book_info, name='retrieve_book_info'),
    path('api/reviewtest/<int:book_id1>/', add_review, name='add_review'),
    path('api/reviews/<int:bid>/', get_reviews, name='get_reviews'),
    path('api/autocomplete/', autocomplete, name='autocomplete'),
    path('api/filter/', search_filter, name='search_filter'),
    path('api/logout/', views.logout_user, name='logout_user'),
    path('api/check-auth/', views.check_auth, name='check_auth'),
    path('api/update-username/', views.update_username, name='update_username'),
    path('api/update-password/', views.update_password, name='update_password'),
    path('api/delete-account/', views.delete_account, name='delete_account'),
    path('api/update-profile/', views.update_profile, name='update_profile'),
    path('api/add-book/<int:book_id>/', views.add_book, name='add_book'),
    path('api/book-list/', views.get_saved_books, name='book_list'),
]