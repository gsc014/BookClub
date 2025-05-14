import React from 'react';

let hide = false;
let loggedIn = false;

export function checkInitialAuthState() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    loggedIn = true;
    const welcomeTextElement = document.getElementById('welcomeText');
    if (welcomeTextElement) {
      const userData = JSON.parse(user);
      welcomeTextElement.innerHTML = "Welcome back, " + userData.username;
    }
    return true;
  }
  
  return false;
}

export function closeTabs() {
    const loginForm = document.getElementById("login-form");
    const signinForm = document.getElementById("signin-form");
    const profileForm = document.getElementById("profile-form");
    
    if (loginForm) {
        loginForm.style.opacity = "0";
        loginForm.style.pointerEvents = 'none';
        loginForm.style.top = '40%' 
    }
    
    if (signinForm) {
        signinForm.style.opacity = "0";
        signinForm.style.pointerEvents = "none";
        signinForm.style.top = '40%'
    }
    
    if (profileForm) {
        profileForm.style.opacity = "0";
        profileForm.style.pointerEvents = "none";
        profileForm.style.top = '40%'
    }
    
    hide = false;
}

export function showSignInTab() {
    document.getElementById("login-form").style.opacity = "0";
    document.getElementById('login-form').style.pointerEvents = 'none';
    document.getElementById('login-form').style.top = '40%';

    document.getElementById("signin-form").style.opacity = "1";
    document.getElementById('signin-form').style.pointerEvents = 'all';
    document.getElementById('signin-form').style.top = '50%';
    hide = true;
}

export function showLogInTab() {
    document.getElementById("signin-form").style.opacity = "0";
    document.getElementById('signin-form').style.pointerEvents = 'none';
    document.getElementById('signin-form').style.top = '40%';

    document.getElementById("login-form").style.opacity = "1";
    document.getElementById('login-form').style.pointerEvents = 'all';
    document.getElementById('login-form').style.top = '50%';
    hide = true;
}

export function displayProfile() {
    document.getElementById("profile-form").style.opacity = "1";
    document.getElementById('profile-form').style.pointerEvents = 'all';
    hide = true;
}

export function handleLogin() {
    if (isLoggedIn()) {
        const username = getCurrentUsername();
        if (username) {
            window.location.href = `/profile/${username}`;
        } else {
             console.error("Logged in but cannot get username for redirection.");
        }
    } else {
        const loginForm = document.getElementById("login-form");
        const isTabVisible = loginForm && loginForm.style.opacity === '1';

        if (isTabVisible) {
            closeTabs();
        } else {
            showLogInTab();
        }
    }
}

export function successfulLogin(data) {
    console.log('Login successful:', data);
    loggedIn = true;
    closeTabs();
    
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify({
            username: data.username,
            authenticated: data.authenticated
        }));
    }
    
    const welcomeSuccessElement = document.getElementById('welcomeSuccsessLogIn');
    const welcomeTextElement = document.getElementById('welcomeText');
    
    if (welcomeSuccessElement) {
        welcomeSuccessElement.innerHTML = "Login successful!";
    }
    
    if (welcomeTextElement) {
        welcomeTextElement.innerHTML = "Welcome back, " + data.username;
    }
}

export function successfulSignin(data) {
    console.log('Signin successful:', data);
    loggedIn = true;
    closeTabs();
    
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify({
            username: data.username,
            authenticated: data.authenticated
        }));
    }
    
    const welcomeSuccessElement = document.getElementById('welcomeSuccsessLogIn');
    const welcomeTextElement = document.getElementById('welcomeText');
    
    if (welcomeSuccessElement) {
        welcomeSuccessElement.innerHTML = "Signin successful!";
    }
    
    if (welcomeTextElement) {
        welcomeTextElement.innerHTML = "Welcome, " + data.username;
    }
}

export function logout() {
    fetch('http://localhost:8000/api/logout/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        credentials: 'include'
    })
    .then(response => {
        console.log('Logout API response:', response);
        loggedIn = false;
        const welcomeSuccessElement = document.getElementById('welcomeSuccsessLogIn');
        const welcomeTextElement = document.getElementById('welcomeText');
        
        if (welcomeSuccessElement) {
            welcomeSuccessElement.innerHTML = "";
        }
        
        if (welcomeTextElement) {
            welcomeTextElement.innerHTML = "Welcome to Book Club";
        }
        
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        closeTabs();
    })
    .catch(error => {
        console.error('Logout error:', error);
        loggedIn = false;
        const welcomeSuccessElement = document.getElementById('welcomeSuccsessLogIn');
        const welcomeTextElement = document.getElementById('welcomeText');
        
        if (welcomeSuccessElement) {
            welcomeSuccessElement.innerHTML = "";
        }
        
        if (welcomeTextElement) {
            welcomeTextElement.innerHTML = "Welcome to Book Club";
        }
        
        localStorage.removeItem('user');
        localStorage.removeItem('authToken');
        closeTabs();
    });
}

export function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }
    
    return headers;
}

export function isLoggedIn() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user)
}

export function getCurrentUsername() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        return userData.username;
    }
    return null;
}

export function handleProfile() {
    if (!isLoggedIn()) {
        showLogInTab();
        return;
    }
    
    const username = getCurrentUsername();
    
    if (username) {
        window.location.href = `/profile/${username}`;
    } else {
        displayProfile();
    }
}

export function fetchProfileData(username) {
    return fetch(`/api/profile/${username}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                loggedIn = false;
                throw new Error("Authentication failed. Please log in again.");
            } else {
                throw new Error(`Error ${response.status}: Failed to fetch profile`);
            }
        }
        return response.json();
    });
}