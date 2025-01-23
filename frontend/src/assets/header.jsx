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

    document.getElementById("login-form").style.display = "none";
    document.getElementById("login-form").style.opacity = "0";
    // document.getElementById("signin-form").style.opacity = "0";
    showLogIn = false;
    // showSignIn = false;
}

function showLogInTab() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("login-form").style.opacity = "1";
    showLogIn = true;
}

var showLogIn = false;
var showSignIn = false;
function handleAccount() {
    if(showLogIn || showSignIn) {
        closeTabs();
    } else {
        showLogInTab();
    }
}

function changeMode() {
    var element = document.body;
    element.classList.toggle("dark-mode");
    var modeImage = document.getElementById("dark_mode");
    if (element.classList.contains("dark-mode")) {
        modeImage.src = dark_mode;
        // change physical colors to light mode
    } else {
        modeImage.src = light_mode;
        // change physical colors to dark mode
    }
}

const Header = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/')
            .then(response => setData(response.data))
            .catch(error => console.error('Error fetching home data:', error));
    }, []);

    if (!data) return <div>Loading...</div>;

    var modeImage = light_mode;
    return (
        <header id="header">
            <div id="logo">
                <a href="" style={{ color: '#ffffff', textDecoration: 'none' }}>Book Club</a>
            </div>
            <div id="useful_buttons">
                <img
                    src={modeImage}
                    id="dark_mode"
                    className="icon jump"
                    onClick={changeMode}
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