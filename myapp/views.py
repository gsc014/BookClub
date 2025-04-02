from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from .models import Review, UserInfo, UserBookList, Books
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
        # Use Books model from the default database
        books = Books.objects.filter(title__iregex=r'\b' + query + r'\b')
        
        # Make sure the field names match your Books model
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
    
    try:
        # Use a more reliable method to get random books
        # This avoids indexing issues and is more efficient
        random_books = list(Books.objects
                        .exclude(description__isnull=True)
                        .exclude(description='')
                        .exclude(cover__isnull=True)
                        .order_by('?')[:num_books])
        
        books_data = []
        for book in random_books:
            book_data = {
                "id": book.id,
                "key": book.key if hasattr(book, 'key') else None,
                "title": book.title,
                "description": book.description,
                "subjects": book.subjects if hasattr(book, 'subjects') else None,
                "author": book.author,
                "first_published": book.first_published if hasattr(book, 'first_published') else None,
                "cover": book.cover if hasattr(book, 'cover') else None
            }
            books_data.append(book_data)
        
        # Return a single book or a list depending on what was requested
        if num_books == 1 and books_data:
            return JsonResponse(books_data[0])
        else:
            return JsonResponse(books_data, safe=False)
    
    except Exception as e:
        print(f"Error in random_book: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

# @api_view(['GET'])
# def recommended_books(request):
#     """Get personalized book recommendations for the authenticated user."""
#     user = request.user
#     num_books = int(request.GET.get('num', 6))
    
#     if not user.is_authenticated:
#         # For non-authenticated users, get random books directly
#         try:
#             # Use the same logic as random_book but don't call the view function
#             random_books = list(Books.objects
#                             .exclude(description__isnull=True)
#                             .exclude(description='')
#                             .exclude(cover__isnull=True)
#                             .order_by('?')[:num_books])
            
#             books_data = []
#             for book in random_books:
#                 book_data = {
#                     "id": book.id,
#                     "key": book.key if hasattr(book, 'key') else None,
#                     "title": book.title,
#                     "description": book.description,
#                     "subjects": book.subjects if hasattr(book, 'subjects') else None,
#                     "author": book.author,
#                     "first_published": book.first_published if hasattr(book, 'first_published') else None,
#                     "cover": book.cover if hasattr(book, 'cover') else None
#                 }
#                 books_data.append(book_data)
            
#             return JsonResponse(books_data, safe=False)
        
#         except Exception as e:
#             print(f"Error in recommended_books (random fallback): {str(e)}")
#             return JsonResponse({"error": str(e)}, status=500)
    
#     try:
#         # Rest of your existing code for authenticated users...
#         # 1. First tier: Find books similar to highly rated books by the user
#         user_reviews = Review.objects.filter(user_id=user.id, rating__gte=4).values_list('book_id', flat=True)
        
#         # If user has rated books, find similar books by genre/subjects
#         if user_reviews:
#             # Get genres/subjects from highly rated books
#             liked_books = Books.objects.filter(id__in=user_reviews)
#             liked_subjects = []
#             for book in liked_books:
#                 if book.subjects:
#                     # Assuming subjects are stored as comma-separated values or can be parsed
#                     subjects = book.subjects.split(',') if isinstance(book.subjects, str) else []
#                     liked_subjects.extend(subjects)
            
#             # Weight subjects by frequency
#             subject_counts = {}
#             for subject in liked_subjects:
#                 subject = subject.strip()
#                 subject_counts[subject] = subject_counts.get(subject, 0) + 1
            
#             # Get top subjects
#             top_subjects = sorted(subject_counts.items(), key=lambda x: x[1], reverse=True)[:5]
#             top_subject_names = [s[0] for s in top_subjects]
            
#             # Find books with similar subjects, excluding already rated books
#             recommended = []
#             for subject in top_subject_names:
#                 similar_books = Books.objects.filter(subjects__icontains=subject)\
#                                      .exclude(id__in=user_reviews)\
#                                      .exclude(description__isnull=True)\
#                                      .exclude(description='')\
#                                      .exclude(cover__isnull=True)\
#                                      .order_by('?')
#                 recommended.extend(list(similar_books[:3]))  # Take up to 3 books per subject
            
#             # Remove duplicates while preserving order
#             seen = set()
#             recommended = [book for book in recommended if book.id not in seen and not seen.add(book.id)]
            
#             # If we have enough recommendations, return them
#             if len(recommended) >= num_books:
#                 recommended = recommended[:num_books]
#             else:
#                 # 2. Second tier: Add some popular books from favorite genres
#                 remaining = num_books - len(recommended)
#                 popular_books = Books.objects.exclude(id__in=user_reviews)\
#                                     .exclude(id__in=[b.id for b in recommended])\
#                                     .exclude(description__isnull=True)\
#                                     .exclude(cover__isnull=True)\
#                                     .order_by('?')[:remaining]
#                 recommended.extend(list(popular_books))
#         else:
#             # 3. Third tier: If no ratings yet, use random popular books
#             recommended = list(Books.objects.exclude(description__isnull=True)
#                               .exclude(description='')
#                               .exclude(cover__isnull=True)
#                               .order_by('?')[:num_books])
        
#         # Format the response
#         books_data = []
#         for book in recommended:
#             book_data = {
#                 "id": book.id,
#                 "key": book.key,
#                 "title": book.title,
#                 "description": book.description,
#                 "subjects": book.subjects,
#                 "author": book.author,
#                 "first_published": book.first_published,
#                 "cover": book.cover
#             }
#             books_data.append(book_data)
        
#         return JsonResponse(books_data, safe=False)
    
#     except Exception as e:
#         print(f"Error in recommended_books: {str(e)}")
#         return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_books(request):
    # Get request parameters
    user = request.user
    num_books = int(request.GET.get('num', 10))  # Default to 6 books
    
    liked_subject = UserInfo.objects.filter(user_id=user).values_list('top_subject', flat=True).first()
    print("ong", liked_subject)
    if not liked_subject:
        # If no liked subjects, fall back to random books
        random_books = list(Books.objects
                            .exclude(description__isnull=True)
                            .exclude(description='')
                            .exclude(cover__isnull=True)
                            .order_by('?')[:num_books])
        
        books_data = []
        for book in random_books:
            book_data = {
                "id": book.id,
                "key": book.key,
                "title": book.title,
                "description": book.description,
                "subjects": book.subjects,
                "author": book.author,
                "first_published": book.first_published if hasattr(book, 'first_published') else None,
                "cover": book.cover if hasattr(book, 'cover') else None
            }
            books_data.append(book_data)
        
        return JsonResponse(books_data, safe=False)
    
    may_like_book = Books.objects.filter(subjects__icontains=liked_subject)[:20]

    # print("may like book", may_like_book)

    books_data = []

    for book in may_like_book:
        book_data = {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "subjects": book.subjects,
            "author": book.author,
            "first_published": book.first_published if hasattr(book, 'first_published') else None,
            "cover": book.cover if hasattr(book, 'cover') else None
        }
        books_data.append(book_data)
    
    print("books_data", books_data)

    return JsonResponse(books_data, safe=False)
    


@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Books.objects.get(id=book_id)

        book_data = {
            "id": book.id,
            "key": book.key if hasattr(book, 'key') else None,
            "title": book.title,
            "description": book.description,
            "author": book.author,
            "first_published": book.first_published if hasattr(book, 'first_published') else None,
            "subjects": book.subjects,
            "cover": book.cover if hasattr(book, 'cover') else None,
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

    # Return both title and id as a list of dictionaries
    suggestions = Books.objects.filter(title__icontains=query)[:5]
    
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

    print("got filter", subject_filter)
    if subject_filter:
        books = Books.objects.filter(subjects__icontains=subject_filter)
        print("have this", books)
        
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    else:
        return Response({"error": "This shouldnt happen"}, status=400)


@api_view(['POST'])
def logout_user(request):
    if request.user.is_authenticated:
        django_logout(request)
        return Response({"message": "Successfully logged out"})
    else:
        return Response({"message": "You weren't logged in"})


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
def user_profile(request, username):
    # Get the requested user or return 404 if not found
    profile_user = get_object_or_404(User, username=username)
    # print("profile_user", profile_user, profile_user.id)
    # user_info = get_object_or_404(UserInfo, user_id=profile_user.id)
    bio = 'No bio available'
    location = 'No location available'
    birth_date = 'No birth date available'
    try:
        user_info = UserInfo.objects.get(user_id=profile_user.id)
        username = profile_user.username
        bio = user_info.bio
        location = user_info.location
        birth_date = user_info.birth_date
    except UserInfo.DoesNotExist:
        pass
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
        # Look for a specific list
        book_list = UserBookList.objects.get(user_id=user, name=list_name)
    except UserBookList.DoesNotExist:
        # Create a new list if it doesn't exist
        book_list = UserBookList.objects.create(user_id=user, name=list_name)
    return book_list

def add_to_list(book_id, book_list):
    # Check if the book is already in the list to avoid duplicates
    if int(book_id) not in book_list.book_ids:
        book_list.book_ids.append(int(book_id))
        book_list.save()
        print("Book added to saved list")
        return Response({"status": "success", "message": "Book saved successfully"}, status=200)
    else:
        book_list.book_ids.remove(int(book_id))
        book_list.save()
        print("Book already in list")
        return Response({"status": "removed", "message": "Book was removed"}, status=200)

    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_book(request, book_id):
    list_name = request.query_params.get('name')
    
    # Validate the list name
    valid_list_names = ["Saved Books", "Liked Books"]
    if list_name not in valid_list_names:
        return Response({
            "error": f"Invalid list name. Must be one of: {', '.join(valid_list_names)}"
        }, status=400)
    
    user = request.user
    
    # Get or create the specified book list
    book_list = make_list(user, list_name)

    # just for finding the top subject
    if list_name == "Liked Books":
            # Extract and clean subjects from liked books
        subjects = []
        for book_id in book_list.book_ids:
            try:
                book = Books.objects.get(id=book_id)
                if book.subjects:
                    # Clean and split subjects
                    book_subjects = [s.strip() for s in book.subjects.split(',')]
                    subjects.extend(book_subjects)
            except Books.DoesNotExist:
                continue
        
        # Count subject frequencies
        subject_counts = {}
        for subject in subjects:
            if subject:  # Skip empty subjects
                # Convert to lowercase when counting
                lowercase_subject = subject.lower()
                subject_counts[lowercase_subject] = subject_counts.get(lowercase_subject, 0) + 1

        top_subjects = sorted(subject_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        top_sub = top_subjects[0][0] if top_subjects else None
        
        UserInfo.objects.filter(user_id=user).update(top_subject=top_sub)
    
    # Add or remove the book from the list
    return add_to_list(book_id, book_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_books(request):
    user = request.user
    book_list = get_object_or_404(UserBookList, user_id=user, name=request.query_params['name'])
    
    saved_books = []
    for book_id in book_list.book_ids:
        try:
            book = Books.objects.get(id=book_id)

            book_data = {
                "id": book.id,
                "key": book.key if hasattr(book, 'key') else None,
                "title": book.title,
            }

            saved_books.append(book_data)

        except Books.DoesNotExist:
            pass
    return Response(saved_books)

