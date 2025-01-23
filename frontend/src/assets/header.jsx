import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

// import css
import './header_style.css';

import dark_mode from './pictures/bright-mode.png'; // Relative path to the image
import userImage from './pictures/user.png'; // Relative path to the image
import settingsIcon from './pictures/settings_icon.png'; // Relative path to the image

const Header = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/')
            .then(response => setData(response.data))
            .catch(error => console.error('Error fetching home data:', error));
    }, []);

    if (!data) return <div>Loading...</div>;

    return (
        <header id="header">
            <div id="logo">
                <a href="" style={{ color: '#ffffff', textDecoration: 'none' }}>Book Club</a>
            </div>
            <div id="useful_buttons">
                <img
                    src={dark_mode}
                    id="dark_mode"
                    className="icon jump"
                    alt="Dark Mode"
                />
                <a href="/profile">
                    <img
                        src={userImage}
                        id="User"
                        className="icon jump"
                        alt="User"
                    />
                </a>
                <a href="/settings">
                    <img
                        src={settingsIcon}
                        id="Settings"
                        className="icon spin"
                        alt="Settings"
                    />
                </a>
            </div>
        </header>
    );
};

export default Header;