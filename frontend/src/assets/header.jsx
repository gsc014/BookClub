// src/assets/header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

import './style/header_style.css';

import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';
import gameIcon from './pictures/game_icon.png';
import bookLogo from './pictures/book_logo.png'; // Add this import for the logo

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
                <a href="/" onClick={goToHome} style={{ textDecoration: 'none' }}>
                    <img 
                        src={bookLogo} 
                        alt="Book Club Logo" 
                        id="book-logo" 
                        className="logo-image" 
                    />
                </a>
                Book Club
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