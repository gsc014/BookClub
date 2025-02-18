from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render
from .models import Work
import random
from django.http import JsonResponse
from django.db import connections

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
