import React, { useState } from 'react';
import axios from 'axios';
import './style/login.css';
import close from './pictures/close.png';

import {closeTabs, showSignInTab, showLogInTab, successfulLogin} from '../utils.jsx';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(
                'http://127.0.0.1:8000/api/login/',
                { username, password },
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,
                }
            );
            successfulLogin(response.data);
        } catch (error) {
            if (error.response) {
                console.error('Login error:', error.response.data);
                setError(error.response.data.error || 'An error occurred.');
            } else {
                console.error('Unexpected error:', error);
                setError('An unexpected error occurred. Please try again later. Is the django server running?');
            }
        }
    };

    return (
        <div className="form" id="login-form">
            <h2>
                Log In
                <img
                    src={close}
                    className="icon jump exit"
                    alt="Close login form"
                    onClick={closeTabs}
                />
            </h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleLogin}>
                <div className="input-container ic1">
                    <input
                        className="input"
                        id="username"
                        type="text"
                        placeholder=" "
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <div className="cut" />
                    <label htmlFor="username" className="placeholder">
                        Username
                    </label>
                </div>
                <div className="input-container ic2">
                    <input
                        className="input"
                        id="password"
                        type="password"
                        placeholder=" "
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="cut" />
                    <label htmlFor="password" className="placeholder">
                        Password
                    </label>
                </div>
                <button className="submit button" type="submit">
                    Log In
                </button>
            </form>
            <p className="switch-form">
                Don't have an account?
                <button className="button" id="show-signup" onClick={showSignInTab}>
                    Sign Up
                </button>
            </p>
        </div>
    );
};

export default Login;
