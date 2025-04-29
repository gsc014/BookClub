// src/assets/header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
// Remove unused imports like useState, useEffect, axios
// import { useState, useEffect } from 'react';
// import axios from 'axios';

import './style/header_style.css';

import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';
import gameIcon from './pictures/game_icon.png';

// Keep only used imports from utils
import { handleLogin } from '../utils.jsx';

// Remove unused function changeColor
// function changeColor(isLightmode) { ... }

const Header = () => {
    // Remove unused state
    // const [isLightmode, setDarkmode] = useState(false);

    const navigate = useNavigate();

    // Remove unused function toggleMode
    // const toggleMode = () => { ... };

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
                {/* Dark mode button commented out */}
                <img
                        src={gameIcon}
                        id="Game"
                        className="icon jump"
                        onClick={goToGame}
                        alt="Game Page" 
                    />
                <img
                    src={userImage}
                    id="User"
                    className="icon jump"
                    onClick={handleLogin}
                    alt="User Login/Profile" 
                />
                <img
                    src={settingsIcon}
                    id="Settings"
                    className="icon spin"
                    onClick={goToSettings}
                    alt="Settings Page" 
                />
            </div>
        </header>
    );
};

export default Header;