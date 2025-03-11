from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render
from .models import Work, Review
import random
from django.http import JsonResponse
from django.db import connections
from django.contrib.auth import logout as django_logout
from rest_framework.authtoken.models import Token
from django.contrib.auth.decorators import login_required  # For ensuring authentication
import logging

# Set up logging
logger = logging.getLogger(__name__)

@api_view(['GET'])
def profile(request):
    user = request.user  # Get the logged-in user
    
    if user.is_authenticated:
        return Response({
            "username": user.username,
            "email": user.email,
            "bio": user.profile.bio if hasattr(user, 'profile') else "No bio available"
        })
    else:
        return Response({"error": "User not authenticated"}, status=401)


@api_view(['GET'])
def settings(request):
    user = request.user
    return "hello"

@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({"message": "Login successful", "username": user.username})
    else:
        return Response({"error": "Invalid credentials"}, status=400)


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
    # return login(request, user)
    return Response({"message": "Signup successful!", "username": user.username})


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
    with connections['open_lib'].cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM works")
        total_books = cursor.fetchone()[0]

        if total_books == 0:
            return JsonResponse({"error": "No books found"}, status=404)

        random_offset = random.randint(0, total_books - 1)
        cursor.execute(f"SELECT id, key, title, description, subjects, author, first_published FROM works LIMIT 1 OFFSET {random_offset}")
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
            return JsonResponse(book_data)
        else:
            return JsonResponse({"error": "Book not found"}, status=404)


@api_view(['GET'])
def retrieve_book_info(request, book_id):
    try:
        book = Work.objects.using('open_lib').get(id=book_id)

        book_data = {
            "id": book.id,
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
@login_required  # Ensures user is authenticated
def add_review(request, book_id1):
    print(" user: ", request.user)
    try:
        book = Work.objects.using("open_lib").get(id=book_id1)
        review_text = request.data['text']
        rating = request.data.get("rating")

        review = Review.objects.create(
            text=review_text, rating=rating, book_id=book.id, user=request.user
        )

        return Response({"message": "Review added successfully!"}, status=201)

    except Work.DoesNotExist:
        return Response({"error": "Book not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
def get_reviews(request, bid):
    try:
        reviews = Review.objects.filter(book_id=bid).select_related('user')
        results = [{"rating": review.rating, "text": review.text, "creation_date": review.created_at, "username": review.user.username if review.user else "NULL user"} for review in reviews]
        return Response(results)

    except Exception as e:
        return Response({"error": str(e)}, status=500)



@api_view(['GET'])
def autocomplete(request):
    query = request.GET.get('query', '')
  
        
    print("got query", query, "\n")
    if not query:
        return Response([])

    suggestions = Work.objects.using('open_lib').filter(title__icontains=query).values_list('title', flat=True)[:5]
    return Response(suggestions)    



@api_view(['GET'])
def search_filter(request):
    subject_filter = request.GET.get('filter', '')

    print("got filter", subject_filter)
    if subject_filter:
        books = Work.objects.using('open_lib').filter(subjects__icontains=subject_filter)
        print("have this", books)
        
        results = [{"id": book.id, "title": book.title, "author": book.author} for book in books]
        return Response(results)
    else:
        return Response({"error": "This shouldnt happen"}, status=400)
        