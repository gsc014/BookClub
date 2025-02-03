import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './login.css';
import close from './pictures/close.png';
import { closeTabs, showSignInTab, showLogInTab , logout} from '../App.jsx';

const Profile = () => {

    // Add state to track user profile (example)
    const [user, setUser] = useState({
        username: '',
        email: '',
        booksRead: 0,
        booksReviewed: 0
    });

    useEffect(() => {
        // Retrieve user data from localStorage if logged in
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    return (
        <div className="form" id="profile-form">
            <h2>
                Profile
                <img
                    src={close}
                    className="icon jump exit"
                    alt=""
                    onClick={closeTabs}
                />
            </h2>
            <div className="form-content">
                <h3>Username: {user.username}</h3>
                <h3>Email: {user.email}</h3>
                <h3>Books Read: {user.booksRead}</h3>
                <h3>Books Reviewed: {user.booksReviewed}</h3>
            </div>
            <div className="logout-button-container">
                <button className="logout-button" onClick={logout}>
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default Profile;
