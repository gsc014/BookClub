import React, { useState } from 'react';
import axios from 'axios';
import './login.css';
import close from './pictures/close.png';
import { closeTabs, showLogInTab, showSignInTab, successfulLogin , successfulSignin} from '../App.jsx';

const Signin = () => {
    const [username, setUsername] = useState('');
    const [password1, setPassword1] = useState('');
    const [password2, setPassword2] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault(); // Prevent default form submission

        try {
            // Sending POST request for signup
            const response = await axios.post(
                'http://127.0.0.1:8000/api/signup/',
                { username, password1, password2 },
                {
                    headers: { "Content-Type": "application/json" },
                }
            );

            console.log('Signup successful:', response.data);
            setSuccess('Signup successful! You can now log in.');
            setError('');

            // Now, automatically log the user in with the same credentials
            const loginResponse = await axios.post(
                'http://127.0.0.1:8000/api/login/',
                { username, password: password1 },  // Use password1 since it's the user's password
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,  // Ensure the session is maintained
                }
            );

            // Handle successful login
            successfulSignin(loginResponse.data); // Use the successfulLogin function to manage login state
            closeTabs(); // Close the form

        } catch (error) {
            if (error.response) {
                console.error('Signup error:', error.response.data);
                setError(error.response.data.error || 'An error occurred.');
            } else {
                console.error('Unexpected error:', error);
                setError('An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="form" id="signin-form">
            <h2>
                Sign Up
                <img
                    src={close}
                    className="icon jump exit"
                    alt=""
                    onClick={closeTabs}
                />
            </h2>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
            <form onSubmit={handleSignup}>
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
                        id="password1"
                        type="password"
                        placeholder=" "
                        required
                        value={password1}
                        onChange={(e) => setPassword1(e.target.value)}
                    />
                    <div className="cut" />
                    <label htmlFor="password1" className="placeholder">
                        Password
                    </label>
                </div>
                <div className="input-container ic3">
                    <input
                        className="input"
                        id="password2"
                        type="password"
                        placeholder=" "
                        required
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                    <div className="cut" />
                    <label htmlFor="password2" className="placeholder">
                        Confirm Password
                    </label>
                </div>
                <button className="submit button" type="submit">
                    Sign Up
                </button>
            </form>
            <p className="switch-form">
                Already have an account?
                <button className="button" id="show-login" onClick={showLogInTab}>
                    Log In
                </button>
            </p>
        </div>
    );
};

export default Signin;
