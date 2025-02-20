import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import './login.css';
import close from './pictures/close.png';

import { closeTabs, showSignInTab, showLogInTab, successfulLogin } from '../utils.jsx';

const Settings = () => {
    const [error, setError] = useState('');
    const [cookieValue, setCookieValue] = useState('');

    const handleSettings = async () => {
        try {
            // Sending POST request with credentials
            const response = await axios.post(
                'http://127.0.0.1:8000/api/settings/',
                {},
                {
                    headers: { 
                        "Content-Type": "application/json",
                        "X-CSRFToken": Cookies.get('csrftoken') // Include CSRF token in the headers
                    },
                    withCredentials: true, // Important for session management
                }
            );
            
            console.log('Settings updated successfully:', response.data);
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

    const handleGetCookie = () => {
        const value = Cookies.get('csrftoken');
        setCookieValue(value || 'No cookie found');
    };

    const handleSetCookie = () => {
        Cookies.set('testCookie', 'This is a test cookie', { expires: 7, sameSite: 'Lax' });
        alert('Cookie set successfully');
    };

    const handleDeleteCookie = () => {
        Cookies.remove('testCookie');
        alert('Cookie deleted successfully');
    };

    return (
        <div>
            <button onClick={handleSettings}>Go to Settings</button>
            {error && <p className="error-message">{error}</p>}
            <div>
                <button onClick={handleGetCookie}>Get CSRF Token Cookie</button>
                <button onClick={handleSetCookie}>Set Test Cookie</button>
                <button onClick={handleDeleteCookie}>Delete Test Cookie</button>
                {cookieValue && <p>Cookie Value: {cookieValue}</p>}
            </div>
        </div>
    );
};

export default Settings;