import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

// import css
import './header_style.css';

import light_mode from './pictures/bright-mode.png';
import dark_mode from './pictures/night-mode.png';
import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';

import {closeTabs, showSignInTab, showLogInTab, handleLogin} from '../App.jsx';


function changeColor(isLightmode) {
    if(isLightmode) {
        console.log('light mode');
    } else {
        console.log('dark mode');
    }
}

const Header = () => {
    const [isLightmode, setDarkmode] = useState(false);

    const toggleMode = () => {
        changeColor(isLightmode);
        setDarkmode((prev) => !prev);
    };

    // const [showLogIn, show_form] = useState(false);

    // const toggleLogIn = () => {
    //     handleLogin(showLogIn);
    //     show_form((prev) => !prev);
    // };

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
                    onClick={handleLogin}
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