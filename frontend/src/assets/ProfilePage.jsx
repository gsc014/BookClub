import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isLoggedIn, getCurrentUsername, fetchProfileData, logout } from '../utils';
import './ProfilePage.css';

function ProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Form state for account management
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    
    // Check auth status immediately on component render
    useEffect(() => {
        console.log("ProfilePage mounted - auth check");
        console.log("Auth token present:", Boolean(localStorage.getItem('authToken')));
        console.log("isLoggedIn() returns:", isLoggedIn());
        
        // Redirect if not logged in
        if (!isLoggedIn()) {
            console.log("Not logged in, redirecting to home");
            navigate('/');
            return;
        }
        
        const currentUser = getCurrentUsername();
        console.log("Current username from storage:", currentUser);
        console.log("URL username parameter:", username);
    }, []);
    
    // Separate effect for data fetching
    useEffect(() => {
        if (!isLoggedIn()) return; // Skip fetch if not logged in
        
        console.log("Starting profile data fetch");
        setLoading(true);
        
        fetchProfileData(username)
            .then(data => {
                console.log("Profile data received:", data);
                setProfileData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching profile:', err);
                setError(`Failed to load profile data: ${err.message}`);
                setLoading(false);
                
                // If authentication error, redirect to home
                if (err.message.includes('Authentication failed')) {
                    console.log("Auth error detected, redirecting");
                    navigate('/');
                }
            });
    }, [username, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const handleChangeUsername = (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        
        if (!newUsername.trim()) {
            setFormError('Username cannot be empty');
            return;
        }
        
        // Call API to change username
        fetch('http://localhost:8000/api/update-username/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ new_username: newUsername })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update username');
                });
            }
            return response.json();
        })
        .then(data => {
            setFormSuccess('Username updated successfully! Please log in again with your new username.');
            // Update localStorage with new username
            const userData = JSON.parse(localStorage.getItem('user'));
            userData.username = newUsername;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Log out after short delay to allow user to see success message
            setTimeout(() => {
                logout();
                navigate('/');
            }, 3000);
        })
        .catch(err => {
            setFormError(err.message);
        });
    };
    
    const handleChangePassword = (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        
        if (!currentPassword) {
            setFormError('Current password is required');
            return;
        }
        
        if (!newPassword || !confirmPassword) {
            setFormError('New password and confirmation are required');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setFormError('New passwords do not match');
            return;
        }
        
        // Call API to change password
        fetch('http://localhost:8000/api/update-password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update password');
                });
            }
            return response.json();
        })
        .then(data => {
            setFormSuccess('Password updated successfully! Please log in again with your new password.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Log out after short delay
            setTimeout(() => {
                logout();
                navigate('/');
            }, 3000);
        })
        .catch(err => {
            setFormError(err.message);
        });
    };

    const handleChangeEmail = (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        
        if (!newEmail.trim()) {
            setFormError('Email cannot be empty');
            return;
        }
        
        // Call API to change email
        fetch('http://localhost:8000/api/update-email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ new_email: newEmail })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update email');
                });
            }
            return response.json();
        })
        .then(data => {
            setFormSuccess('Email updated successfully!');
            // Update localStorage with new email
            const userData = JSON.parse(localStorage.getItem('user'));
            userData.email = newEmail;
            localStorage.setItem('user', JSON.stringify(userData));

            setTimeout(() => {
                logout();
                navigate('/');
            }, 3000);
        })
        .catch(err => {
            setFormError(err.message);
        });
    };
    
    const handleDeleteAccount = () => {
        // Call API to delete account
        fetch('http://localhost:8000/api/delete-account/', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${localStorage.getItem('authToken')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete account');
                });
            }
            return response.json();
        })
        .then(data => {
            // Clear local auth state
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            
            // Redirect to home with a message
            navigate('/', { state: { message: 'Your account has been successfully deleted' } });
        })
        .catch(err => {
            setFormError(err.message);
        });
    };

    // Render loading state
    if (loading) {
        return (
            <div className="profile-page loading">
                <h2>Loading profile...</h2>
                <p>Please wait while we retrieve the profile information.</p>
            </div>
        );
    }
    
    // Render error state
    if (error) {
        return (
            <div className="profile-page error">
                <h2>Error Loading Profile</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
        );
    }
    
    // Render no data state
    if (!profileData) {
        return (
            <div className="profile-page error">
                <h2>No Profile Data</h2>
                <p>Could not retrieve profile information.</p>
                <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
        );
    }

    // Current user for permission checks
    const currentUser = getCurrentUsername();
    const isOwnProfile = currentUser === username;

    // Main profile render
    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>{profileData.username}'s Profile</h1>
                <div className="profile-actions">
                    {isOwnProfile && <button className="logout-btn" onClick={handleLogout}>Log Out</button>}
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <h2>Profile Information</h2>
                    <div className="profile-info">
                        <p><strong>Username:</strong> {profileData.username}</p>
                        <p><strong>Member Since:</strong> {new Date(profileData.date_joined).toLocaleDateString()}</p>
                        <p><strong>Bio:</strong> {profileData.bio}</p>
                        
                        {/* Show private information only if viewing own profile */}
                        {isOwnProfile && (
                            <>
                                <h3>Account Details</h3>
                                <p><strong>Email:</strong> {profileData.email || 'Not provided'}</p>
                                <p><strong>Last Login:</strong> {profileData.last_login ? 
                                    new Date(profileData.last_login).toLocaleString() : 'Unknown'}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Account management section - only visible on own profile */}
                {isOwnProfile && (
                    <div className="profile-section account-management">
                        <h2>Account Management</h2>
                        
                        {formError && <div className="form-error">{formError}</div>}
                        {formSuccess && <div className="form-success">{formSuccess}</div>}
                        
                        {/* Change Username */}
                        <div className="account-option">
                            <h3>Change Username</h3>
                            <button 
                                onClick={() => {
                                    setShowUsernameForm(!showUsernameForm);
                                    setShowPasswordForm(false);
                                    setShowEmailForm(false);
                                    setShowDeleteConfirm(false);
                                }}
                                className="toggle-form-btn"
                            >
                                {showUsernameForm ? 'Cancel' : 'Change Username'}
                            </button>
                            
                            {showUsernameForm && (
                                <form onSubmit={handleChangeUsername} className="account-form">
                                    <div className="form-group">
                                        <label htmlFor="newUsername">New Username:</label>
                                        <input
                                            type="text"
                                            id="newUsername"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="submit-btn">Update Username</button>
                                </form>
                            )}
                        </div>
                        
                        {/* Change Password */}
                        <div className="account-option">
                            <h3>Change Password</h3>
                            <button 
                                onClick={() => {
                                    setShowPasswordForm(!showPasswordForm);
                                    setShowUsernameForm(false);
                                    setShowEmailForm(false);
                                    setShowDeleteConfirm(false);
                                }}
                                className="toggle-form-btn"
                            >
                                {showPasswordForm ? 'Cancel' : 'Change Password'}
                            </button>
                            
                            {showPasswordForm && (
                                <form onSubmit={handleChangePassword} className="account-form">
                                    <div className="form-group">
                                        <label htmlFor="currentPassword">Current Password:</label>
                                        <input
                                            type="password"
                                            id="currentPassword"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="newPassword">New Password:</label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="confirmPassword">Confirm New Password:</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="submit-btn">Update Password</button>
                                </form>
                            )}
                        </div>

                        {/* Change Email */}
                        <div className="account-option">
                            <h3>Change Email</h3>
                            <button 
                                onClick={() => {
                                    setShowEmailForm(!showEmailForm);
                                    setShowUsernameForm(false);
                                    setShowPasswordForm(false);
                                    setShowDeleteConfirm(false);
                                }}
                                className="toggle-form-btn"
                            >
                                {showEmailForm ? 'Cancel' : 'Change Email'}
                            </button>
                            
                            {showEmailForm && (
                                <form onSubmit={handleChangeEmail} className="account-form">
                                    <div className="form-group">
                                        <label htmlFor="newEmail">New Email:</label>
                                        <input
                                            type="email"
                                            id="newEmail"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="submit-btn">Update Email</button>
                                </form>
                            )}
                        </div>
                        
                        {/* Delete Account */}
                        <div className="account-option delete-account">
                            <h3>Delete Account</h3>
                            <button 
                                onClick={() => {
                                    setShowDeleteConfirm(!showDeleteConfirm);
                                    setShowUsernameForm(false);
                                    setShowPasswordForm(false);
                                    setShowEmailForm(false);
                                }}
                                className="toggle-form-btn delete-btn"
                            >
                                {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
                            </button>
                            
                            {showDeleteConfirm && (
                                <div className="delete-confirm">
                                    <p className="warning">Warning: This action cannot be undone!</p>
                                    <p>Are you sure you want to delete your account? All your data will be permanently removed.</p>
                                    <button onClick={handleDeleteAccount} className="confirm-delete-btn">
                                        Yes, Delete My Account
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="profile-section">
                    <h2>Reading Activity</h2>
                    <p>User's reading activity will be displayed here</p>
                    {/* You can add book reviews, reading lists, etc. here */}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;