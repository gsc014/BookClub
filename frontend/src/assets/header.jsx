import React from 'react';
import { useNavigate } from 'react-router-dom';
import './style/header_style.css';
import userImage from './pictures/user.png';
import settingsIcon from './pictures/settings_icon.png';
import gameIcon from './pictures/game_icon.png';
import bookLogo from './pictures/book_logo.png';
import { handleLogin } from '../utils.jsx';

const Header = () => {
    const navigate = useNavigate();

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