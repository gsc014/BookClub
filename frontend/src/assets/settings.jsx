// filepath: /home/alexander/BookClub/frontend/src/assets/settings.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './login.css';
import close from './pictures/close.png';

import { closeTabs, showSignInTab, showLogInTab, successfulLogin } from '../utils.jsx';

const Settings = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSettings = async () => {
        try {
            // Sending POST request with credentials
            const response = await axios.post(
                'http://127.0.0.1:8000/api/settings/',
                //settings things
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true, // Important for session management
                }
            );
            
        } catch (error) {
            // Handle errors (incorrect credentials)
            if (error.response) {
                console.error('Settings error:', error.response.data);
                setError(error.response.data.error || 'An error occurred.');
            } else {
                console.error('Unexpected error:', error);
                setError('An unexpected error occurred. Please try again later. Is the django server running?');
            }
        }
    };

    return (
        <div>
            <button onClick={handleSettings}>Go to Settings</button>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default Settings;