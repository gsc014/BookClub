from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from .models import Review, UserInfo, UserBookList, NewTable, Books, Author
import random
from django.http import JsonResponse
from django.db import connections
from django.contrib.auth import logout as django_logout
from rest_framework.authtoken.models import Token
import logging
from django.core.paginator import Paginator
from django.db.models import Q, Min, Max

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
def autocomplete_profile(request):
    query = request.GET.get('query', '')
    
    if not query:
        return Response([])

    # Change this to return both title and id as a list of dictionaries
    suggestions = User.objects.filter(username__icontains=query)[:5]
    
    # Format the results as a list of dictionaries with title and id
    formatted_suggestions = [
        {'id': user.id, 'username': user.username} 
        for user in suggestions
    ]
    
    print("suggestions", formatted_suggestions)
    return Response(formatted_suggestions)

@api_view(['GET'])
def search_books(request):
    print("getting request", request.GET)
    query = request.GET.get('q', '')
    page_str = request.GET.get('page', '1')
    per_page_str = request.GET.get('per_page', '10')
    
    try:
        page = int(page_str)
        per_page = int(per_page_str)
    except ValueError:
        page = 1
        per_page = 10
        
    if not query:
        return Response({"error": "No query provided"}, status=400)
    
    # Change from regex word boundary to simple contains
    # This matches the behavior of autocomplete
    books = Books.objects.filter(title__icontains=query)
    
    # Set up pagination
    paginator = Paginator(books, per_page)
    total_books = paginator.count
    
    # Handle page number being out of range
    if page > paginator.num_pages and paginator.num_pages > 0:
        page = paginator.num_pages
    
    # Get current page
    current_page = paginator.get_page(page)
    
    # Format book data
    results = [
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "cover": book.cover,
            "key": book.key
        } 
        for book in current_page
    ]
    
    # Return properly structured response
    return Response({
        "results": results,
        "query": query,
        "pagination": {
            "total_books": total_books,
            "total_pages": paginator.num_pages,
            "current_page": page,
            "per_page": per_page,
            "has_next": current_page.has_next(),
            "has_previous": current_page.has_previous()
        }
    })

from django.db import connection

@api_view(['GET'])
def random_book(request):
    try:
        num_books = int(request.GET.get('num', 1))
    except (TypeError, ValueError):
        num_books = 1

    # Get min and max ID values for books with both descriptions and covers
    min_id = Books.objects.filter(
        description__isnull=False,
        cover__isnull=False
    ).aggregate(Min('id'))['id__min'] or 1
    
    max_id = Books.objects.filter(
        description__isnull=False, 
        cover__isnull=False
    ).aggregate(Max('id'))['id__max'] or 1000
    
    # We'll need more random IDs since we're filtering more strictly now
    sample_size = min(5 * num_books, max_id - min_id + 1)
    random_ids = random.sample(range(min_id, max_id + 1), sample_size)
    
    # Get books with those IDs that have descriptions AND covers
    books = Books.objects.filter(
        id__in=random_ids, 
        description__isnull=False,
        cover__isnull=False,  # Only return books with covers
        cover__gt=0           # Make sure cover IDs are valid positive numbers
    )[:num_books]
    
    # If we didn't get enough books, use the more expensive fallback
    if len(books) < num_books:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, key, title, description, subjects, author, first_published, cover
                FROM myapp_books
                WHERE description IS NOT NULL 
                AND cover IS NOT NULL
                AND cover > 0
                ORDER BY RANDOM()
                LIMIT %s
            """, [num_books])
            
            books_data = []
            for row in cursor.fetchall():
                books_data.append({
                    "id": row[0],
                    "key": row[1],
                    "title": row[2],
                    "description": row[3],
                    "subjects": row[4],
                    "author": row[5],
                    "first_published": row[6],
                    "cover": row[7]
                })
            
            return Response(books_data[0] if num_books == 1 else books_data)
    
    # Format the book data
    books_data = [
        {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "subjects": book.subjects,
            "author": book.author,
            "first_published": book.first_published,
            "cover": book.cover
        } 
        for book in books
    ]
    
    return Response(books_data[0] if num_books == 1 and books_data else books_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_book(request):
    from django.core.cache import cache
    import time
    
    user = request.user
    
    # Get number of books to return
    try:
        num_books = int(request.GET.get('num', 1))
    except (TypeError, ValueError):
        num_books = 1
    
    # Use caching to speed up repeated requests
    cache_key = f'recommended_books_{user.id}_{num_books}_{int(time.time() / 300)}'  # Cache key changes every 5 minutes
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result[0] if num_books == 1 and cached_result else cached_result)
    
    # Get blocked genres with one query
    genre_list = UserBookList.objects.filter(user_id=user, name="Blocked Books").first()
    blocked_genres = []
    if genre_list and genre_list.book_ids:
        blocked_genres = [genre.lower() for genre in genre_list.book_ids]
        print("Blocked genres:", blocked_genres)
    
    # If no blocked genres, use efficient random book selection
    if not blocked_genres:
        # Use the same efficient approach from random_book but require covers
        min_id = Books.objects.filter(
            description__isnull=False,
            cover__isnull=False,
            cover__gt=0
        ).aggregate(Min('id'))['id__min'] or 1
        
        max_id = Books.objects.filter(
            description__isnull=False,
            cover__isnull=False,
            cover__gt=0
        ).aggregate(Max('id'))['id__max'] or 1000
        
        # Get random IDs (5x what we need to handle missing records)
        sample_size = min(5 * num_books, max_id - min_id + 1)
        random_ids = random.sample(range(min_id, max_id + 1), sample_size)
        
        # Get books with those IDs that have descriptions AND covers
        books = list(Books.objects.filter(
            id__in=random_ids, 
            description__isnull=False,
            cover__isnull=False,
            cover__gt=0
        )[:num_books])
        
        # Format the results
        result_books = [
            {
                "id": book.id,
                "key": book.key,
                "title": book.title,
                "description": book.description,
                "subjects": book.subjects,
                "author": book.author,
                "first_published": book.first_published,
                "cover": book.cover
            }
            for book in books
        ]
        
        # Cache the result for 5 minutes
        cache.set(cache_key, result_books, 300)
        return Response(result_books[0] if num_books == 1 and result_books else result_books)

    # For filtering with blocked genres, use an efficient database-level approach
    
    # 1. Get a sample of candidate books (much larger than what we need)
    # This is more efficient than scanning the entire table
    sample_size = min(2000, Books.objects.count())  # Increased sample size since we're filtering more
    
    # Use min/max ID approach for better performance, requiring covers
    min_id = Books.objects.filter(
        description__isnull=False,
        cover__isnull=False,
        cover__gt=0
    ).aggregate(Min('id'))['id__min'] or 1
    
    max_id = Books.objects.filter(
        description__isnull=False,
        cover__isnull=False,
        cover__gt=0
    ).aggregate(Max('id'))['id__max'] or 1000
    
    # Get random IDs (much more than we need)
    candidate_ids = random.sample(range(min_id, max_id + 1), min(sample_size, max_id - min_id + 1))
    
    # 2. Get books with those IDs that have descriptions AND covers
    candidate_books = Books.objects.filter(
        id__in=candidate_ids, 
        description__isnull=False,
        cover__isnull=False,
        cover__gt=0
    )
    
    # 3. Filter out books with blocked genres at database level
    filtered_books = []
    for book in candidate_books:
        if not book.subjects:
            filtered_books.append(book)
            if len(filtered_books) >= num_books:
                break
            continue
            
        subjects = book.subjects.lower()
        should_include = True
        
        for blocked_genre in blocked_genres:
            if blocked_genre.lower() in subjects:
                should_include = False
                break
                
        if should_include:
            filtered_books.append(book)
            
        if len(filtered_books) >= num_books:
            break
    
    # Format the results
    result_books = [
        {
            "id": book.id,
            "key": book.key,
            "title": book.title, 
            "description": book.description,
            "subjects": book.subjects,
            "author": book.author,
            "first_published": book.first_published,
            "cover": book.cover
        }
        for book in filtered_books[:num_books]
    ]
    
    # Cache the result
    cache.set(cache_key, result_books, 300)
    
    # Return response
    return Response(result_books[0] if num_books == 1 and result_books else result_books)

@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Books.objects.get(id=book_id)

        try:
            author = Author.objects.get(key=book.author).name
            print("author is ", author)
        except Author.DoesNotExist:
            print("Author not found")
            author = book.author
        
        book_data = {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "description": book.description,
            "author": author,
            "author_key": book.author,
            "first_published": book.first_published,
            "subjects": book.subjects,
            "cover": book.cover
            
        }

        return Response(book_data)

    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)

@api_view(['GET'])
def get_books_by_author(request):
    author_key = request.GET.get('key', '')
    print("author key", author_key)
    if not author_key:
        return Response({"error": "No author key provided"}, status=400)
    
    # Filter books by author key, excluding the current book if an ID is provided
    current_book_id = request.GET.get('exclude_id')
    books_query = Books.objects.filter(author=author_key)
    
    if current_book_id:
        books_query = books_query.exclude(id=current_book_id)
    
    books = books_query  # Limit to 10 books
    
    results = [
        {
            "id": book.id,
            "key": book.key,
            "title": book.title,
            "author": book.author,
            "cover": book.cover
        } 
        for book in books
    ]
    return Response(results)
    

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
            text=review_text, 
            rating=rating, 
            book_id=book.id,
            user=user  # Add this line
        )

        return Response({"message": "Review added successfully!"}, status=201)

    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)

    except Exception as e:
        print(f"Error creating review: {e}")  # Add this line for better debugging
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_reviews(request, bid):
    try:
        reviews = Review.objects.filter(book_id=bid).order_by('-created_at')
        
        # Include username in the response
        reviews_data = []
        for review in reviews:
            # Get the username safely, handling the case where user might be None
            try:
                username = review.user.username if review.user else "Anonymous"
            except AttributeError:
                username = "Anonymous"
                
            # Add all review data to the response
            reviews_data.append({
                'id': review.id,
                'rating': review.rating,
                'text': review.text,
                'username': username,
                'creation_date': review.created_at  # Make sure this field name matches your model
            })
            
        return Response(reviews_data)
    except Exception as e:
        # Log the exception for debugging
        print(f"Error getting reviews: {str(e)}")
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
    page_str = request.GET.get('page', '1')
    per_page_str = request.GET.get('per_page', '10')
    
    try:
        page = int(page_str)
        per_page = int(per_page_str)
    except ValueError:
        page = 1
        per_page = 10
    
    print("subject filter", subject_filter)

    if subject_filter:
        # Get all matching books
        all_books = Books.objects.filter(subjects__icontains=subject_filter).order_by('id')
        
        # Set up pagination
        paginator = Paginator(all_books, per_page)
        total_books = paginator.count
        
        # Handle page number being out of range
        if page > paginator.num_pages and paginator.num_pages > 0:
            page = paginator.num_pages
        
        # Get current page
        current_page = paginator.get_page(page)
        
        # Format book data
        results = [
            {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "cover": book.cover,
                "key": book.key
            } 
            for book in current_page
        ]
        
        # Return properly structured response
        return Response({
            "results": results,
            "pagination": {
                "total_books": total_books,
                "total_pages": paginator.num_pages,
                "current_page": page,
                "per_page": per_page,
                "has_next": current_page.has_next(),
                "has_previous": current_page.has_previous()
            }
        })
    else:
        return Response({"error": "Filter parameter is required"}, status=400)


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
    valid_list_names = ["Saved Books", "Liked Books", "Blocked Books"]
    if list_name not in valid_list_names:
        return Response({
            "error": f"Invalid list name. Must be one of: {', '.join(valid_list_names)}"
        }, status=400)
    
    try:
        book = Books.objects.get(id=book_id)
    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)
    
    # print("book_id type", type(book))
    user = request.user
    book_list = make_list(user, list_name)

    # print("Book found:", book_list.book_ids)
    # print("Book ID type:", type(book_list.book_ids))
    
    return add_to_list(book_id, book_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_books(request):
    # Check if we're requesting another user's lists
    target_username = request.query_params.get('username')
    list_name = request.query_params.get('name')
    
    # Determine which user's lists we want to see
    if target_username and target_username != request.user.username:
        # Looking at another user's lists
        try:
            target_user = User.objects.get(username=target_username)
            # Only allow viewing "Liked Books" for other users
            if list_name != "Liked Books":
                return Response({"error": "You can only view other users' liked books"}, status=403)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        user = target_user
    else:
        # Looking at our own lists
        user = request.user

    # Get the requested list
    book_list = get_object_or_404(UserBookList, user_id=user, name=list_name)
    
    books_data = []
    for book_id in book_list.book_ids:
        try:
            book = Books.objects.get(id=book_id)

            try:
                author = Author.objects.get(key=book.author).name
                print("author is ", author)
            except Author.DoesNotExist:
                print("Author not found")
                author = book.author
        

            book_data = {
                "id": book.id,
                "key": book.key,
                "title": book.title,
                "author": author,  # Adding author for better display
                "cover": book.cover     # Adding cover for thumbnail display
            }

            
            books_data.append(book_data)

        except Books.DoesNotExist:
            pass
    
    return Response(books_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_genre(request):
    genres = request.data.get('blocked_genres', [])
    if not genres:
        return Response({"error": "No genres provided"}, status=400)
    
    user = request.user
    genre_list = UserBookList.objects.filter(user_id=user, name="Blocked Books").first()
    if not genre_list:
        # Create a new list if it doesn't exist
        genre_list = UserBookList.objects.create(user_id=user, name="Blocked Books", book_ids=[])
    
    # Update with the complete list (this replaces the existing list)
    genre_list.book_ids = genres
    genre_list.save()
    return Response({"message": "Genres updated successfully.", "blocked_genres": genres})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_genres(request):
    user = request.user
    genre_list = UserBookList.objects.filter(user_id=user, name="Blocked Books").first()
    
    if not genre_list:
        return Response({"blocked_genres": []})
    
    return Response({"blocked_genres": genre_list.book_ids})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblock_genre(request):
    genre = request.data.get('blocked_genre', '')
    if not genre:
        return Response({"error": "No genre provided"}, status=400)
    
    user = request.user
    genre_list = UserBookList.objects.filter(user_id=user, name="Blocked Books").first()
    if not genre_list:
        return Response({"message": "No blocked genres."})
    
    if genre in genre_list.book_ids:
        genre_list.book_ids.remove(genre)
        genre_list.save()
        return Response({
            "message": f"Genre '{genre}' removed from blocked list.",
            "blocked_genres": genre_list.book_ids
        })
    
    return Response({
        "message": f"Genre '{genre}' not found in blocked list.",
        "blocked_genres": genre_list.book_ids
    })
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


@api_view(['GET'])
def highest_rated_books(request):
    try:
        # Get parameters
        num_books = int(request.GET.get('num', 5))
        
        # Ensure we have a reasonable limit
        num_books = min(max(1, num_books), 20)
        
        # Use raw SQL for better performance with aggregation
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT b.id, b.key, b.title, b.author, b.cover, 
                       AVG(r.rating) as avg_rating, 
                       COUNT(r.id) as review_count
                FROM myapp_books b
                INNER JOIN myapp_review r ON b.id = r.book_id
                WHERE b.cover IS NOT NULL AND b.cover > 0
                GROUP BY b.id
                HAVING COUNT(r.id) >= 3  -- Minimum number of reviews
                ORDER BY avg_rating DESC, review_count DESC
                LIMIT %s
            """, [num_books])


            books_data = []
            for row in cursor.fetchall():
                try:
                    author = Author.objects.get(key=row[3]).name
                    print("author is ", author)
                except Author.DoesNotExist:
                    print("Author not found")
                    author = row[3]
                
                books_data.append({
                    "id": row[0],
                    "key": row[1],
                    "title": row[2],
                    "author": author,
                    "cover": row[4],
                    "avg_rating": round(float(row[5]), 1),
                    "review_count": row[6]
                })
        
        return Response(books_data)
    
    except Exception as e:
        print(f"Error fetching highest rated books: {str(e)}")
        return Response({"error": "Failed to retrieve highest rated books"}, status=500)