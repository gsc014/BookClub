# from django.shortcuts import render, HttpResponse
# from django.contrib.auth.forms import AuthenticationForm

# def home(request):
#     form = AuthenticationForm()  # Create an instance of the login form
#     return render(request, 'index.html', {'form': form})  # Pass the form to the template

# def profile(request):
#     return render(request, 'profile.html')

# def settings(request):
#     return render(request, 'settings.html')
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def home(request):
    # return render(request, 'index.html')
    # Replace with actual data if neededwhat 
    return Response({
        "img":"{% static 'pictures/bright-mode.png' %}",
        "message": "Welcome to the home page!",
        "login_form": {
            "username": "Enter your username",
            "password": "Enter your password"
        }
    })

from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.decorators import login_required

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

@api_view(['GET', 'POST'])
def settings(request):
    if request.method == 'POST':
        # Simulate saving settings (replace with actual logic)
        new_settings = request.data
        return Response({"message": "Settings updated successfully", "new_settings": new_settings})
    return Response({
        "theme": "dark",
        "notifications": True
    })


# def home(request):
#     return render(request, 'index.html')

# def login_user(request):
#     if request.method == 'POST':
#         username = request.POST.get('username')
#         password = request.POST.get('password')
#         user = authenticate(request, username=username, password=password)
#         if user is not None:
#             login(request, user)
#             messages.success(request, 'You have successfully logged in.')
#             return redirect('home')
#         else:
#             messages.error(request, 'Invalid username or password.')
#             return render(request, 'index.html', {'show_login': 'true'})  # Show login form on error

# def signup_user(request):
#     if request.method == 'POST':
#         username = request.POST.get('username')
#         password1 = request.POST.get('password1')
#         password2 = request.POST.get('password2')

#         if password1 != password2:
#             messages.error(request, 'Passwords do not match.')
#             return render(request, 'index.html', {'show_signup': 'true'})  # Show signup form on error
#         else:
#             try:
#                 User.objects.create_user(username=username, password=password1)
#                 messages.success(request, 'Account created successfully. Please log in.')
#                 return redirect('home')
#             except Exception as e:
#                 messages.error(request, f'Error creating account: {e}')
#                 return render(request, 'index.html', {'show_signup': 'true'})  # Show signup form on error

from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

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


from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
