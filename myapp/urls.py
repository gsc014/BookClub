from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import login_user, signup_user, random_book, search_books, retrieve_book_info, add_review, get_reviews, autocomplete, search_filter, high_score


urlpatterns = [
    # Add the new username-based profile route
    path('api/profile/<str:username>/', views.user_profile, name='user_profile'),
    
    # Your other existing URL patterns
    # path('api/settings/', views.settings, name='settings_api'),
    path('api/login/', login_user, name='login_user'),
    path('api/signup/', signup_user, name='signup_user'),
    path('random-book/', random_book, name='random_book'),
    path('api/recommended-book/', views.recommended_book, name='random_book_api'),
    path('api/search/', search_books, name='search_books'),
    path('api/book/<int:book_id>/', retrieve_book_info, name='retrieve_book_info'),
    path('api/reviewtest/<int:book_id1>/', add_review, name='add_review'),
    path('api/reviews/<int:bid>/', get_reviews, name='get_reviews'),
    path('api/autocomplete/', autocomplete, name='autocomplete'),
    path('api/filter/', search_filter, name='search_filter'),
    path('api/logout/', views.logout_user, name='logout_user'),
    path('api/update-username/', views.update_username, name='update_username'),
    path('api/update-password/', views.update_password, name='update_password'),
    path('api/update-email/', views.update_email, name='update_email'),
    path('api/delete-account/', views.delete_account, name='delete_account'),
    path('api/update-profile/', views.update_profile, name='update_profile'),
    path('api/add-book/<int:book_id>/', views.add_book, name='add_book'),
    path('api/block-genres/', views.block_genre, name='block_genre'),
    path('api/unblock-genre/', views.unblock_genre, name='unblock_genre'),
    path('api/blocked-genres/', views.get_blocked_genres, name='blocked_genres'),
    path('api/book-list/', views.get_saved_books, name='book_list'),
    path('api/isbn/<str:work_key>', views.getisbn, name='isbn'),
    path('api/books_by_author/', views.get_books_by_author, name='books_by_author'),
    path('api/autocomplete-profile/', views.autocomplete_profile, name='autocomplete_profile'),
    path('api/high-score/', high_score, name='high_score'),
    path('highest-rated/', views.highest_rated_books, name='highest-rated'),
    path('most-liked/', views.most_liked_books, name='most-liked'),
    path('most-active-users/', views.most_active_users, name='most-active-users'),
]