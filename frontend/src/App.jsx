import { useState, useEffect } from 'react'; // ✅ Import useEffect
import axios from 'axios'; // ✅ Import axios

import './stylesheet.css';
import './App.css';

import Header from './assets/header.jsx';
import Searchbar from './assets/searchbar.jsx';
import Booklist from './assets/booklist.jsx';
import Login from './assets/login.jsx';
import Signin from './assets/signin.jsx';
import Welcome from './assets/welcome.jsx';
import Profile from './assets/profile.jsx';

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

let hide = false;
let loggedIn = false;
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

const App = () => {

    // add this to restrict use if backend is not running
    
    // const [data, setData] = useState(null);

    // useEffect(() => {
    //     axios.get('http://127.0.0.1:8000/') // ✅ Ensure the backend is running
    //         .then(response => {
    //             console.log("Backend Response:", response.data); // ✅ Debugging log
    //             setData(response.data);
    //         })
    //         .catch(error => console.error('Error fetching home data:', error));
    // }, []);

    // if (!data) return <div>We struggle to reach our backend<br />You sure its up and running?</div>;

    return (
        <div>
            <Header />
            <Welcome />
            <Searchbar />
            <Booklist />
            <Login />
            <Signin />
            <Profile />
        </div>
    );
}

export default App;
