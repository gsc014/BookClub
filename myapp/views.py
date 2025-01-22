# from django.shortcuts import render, HttpResponse
# from django.contrib.auth.forms import AuthenticationForm

# def home(request):
#     form = AuthenticationForm()  # Create an instance of the login form
#     return render(request, 'index.html', {'form': form})  # Pass the form to the template

# def profile(request):
#     return render(request, 'profile.html')

# def settings(request):
#     return render(request, 'settings.html')
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def home(request):
    # Replace with actual data if needed
    return Response({
        "message": "Welcome to the home page!",
        "login_form": {
            "username": "Enter your username",
            "password": "Enter your password"
        }
    })

@api_view(['GET'])
def profile(request):
    # Replace with dynamic user data
    return Response({
        "username": "alexander",
        "email": "alexander@example.com",
        "bio": "A book lover!"
    })

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
