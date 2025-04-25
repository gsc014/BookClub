from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from .models import Review, UserInfo, UserBookList, NewTable, Books
import random
from django.http import JsonResponse
from django.db import connections
from django.contrib.auth import logout as django_logout
from rest_framework.authtoken.models import Token
import logging

# Set up logging
logger = logging.getLogger(__name__)

@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"Login attempt for user: {username}")
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        login(request, user)
        
        # Create or get token for authentication
        token, _ = Token.objects.get_or_create(user=user)
        
        print(f"Login successful for {username}, token: {token.key}")
        
        return Response({
            "message": "Login successful", 
            "username": user.username,
            "authenticated": True,
            "token": token.key
        })
    else:
        print(f"Invalid credentials for {username}")
        return Response({"error": "Invalid credentials", "authenticated": False}, status=400)


@api_view(['POST'])
def signup_user(request):
    username = request.data.get('username')
    password1 = request.data.get('password1')
    password2 = request.data.get('password2')

    if not username or not password1 or not password2:
        return Response({"error": "All fields are required."}, status=400)

    if password1 != password2:
        return Response({"error": "Passwords do not match."}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already taken."}, status=400)

    user = User.objects.create_user(username=username, password=password1)
    
    login(request, user)
    
    token, _ = Token.objects.get_or_create(user=user)
    
    print(f"Signup successful for {username}, token: {token.key}")
    
    return Response({
        "message": "Signup successful!",
        "username": user.username,
        "authenticated": True,
        "token": token.key
    })


@api_view(['GET'])
def search_books(request):
    print("getting request", request.GET)
    query = request.GET.get('q', '')
    if query:
        books = Books.objects.filter(title__iregex=r'\b' + query + r'\b')
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    return Response({"error": "No query provided"}, status=400)

@api_view(['GET'])
def random_book(request):
    try:
        num_books = int(request.GET.get('num', 1))
    except (TypeError, ValueError):
        num_books = 1

    # Filter only books that have a description
    books_qs = Books.objects.filter(description__isnull=False)

    # Get all valid IDs (filtered, sparse-safe)
    all_ids = list(books_qs.values_list('id', flat=True))

    # if not all_ids:
    #     return Response({"error": "No books found"}, status=404)

    # Randomly pick N unique IDs
    random_ids = random.sample(all_ids, min(num_books, len(all_ids)))

    # Fetch the books with those IDs
    selected_books = books_qs.filter(id__in=random_ids)

    books_data = [
        {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "subjects": book.subjects,
            "author": book.author,
            "first_published": book.first_published
        }
        for book in selected_books
    ]

    return Response(books_data)

@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Books.objects.get(id=book_id)

        book_data = {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "author": book.author,
            "first_published": book.first_published,
            "subjects": book.subjects,
            "cover": book.cover
            
        }

        return Response(book_data)

    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_review(request, book_id1):
    user = request.user
    try:
        book = Books.objects.get(id=book_id1)
        review_text = request.data.get("text")
        rating = request.data.get("rating")
        
        
        print("book is ", book, "and type", type(book), "with book_id1", book.id)

        review = Review.objects.create(
            text=review_text, rating=rating, book_id=book.id
        )

        return Response({"message": "Review added successfully!"}, status=201)

    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_reviews(request, bid):
    try:
        reviews = Review.objects.filter(book_id=bid)
        
        if not reviews.exists():
            return Response({'message':'No reviews available.'},status=204)
        
        results = [{"rating": review.rating, "text": review.text, "creation_date": review.created_at} for review in reviews]
        return Response(results)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def autocomplete(request):  
    query = request.GET.get('query', '')
      
    print("got query", query, "\n")
    if not query:
        return Response([])

    suggestions = Books.objects.filter(title__icontains=query)[:5]
    
    formatted_suggestions = [
        {'id': book.id, 'title': book.title} 
        for book in suggestions
    ]
    
    print("suggestions", formatted_suggestions)
    return Response(formatted_suggestions)


@api_view(['GET'])
def search_filter(request):
    subject_filter = request.GET.get('filter', '')

    if subject_filter:
        books = Books.objects.filter(subjects__icontains=subject_filter)
        
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    else:
        return Response({"error": "This shouldnt happen"}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    django_logout(request)
    return Response({"message": "Successfully logged out"}, status=200)


@api_view(['GET'])
def getisbn(request,work_key):
    '''get that isbn from newtable'''
    isbn = NewTable.objects.filter(works_key=work_key).first()
    
    return Response(isbn.isbn_10)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request, username):
     # Get the requested user or return a generic "not found" response
    try:
        profile_user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)  # Generic error to prevent enumeration

      # Default values for user info fields
    bio, location, birth_date = "No bio available", "No location available", "No birth date available"
    user_info = UserInfo.objects.filter(user_id=profile_user.id).first()
    if user_info:
        bio, location, birth_date = user_info.bio, user_info.location, user_info.birth_date

    # Check if the request user is viewing their own profile
    is_own_profile = request.user.is_authenticated and request.user.username == username
    
    # Base profile information that's public
    profile_data = {
        "id": profile_user.id,
        "username": profile_user.username,
        "date_joined": profile_user.date_joined,
        # Include the bio from profile if it exists
        "bio": bio,
        "location": location,
        "birth_date": birth_date,
    }
    
        
        # Add private information only if user is viewing their own profile
    if is_own_profile:
        profile_data.update({
            "last_login": profile_user.last_login,
            "email": profile_user.email,
            "is_staff": profile_user.is_staff,
            "is_superuser": profile_user.is_superuser,
        })

    return Response(profile_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    bio = request.data.get('bio')
    location = request.data.get('location')
    birth_date = request.data.get('birth_date')
    
    try:
        # Try to get existing UserInfo
        user_info, created = UserInfo.objects.get_or_create(user_id=user)
        
        # Update fields
        if bio is not None:
            user_info.bio = bio
        if location is not None:
            user_info.location = location
        if birth_date is not None:
            user_info.birth_date = birth_date
            
        user_info.save()
        
        return Response({
            "message": "Profile updated successfully",
            "bio": user_info.bio,
            "location": user_info.location,
            "birth_date": user_info.birth_date
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_username(request):
    user = request.user
    new_username = request.data.get('new_username')
    
    if not new_username:
        return Response({"error": "New username is required"}, status=400)
    
    # Check if username is already taken
    if User.objects.filter(username=new_username).exists():
        return Response({"error": "Username already taken"}, status=400)
    
    # Update username
    user.username = new_username
    user.save()
    
    # Create new token (invalidates old one)
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    
    return Response({
        "message": "Username updated successfully", 
        "username": user.username,
        "token": token.key
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_password(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({"error": "Both current and new passwords are required"}, status=400)
    
    # Check current password
    if not check_password(current_password, user.password):
        return Response({"error": "Current password is incorrect"}, status=400)
    
    # Update password
    user.set_password(new_password)
    user.save()
    
    # Create new token (invalidates old one)
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    
    return Response({
        "message": "Password updated successfully",
        "token": token.key
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_email(request):
    user = request.user
    new_email = request.data.get('new_email')
    
    if not new_email:
        return Response({"error": "New email is required"}, status=400)
    
    # Check if email is already taken
    if User.objects.filter(email=new_email).exists():
        return Response({"error": "Email already taken"}, status=400)
    
    # Update email
    user.email = new_email
    user.save()
    
    return Response({
        "message": "Email updated successfully",
        "email": user.email
    })



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    username = user.username
    
    # Delete the user
    user.delete()
    
    return Response({
        "message": f"Account '{username}' has been deleted successfully"
    })

# will make a list or get a list if it already exists
def make_list(user, list_name):
    try:
        # Look for a "Saved Books" list specifically
        book_list = UserBookList.objects.get(user_id=user, name= list_name)
    except UserBookList.DoesNotExist:
        # Create a new "Saved Books" list if it doesn't exist
        book_list = UserBookList.objects.create(user_id=user, name= list_name)
    return book_list

def add_to_list(book_id, book_list):
    # Check if the book is already in the list to avoid duplicates
    if int(book_id) not in book_list.book_ids:
        book_list.book_ids.append(int(book_id))
        book_list.save()
        return Response({"status": "success", "message": "Book saved successfully"}, status=200)
    else:
        book_list.book_ids.remove(int(book_id))
        book_list.save()
        return Response({"status": "removed", "message": "Book was removed"}, status=200)

    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_book(request, book_id):
    print("in add book")
    list_name = request.query_params.get('name')
    valid_list_names = ["Saved Books", "Liked Books"]
    if list_name not in valid_list_names:
        return Response({
            "error": f"Invalid list name. Must be one of: {', '.join(valid_list_names)}"
        }, status=400)
    
    try:
        book = Books.objects.get(id=book_id)
    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)
    
    
    user = request.user
    book_list = make_list(user, list_name)
    
    return add_to_list(book_id, book_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_books(request):
    user = request.user
    book_list = get_object_or_404(UserBookList, user_id=user, name=request.query_params['name'])
    
    goth_mommy = []
    for book_id in book_list.book_ids:
        try:
            book = Books.objects.get(id=book_id)

            book_data = {
                "id": book.id,
                "key": book.key,
                "title": book.title,
            }

            goth_mommy.append(book_data)

        except Books.DoesNotExist:
            pass
    return Response(goth_mommy)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def high_score(request):
    user = request.user

    if request.method == 'GET':
        # Retrieve the user's high score
        user_info = UserInfo.objects.filter(user_id=user).first()
        high_score = user_info.high_score_titlegame if user_info else 0
        return Response({"high_score": high_score})

    elif request.method == 'POST':
        # Update the user's high score if the new score is higher
        new_score = request.data.get('high_score', 0)
        try:
            user_info, created = UserInfo.objects.get_or_create(user_id=user)
            if new_score > user_info.high_score_titlegame:
                user_info.high_score_titlegame = new_score
                user_info.save()
                return Response({"message": "High score updated", "high_score": user_info.high_score_titlegame}, status=200)
            else:
                return Response({"message": "High score not beaten", "high_score": user_info.high_score_titlegame}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
