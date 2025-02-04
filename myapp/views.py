from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

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
