// filepath: /home/alexander/BookClub/frontend/src/utils.jsx
import React from 'react';

export function closeTabs() {
    document.getElementById("login-form").style.opacity = "0";
    document.getElementById('login-form').style.pointerEvents = 'none';
    document.getElementById("signin-form").style.opacity = "0";
    document.getElementById("signin-form").style.pointerEvents = "none";
    document.getElementById("profile-form").style.opacity = "0";
    document.getElementById("profile-form").style.pointerEvents = "none";
    hide = false;
}

export function showSignInTab() {
    document.getElementById("login-form").style.opacity = "0";
    document.getElementById('login-form').style.pointerEvents = 'none';

    document.getElementById("signin-form").style.opacity = "1";
    document.getElementById('signin-form').style.pointerEvents = 'all';
    hide = true;
}

export function showLogInTab() {
    document.getElementById("signin-form").style.opacity = "0";
    document.getElementById('signin-form').style.pointerEvents = 'none';

    document.getElementById("login-form").style.opacity = "1";
    document.getElementById('login-form').style.pointerEvents = 'all';
    hide = true;
}

export function displayProfile() {
    document.getElementById("profile-form").style.opacity = "1";
    document.getElementById('profile-form').style.pointerEvents = 'all';
    hide = true;
}

export function handleLogin() {
    if(loggedIn){
        displayProfile();
    }
    else{
        if(hide) {
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
    document.getElementById('welcomeSuccsessLogIn').innerHTML = "Login successful!";
    document.getElementById('welcomeText').innerHTML = "Welcome back, " + data.username;
}

export function successfulSignin(data) {
    console.log('Signin successful:', data);
    loggedIn = true;
    closeTabs();
    document.getElementById('welcomeSuccsessLogIn').innerHTML = "Signin successful!";
    document.getElementById('welcomeText').innerHTML = "Welcome, " + data.username;
}

export function logout() {
    loggedIn = false;
    document.getElementById('welcomeSuccsessLogIn').innerHTML = "";
    document.getElementById('welcomeText').innerHTML = "Welcome to Book Club";
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    closeTabs();
}

let hide = false;
let loggedIn = false;