from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from .models import Work, Review, UserInfo, UserBookList
import random
from django.http import JsonResponse
from django.db import connections
from django.contrib.auth import logout as django_logout
from rest_framework.authtoken.models import Token
import logging

# Set up logging
logger = logging.getLogger(__name__)

@api_view(['GET'])
def profile(request):
    user = request.user  # Get the logged-in user
    
    if user.is_authenticated:
        # Accessing fields directly from the User model
        return Response({
            "id": user.id,
            "username": user.username,
            "last_login": user.last_login,
            "date_joined": user.date_joined,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            # Still include the bio from profile if it exists
            "bio": user.profile.bio if hasattr(user, 'profile') else "No bio available"
        })
    else:
        return Response({"error": "User not authenticated"}, status=401)

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

    # Create the new user
    user = User.objects.create_user(username=username, password=password1)
    
    # Log the user in
    login(request, user)
    
    # Create or get token for authentication
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
        books = Work.objects.using('open_lib').filter(title__iregex=r'\b' + query + r'\b')
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    return Response({"error": "No query provided"}, status=400)


@api_view(['GET'])
def random_book(request):
    # Get the 'num' parameter with a default value of 1
    num_books = request.GET.get('num', 1)
    
    # Convert to integer (since query params come as strings)
    try:
        num_books = int(num_books)
    except (TypeError, ValueError):
        num_books = 1  # Default if conversion fails
        
    print(f"Fetching {num_books} random books")
    
    # Rest of your function to fetch random books
    with connections['open_lib'].cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM works WHERE description IS NOT NULL")
        total_books = cursor.fetchone()[0]

        if total_books == 0:
            return JsonResponse({"error": "No books found"}, status=404)
            
        # Modified to fetch multiple books if requested
        books_data = []
        for _ in range(num_books):
            random_offset = random.randint(0, total_books - 1)
            cursor.execute(f"SELECT id, key, title, description, subjects, author, first_published FROM works WHERE description IS NOT NULL LIMIT 1 OFFSET {random_offset}")
            book = cursor.fetchone()
            
            if book:
                book_data = {
                    "id": book[0],
                    "key": book[1],
                    "title": book[2],
                    "description": book[3],
                    "subjects": book[4],
                    "author": book[5],
                    "first_published": book[6]
                }
                books_data.append(book_data)
        
        # Return a single book or a list depending on what was requested
        if num_books == 1 and books_data:
            return JsonResponse(books_data[0])
        else:
            return JsonResponse(books_data, safe=False)  # safe=False allows non-dict objects

@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Work.objects.using('open_lib').get(id=book_id)

        book_data = {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "author": book.author,
            "first_published": book.first_published,
            "subjects": book.subjects,
        }

        return Response(book_data)

    except Work.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_review(request, book_id1):
    user = request.user
    try:
        book = Work.objects.using("open_lib").get(id=book_id1)
        review_text = request.data.get("text")
        rating = request.data.get("rating")
        
        
        print("book is ", book, "and type", type(book), "with book_id1", book.id)

        review = Review.objects.create(
            text=review_text, rating=rating, book_id=book.id
        )

        return Response({"message": "Review added successfully!"}, status=201)

    except Work.DoesNotExist:
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
    # query = request.GET.get('query', '')
      
    # print("got query", query, "\n")
    # if not query:
    #     return Response([])

    # suggestions = Work.objects.using('open_lib').filter(title__icontains=query).values_list('title', flat=True)[:5]
    # return Response(suggestions)   
     # Change this to return both title and id as a list of dictionaries
    query = request.GET.get('query', '')
      
    print("got query", query, "\n")
    if not query:
        return Response([])

    # Change this to return both title and id as a list of dictionaries
    suggestions = Work.objects.using('open_lib').filter(title__icontains=query)[:5]
    
    # Format the results as a list of dictionaries with title and id
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
        books = Work.objects.using('open_lib').filter(subjects__icontains=subject_filter)
        
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    else:
        return Response({"error": "This shouldnt happen"}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    # if request.user.is_authenticated:
    django_logout(request)
    return Response({"message": "Successfully logged out"}, status=200)
    #     return Response({"message": "Successfully logged out"})
    # else:
    #     return Response({"message": "You weren't logged in"})


@api_view(['GET'])
def check_auth(request):
    """Check if the user is authenticated"""
    print("Session key in check_auth:", request.session.session_key)
    print("User authenticated:", request.user.is_authenticated)
    print("Cookies received:", request.COOKIES)
    
    if request.user.is_authenticated:
        return Response({
            "authenticated": True, 
            "username": request.user.username,
            "session_key": request.session.session_key
        })
    return Response({
        "authenticated": False,
        "received_cookies": bool(request.COOKIES),
        "session_key_present": bool(request.session.session_key)
    })

def create_userinfo():
    user_info = UserInfo.objects.create(
        user_id=get_object_or_404(User, id = 1),
        bio="I am a software developer",
        location="Nairobi, Kenya",
        birth_date="1995-01-01"
    )
    print("I HAVE MADE THA USER")
    return user_info

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request, username):
     # Get the requested user or return a generic "not found" response
    try:
        profile_user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)  # Generic error to prevent enumeration

    # Get the requested user or return 404 if not found
    # profile_user = get_object_or_404(User, username=username)
    # print("profile_user", profile_user, profile_user.id)
    # user_info = get_object_or_404(UserInfo, user_id=profile_user.id)
    # bio = 'No bio available'
    # location = 'No location available'
    # birth_date = 'No birth date available'
    # try:
    #     user_info = UserInfo.objects.get(user_id=profile_user.id)
    #     username = profile_user.username
    #     bio = user_info.bio
    #     location = user_info.location
    #     birth_date = user_info.birth_date
    # except UserInfo.DoesNotExist:
    #     pass
      # Default values for user info fields
    bio, location, birth_date = "No bio available", "No location available", "No birth date available"
    user_info = UserInfo.objects.filter(user_id=profile_user.id).first()
    if user_info:
        bio, location, birth_date = user_info.bio, user_info.location, user_info.birth_date

    # print(user_info)
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
        print("Book already in list")
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
        book = Work.objects.using('open_lib').get(id=book_id)
    except Work.DoesNotExist:
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
            book = Work.objects.using('open_lib').get(id=book_id)

            book_data = {
                "id": book.id,
                "key": book.key,
                "title": book.title,
            }

            goth_mommy.append(book_data)

        except Work.DoesNotExist:
            pass
    return Response(goth_mommy)
