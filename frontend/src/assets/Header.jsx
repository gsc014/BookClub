// src/components/Header/Header.jsx
import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

import userImage from './assets/pictures/user.png'; // Relative path to the image

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
            <div className="logo">
                <a href="" style={{ color: '#ffffff', textDecoration: 'none' }}>Book Club</a>
            </div>
            <div id="useful_buttons">
                <img
                    src="/static/pictures/bright-mode.png"
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
                        src="/static/pictures/settings_icon.png"
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