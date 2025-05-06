import React from 'react';

// Store authentication state
let hide = false;
let loggedIn = false;

// Fix the checkInitialAuthState function
export function checkInitialAuthState() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    loggedIn = true;
    // Safely update the welcome text if the element exists
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
    // Add null checks for each element
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

// Modified handleLogin to support profile redirection
// export function handleLogin() {
//     if (loggedIn) {
//         // Instead of showing the profile form, redirect to profile page
//         const username = getCurrentUsername();
//         if (username) {
//             window.location.href = `/profile/${username}`;
//         }
//     } else {
//         if (hide) {
//             closeTabs();
//         } else {
//             showLogInTab();
//         }
//     }
// }
// Refactored handleLogin in utils.jsx
export function handleLogin() {
    // Directly check auth status using the reliable function
    if (isLoggedIn()) {
        const username = getCurrentUsername();
        if (username) {
            window.location.href = `/profile/${username}`;
        } else {
             console.error("Logged in but cannot get username for redirection.");
             // Optional: Fallback behavior like showing login again or an error
             // showLogInTab();
        }
    } else {
        // Check actual DOM state instead of relying on the 'hide' variable
        const loginForm = document.getElementById("login-form");
        // You might need to check other forms too if they define "shown" state
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
    
    // Save authentication data in localStorage
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify({
            username: data.username,
            authenticated: data.authenticated
        }));
    }
    
    // Safely update welcome texts
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
    
    // Save authentication data in localStorage
    if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify({
            username: data.username,
            authenticated: data.authenticated
        }));
    }
    
    // Safely update welcome texts
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
    // Call the logout API endpoint with the correct backend URL
    fetch('http://localhost:8000/api/logout/', {  // Update this URL to your Django server
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        credentials: 'include'  // Include cookies if using session auth alongside tokens
    })
    .then(response => {
        console.log('Logout API response:', response);
        
        // Clear auth state regardless of API response
        loggedIn = false;
        
        // Safely update welcome texts
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
        
        // Still clear local auth state even if API call fails
        loggedIn = false;
        
        // Safely update welcome texts
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
    
    // Note: We don't redirect here because the component that calls this function
    // should handle the redirection after logout
}

// Helper function to get authenticated fetch headers
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

// Function to check if user is logged in
export function isLoggedIn() {
    // Always check localStorage for token first, since the loggedIn variable resets on page refresh
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    // if (token && user) {
    //     // Update the loggedIn variable to match our storage state
    //     loggedIn = true;
    //     return true;
    // }
    
    // return loggedIn;  // This will be false unless specifically set elsewhere
    return !!(token && user)
}

// Function to get current username
export function getCurrentUsername() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        return userData.username;
    }
    return null;
}

// Add these functions to your utils.jsx

// This function handles what happens when the profile button is clicked
export function handleProfile() {
    console.log("handleProfile called, isLoggedIn:", isLoggedIn());
    
    if (!isLoggedIn()) {
        console.log("User not logged in, showing login tab");
        showLogInTab();
        return;
    }
    
    // If logged in, redirect to the profile page
    const username = getCurrentUsername();
    console.log("Current username:", username);
    
    if (username) {
        console.log("Redirecting to profile page for:", username);
        // Use more reliable navigation
        window.location.href = `/profile/${username}`;
    } else {
        console.error("Could not determine username for profile navigation");
        // Fallback behavior
        displayProfile();
    }
}

// Add a proper fetchProfileData function
export function fetchProfileData(username) {
    return fetch(`/api/profile/${username}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
    })
    .then(response => {
        console.log("Profile API response status:", response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error("Authentication failed - clearing token");
                // Clear invalid auth state
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