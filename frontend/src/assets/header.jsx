import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

// import css
import './header_style.css';

import light_mode from './pictures/bright-mode.png';
import dark_mode from './pictures/night-mode.png';
import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';


function closeTabs() {
    document.getElementById("login-form").style.opacity = "0";
    document.getElementById('login-form').style.pointerEvents = 'none';
    document.getElementById("signin-form").style.display = "0";
    document.getElementById("signin-form").style.pointerEvents = "none";
    showLogIn = false;
    showSignIn = false;
}

export function showSignInTab() {
    // close login tab
    document.getElementById("login-form").style.opacity = "0";
    document.getElementById('login-form').style.pointerEvents = 'none';
    showLogIn = false;

    document.getElementById("signin-form").style.opacity = "1";
    document.getElementById('signin-form').style.pointerEvents = 'all';
    showSignIn = true;
}

export function showLogInTab() {
    // close signin tab
    document.getElementById("signin-form").style.opacity = "0";
    document.getElementById('signin-form').style.pointerEvents = 'none';
    showSignIn = false;

    document.getElementById("login-form").style.opacity = "1";
    document.getElementById('login-form').style.pointerEvents = 'all';
    showLogIn = true;
}

var showLogIn = false;
var showSignIn = false;
function handleAccount() {
    if(showLogIn == true || showSignIn == true) {
        closeTabs();
    } else {
        showLogInTab();
    }
}

function changeColor(isLightmode) {
    if(isLightmode) {
        console.log('light mode');
    } else {
        console.log('dark mode');
    }
}

const Header = () => {
    const [data, setData] = useState(null);
    const [isLightmode, setDarkmode] = useState(false);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/')
            .then(response => setData(response.data))
            .catch(error => console.error('Error fetching home data:', error));
    }, []);

    const toggleMode = () => {
        changeColor(isLightmode);
        setDarkmode((prev) => !prev);
    };

    if (!data) return <div>Loading...</div>;

    return (
        <header id="header">
            <div id="logo">
                <a href="" style={{ color: '#ffffff', textDecoration: 'none' }}>Book Club</a>
            </div>
            <div id="useful_buttons">
                <img
                    src={isLightmode ? dark_mode : light_mode}
                    id="dark_mode"
                    className="icon jump"
                    onClick={toggleMode}
                />
                <img
                    src={userImage}
                    id="User"
                    className="icon jump"
                    onClick={handleAccount}
                />
                <a href="/settings">
                    <img
                        src={settingsIcon}
                        id="Settings"
                        className="icon spin"
                    />
                </a>
            </div>
        </header>
    );
};

export default Header;