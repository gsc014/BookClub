from django.shortcuts import render, HttpResponse
from django.contrib.auth.forms import AuthenticationForm

def home(request):
    form = AuthenticationForm()  # Create an instance of the login form
    return render(request, 'index.html', {'form': form})  # Pass the form to the template

def profile(request):
    return render(request, 'profile.html')

def settings(request):
    return render(request, 'settings.html')