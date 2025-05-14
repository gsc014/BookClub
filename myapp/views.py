from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import check_password
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout as django_logout
from django.shortcuts import get_object_or_404
from .models import Review, UserInfo, UserBookList, NewTable, Books, Author, User
import random
from django.db import connection
from rest_framework.authtoken.models import Token
import logging
from django.core.paginator import Paginator
from django.db.models import Min, Max
from django.core.cache import cache
import time

logger = logging.getLogger(__name__)

@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"Login attempt for user: {username}")
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        login(request, user)
        
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

    suggestions = User.objects.filter(username__icontains=query)[:5]
    
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
    
    books = Books.objects.filter(title__icontains=query).order_by('id')
    
    paginator = Paginator(books, per_page)
    total_books = paginator.count
    
    if page > paginator.num_pages and paginator.num_pages > 0:
        page = paginator.num_pages
    
    current_page = paginator.get_page(page)
    
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


@api_view(['GET'])
def random_book(request):
    try:
        num_books = int(request.GET.get('num', 1))
    except (TypeError, ValueError):
        num_books = 1

    min_id = Books.objects.filter(
        description__isnull=False,
        cover__isnull=False
    ).aggregate(Min('id'))['id__min'] or 1
    
    max_id = Books.objects.filter(
        description__isnull=False, 
        cover__isnull=False
    ).aggregate(Max('id'))['id__max'] or 1000
    
    sample_size = min(5 * num_books, max_id - min_id + 1)
    random_ids = random.sample(range(min_id, max_id + 1), sample_size)
    
    books = Books.objects.filter(
        id__in=random_ids, 
        description__isnull=False,
        cover__isnull=False,
        cover__gt=0
    )[:num_books]
    
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
                
            if not books_data:
                return Response([], status=200)
            
            return Response(books_data[0] if num_books == 1 else books_data)
    
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
    user = request.user
    
    try:
        num_books = int(request.GET.get('num', 1))
    except (TypeError, ValueError):
        num_books = 1
    
    cache_key = f'recommended_books_{user.id}_{num_books}_{int(time.time() / 300)}'
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result[0] if num_books == 1 and cached_result else cached_result)
    
    genre_list = UserBookList.objects.filter(user_id=user, name="Blocked Books").first()
    blocked_genres = []
    if genre_list and genre_list.book_ids:
        blocked_genres = [genre.lower() for genre in genre_list.book_ids]
        print("Blocked genres:", blocked_genres)
    
    if not blocked_genres:
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
        
        sample_size = min(5 * num_books, max_id - min_id + 1)
        random_ids = random.sample(range(min_id, max_id + 1), sample_size)
        
        books = list(Books.objects.filter(
            id__in=random_ids, 
            description__isnull=False,
            cover__isnull=False,
            cover__gt=0
        )[:num_books])
        
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
        
        cache.set(cache_key, result_books, 300)
        return Response(result_books[0] if num_books == 1 and result_books else result_books)

   
    sample_size = min(2000, Books.objects.count()) 
    
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
    
    candidate_ids = random.sample(range(min_id, max_id + 1), min(sample_size, max_id - min_id + 1))
    
    candidate_books = Books.objects.filter(
        id__in=candidate_ids, 
        description__isnull=False,
        cover__isnull=False,
        cover__gt=0
    )
    
    filtered_books = []
    for book in candidate_books:
        if not book.subjects:
            filtered_books.append(book)
            if len(filtered_books) >= num_books:
                break
            
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
    
    cache.set(cache_key, result_books, 300)
    
    return Response(result_books[0] if num_books == 1 and result_books else result_books)

@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Books.objects.get(id=book_id)

        try:
            author = Author.objects.get(key=book.author).name
        except Author.DoesNotExist:
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
    if not author_key:
        return Response({"error": "No author key provided"}, status=400)
    
    current_book_id = request.GET.get('exclude_id')
    books_query = Books.objects.filter(author=author_key)
    
    if current_book_id:
        books_query = books_query.exclude(id=current_book_id)
    
    books = books_query 
    
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
            user=user  
        )

        return Response({"message": "Review added successfully!"}, status=201)

    except Books.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
def get_reviews(request, bid):
    try:
        reviews = Review.objects.filter(book_id=bid).order_by('-created_at')

        if not reviews.exists():
            return Response(status=204)

        reviews_data = []
        for review in reviews:
            username = getattr(review.user, "username", "Anonymous") or "Anonymous"
            reviews_data.append({
                'id': review.id,
                'rating': review.rating,
                'text': review.text,
                'username': username,
                'creation_date': review.created_at
            })

        return Response(reviews_data)

    except Exception as e:
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
        all_books = Books.objects.filter(subjects__icontains=subject_filter).order_by('id')
        
        paginator = Paginator(all_books, per_page)
        total_books = paginator.count
        
        if page > paginator.num_pages and paginator.num_pages > 0:
            page = paginator.num_pages
        
        current_page = paginator.get_page(page)
        
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
    try:
        profile_user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)

    bio, location, birth_date = "No bio available", "No location available", "No birth date available"
    user_info = UserInfo.objects.filter(user_id=profile_user.id).first()
    if user_info:
        bio, location, birth_date = user_info.bio, user_info.location, user_info.birth_date

    is_own_profile = request.user.is_authenticated and request.user.username == username
    
    profile_data = {
        "id": profile_user.id,
        "username": profile_user.username,
        "date_joined": profile_user.date_joined,
        "bio": bio,
        "location": location,
        "birth_date": birth_date,
    }
    
        
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
        user_info = UserInfo.objects.get_or_create(user_id=user)
        
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
    
    if User.objects.filter(username=new_username).exists():
        return Response({"error": "Username already taken"}, status=400)
    
    user.username = new_username
    user.save()
    
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
    
    if not check_password(current_password, user.password):
        return Response({"error": "Current password is incorrect"}, status=400)
    
    user.set_password(new_password)
    user.save()
    
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
    
    if User.objects.filter(email=new_email).exists():
        return Response({"error": "Email already taken"}, status=400)
    
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
    
    user.delete()
    
    return Response({
        "message": f"Account '{username}' has been deleted successfully"
    })

def make_list(user, list_name):
    try:
        book_list = UserBookList.objects.get(user_id=user, name= list_name)
    except UserBookList.DoesNotExist:
        book_list = UserBookList.objects.create(user_id=user, name= list_name)
    return book_list

def add_to_list(book_id, book_list):
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
    
    user = request.user
    book_list = make_list(user, list_name)
    
    return add_to_list(book_id, book_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_books(request):
    target_username = request.query_params.get('username')
    list_name = request.query_params.get('name')
    
    if target_username and target_username != request.user.username:
        try:
            target_user = User.objects.get(username=target_username)
            if list_name != "Liked Books":
                return Response({"error": "You can only view other users' liked books"}, status=403)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        user = target_user
    else:
        user = request.user

    book_list = get_object_or_404(UserBookList, user_id=user, name=list_name)
    
    books_data = []
    for book_id in book_list.book_ids:
        try:
            book = Books.objects.get(id=book_id)

            try:
                author = Author.objects.get(key=book.author).name
            except Author.DoesNotExist:
                author = book.author
        

            book_data = {
                "id": book.id,
                "key": book.key,
                "title": book.title,
                "author": author, 
                "cover": book.cover 
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
        genre_list = UserBookList.objects.create(user_id=user, name="Blocked Books", book_ids=[])
    
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
        user_info = UserInfo.objects.filter(user_id=user).first()
        high_score = user_info.high_score_titlegame if user_info else 0
        return Response({"high_score": high_score})

    elif request.method == 'POST':
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
        num_books = int(request.GET.get('num', 5))
        
        num_books = min(max(1, num_books), 20)
        
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
    

@api_view(['GET']) 
def most_liked_books(request):
    try:
        num_books = min(int(request.GET.get('num', 5)), 20) 
        
        liked_lists = UserBookList.objects.filter(name="Liked Books")
        
        book_counts = {}
        for liked_list in liked_lists:
            for book_id in liked_list.book_ids:
                book_counts[book_id] = book_counts.get(book_id, 0) + 1
        
        sorted_book_ids = sorted(book_counts.keys(), key=lambda x: book_counts[x], reverse=True)[:num_books]
        
        books_data = []
        for book_id in sorted_book_ids:
            try:
                book = Books.objects.get(id=book_id)
                
                author = book.author
                author_obj = Author.objects.filter(key=book.author).first()
                if author_obj:
                    author = author_obj.name

                
                books_data.append({
                    "id": book.id,
                    "key": book.key,
                    "title": book.title,
                    "author": author,
                    "cover": book.cover,
                    "likes_count": book_counts[book_id]
                })
            except Books.DoesNotExist:
                continue
        
        return Response(books_data)
    
    except Exception as e:
        print(f"Error fetching most liked books: {str(e)}")
        return Response({"error": "Failed to retrieve most liked books"}, status=500)


@api_view(['GET'])
def most_active_users(request):
    try:
        num_users = min(int(request.GET.get('num', 5)), 20)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.username, COUNT(r.id) as review_count
                FROM auth_user u
                INNER JOIN myapp_review r ON u.id = r.user_id
                GROUP BY u.id, u.username
                ORDER BY review_count DESC
                LIMIT %s
            """, [num_users])
            
            users_data = []
            for row in cursor.fetchall():
                user_id, username, review_count = row
                
                try:
                    user_info = UserInfo.objects.get(user_id=user_id)
                    bio = user_info.bio or "No bio available"
                except UserInfo.DoesNotExist:
                    bio = "No bio available"
                
                try:
                    latest_review = Review.objects.filter(user_id=user_id).order_by('-created_at')[0]
                    latest_book = Books.objects.get(id=latest_review.book_id)
                    latest_activity = {
                        "book_title": latest_book.title,
                        "book_id": latest_book.id,
                        "rating": latest_review.rating,
                        "date": latest_review.created_at
                    }
                except (IndexError, Books.DoesNotExist):
                    latest_activity = None
                
                users_data.append({
                    "id": user_id,
                    "username": username,
                    "review_count": review_count,
                    "bio": bio,
                    "latest_activity": latest_activity
                })
        
        return Response(users_data)
    
    except Exception as e:
        print(f"Error fetching most active users: {str(e)}")
        return Response({"error": "Failed to retrieve most active users"}, status=500)
