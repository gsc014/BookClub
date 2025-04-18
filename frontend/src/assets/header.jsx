import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

import './style/header_style.css';

import light_mode from './pictures/bright-mode.png';
import dark_mode from './pictures/night-mode.png';
import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';
import gameIcon from './pictures/game_icon.png';

import { closeTabs, showSignInTab, showLogInTab, handleLogin } from '../utils.jsx';


function changeColor(isLightmode) {
    if (isLightmode) {
        console.log('light mode');
    } else {
        console.log('dark mode');
    }
}

const Header = () => {
    const [isLightmode, setDarkmode] = useState(false);


    const navigate = useNavigate();

    // const toggleMode = () => {
    //     changeColor(isLightmode);
    //     setDarkmode((prev) => !prev);
    // };

    const goToSettings = () => {
        navigate('/settings');
    };

    const goToHome = (e) => {
        e.preventDefault();
        navigate('/');
    };

    const goToGame = () => {
        navigate('/game');
    };

    return (
        <header id="header">
            <div id="logo">
                <a href="/" onClick={goToHome} style={{ color: '#ffffff', textDecoration: 'none' }}>Book Club</a>
            </div>
            <div id="useful_buttons">
                {/* <img
                    src={isLightmode ? dark_mode : light_mode}
                    id="dark_mode"
                    className="icon jump"
                    onClick={toggleMode}
                /> */}
                <img
                        src={gameIcon}
                        id="Game"
                        className="icon jump"
                        onClick={goToGame}
                    />
                <img
                    src={userImage}
                    id="User"
                    className="icon jump"
                    onClick={handleLogin}
                />
                <img
                    src={settingsIcon}
                    id="Settings"
                    className="icon spin"
                    onClick={goToSettings}
                />
            </div>
        </header>
    );
};

export default Header;