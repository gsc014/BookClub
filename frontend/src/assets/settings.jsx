import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './style/settings.css';
import { isLoggedIn, getCurrentUsername, logout } from '../utils';

const Settings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileData, setProfileData] = useState(null);

    // Form state for account management
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    
    // Genre blocking state
    const [availableGenres, setAvailableGenres] = useState([
        'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction', 
        'Fantasy', 'Romance', 'Thriller', 'Horror', 'Biography',
        'History', 'Poetry', 'Self-Help', 'Children', 'Young Adult',
        'Business', 'Technology', 'Science', 'Philosophy'
    ]);
    const [blockedGenres, setBlockedGenres] = useState([]);
    const [newBlockedGenre, setNewBlockedGenre] = useState('');
    const [showGenreForm, setShowGenreForm] = useState(false);
    const [genreUpdateSuccess, setGenreUpdateSuccess] = useState('');
    
    useEffect(() => {
        // Check if user is logged in
        if (!isLoggedIn()) {
            navigate('/');
            return;
        }
        
        // Fetch user data
        const username = getCurrentUsername();
        const authToken = localStorage.getItem('authToken');
        
        axios.get(`http://127.0.0.1:8000/api/user_profile/${username}/`, {
            headers: {
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            setProfileData(response.data);
            setLoading(false);
            
            // If user has blocked genres stored, load them
            if (response.data.blocked_genres) {
                setBlockedGenres(response.data.blocked_genres);
            } else {
                // Try to get from localStorage if API doesn't provide it
                const storedBlockedGenres = localStorage.getItem('blockedGenres');
                if (storedBlockedGenres) {
                    setBlockedGenres(JSON.parse(storedBlockedGenres));
                }
            }
        })
        .catch(err => {
            console.error('Error fetching user data:', err);
            setError('Failed to load your profile data');
            setLoading(false);
            
            // Try to get from localStorage if API fails
            const storedBlockedGenres = localStorage.getItem('blockedGenres');
            if (storedBlockedGenres) {
                setBlockedGenres(JSON.parse(storedBlockedGenres));
            }
        });
    }, [navigate]);

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
        
        const authToken = localStorage.getItem('authToken');
        
        // Call API to change username
        axios.post('http://127.0.0.1:8000/api/update-username/', 
            { new_username: newUsername },
            { 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            }
        )
        .then(response => {
            setFormSuccess('Username updated successfully! Please log in again with your new username.');
            // Update localStorage with new username
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            userData.username = newUsername;
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Log out after short delay to allow user to see success message
            setTimeout(() => {
                logout();
                navigate('/');
            }, 3000);
        })
        .catch(err => {
            setFormError(err.response?.data?.error || 'Failed to update username');
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
        
        const authToken = localStorage.getItem('authToken');
        
        // Call API to change password
        axios.post('http://127.0.0.1:8000/api/update-password/', 
            {
                current_password: currentPassword,
                new_password: newPassword
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            }
        )
        .then(response => {
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
            setFormError(err.response?.data?.error || 'Failed to update password');
        });
    };
    
    const handleDeleteAccount = () => {
        const authToken = localStorage.getItem('authToken');
        
        // Call API to delete account
        axios.delete('http://127.0.0.1:8000/api/delete-account/', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            // Clear local auth state
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            
            // Redirect to home with a message
            navigate('/', { state: { message: 'Your account has been successfully deleted' } });
        })
        .catch(err => {
            setFormError(err.response?.data?.error || 'Failed to delete account');
        });
    };

    const handleAddBlockedGenre = (e) => {
        e.preventDefault();
        
        if (!newBlockedGenre || blockedGenres.includes(newBlockedGenre)) {
            return;
        }
        
        const updatedBlockedGenres = [...blockedGenres, newBlockedGenre];
        setBlockedGenres(updatedBlockedGenres);
        setNewBlockedGenre('');
        
        // Save to localStorage as fallback
        localStorage.setItem('blockedGenres', JSON.stringify(updatedBlockedGenres));
        
        // Update on server
        updateBlockedGenresOnServer(updatedBlockedGenres);
    };
    
    const handleRemoveBlockedGenre = (genre) => {
        const updatedBlockedGenres = blockedGenres.filter(g => g !== genre);
        setBlockedGenres(updatedBlockedGenres);
        
        // Save to localStorage as fallback
        localStorage.setItem('blockedGenres', JSON.stringify(updatedBlockedGenres));
        
        // Update on server
        updateBlockedGenresOnServer(updatedBlockedGenres);
    };
    
    const updateBlockedGenresOnServer = (genres) => {
        const authToken = localStorage.getItem('authToken');
        
        // Endpoint needs to be implemented on your backend
        axios.post('http://127.0.0.1:8000/api/update-preferences/', 
            { blocked_genres: genres },
            { 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            }
        )
        .then(response => {
            setGenreUpdateSuccess('Genre preferences updated successfully!');
            setTimeout(() => setGenreUpdateSuccess(''), 3000);
        })
        .catch(err => {
            console.error('Failed to update genre preferences:', err);
            // We already saved to localStorage as fallback, so don't show error to user
        });
    };

    // Filter available genres to exclude already blocked ones
    const filteredAvailableGenres = availableGenres.filter(
        genre => !blockedGenres.includes(genre)
    );

    if (loading) {
        return <div className="settings-page loading">Loading your settings...</div>;
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Account Settings</h1>
                <p>Manage your profile and account preferences</p>
            </div>

            {error && <div className="settings-error">{error}</div>}
            
            <div className="settings-content">
                {formError && <div className="form-error">{formError}</div>}
                {formSuccess && <div className="form-success">{formSuccess}</div>}

                {/* User Information */}
                {profileData && (
                    <div className="settings-section user-info">
                        <h2>Profile Information</h2>
                        <p><strong>Username:</strong> {profileData.username}</p>
                        <p><strong>Email:</strong> {profileData.email || 'Not provided'}</p>
                        <p><strong>Member Since:</strong> {new Date(profileData.date_joined).toLocaleDateString()}</p>
                    </div>
                )}
                
                {/* Account Management Section */}
                <div className="settings-section account-management">
                    <h2>Account Management</h2>
                    
                    {/* Change Username */}
                    <div className="account-option">
                        <h3>Change Username</h3>
                        <button 
                            onClick={() => {
                                setShowUsernameForm(!showUsernameForm);
                                setShowPasswordForm(false);
                                setShowDeleteConfirm(false);
                                setFormError('');
                                setFormSuccess('');
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
                                setShowDeleteConfirm(false);
                                setFormError('');
                                setFormSuccess('');
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
                    
                    {/* Delete Account */}
                    <div className="account-option delete-account">
                        <h3>Delete Account</h3>
                        <button 
                            onClick={() => {
                                setShowDeleteConfirm(!showDeleteConfirm);
                                setShowUsernameForm(false);
                                setShowPasswordForm(false);
                                setFormError('');
                                setFormSuccess('');
                            }}
                            className="toggle-form-btn delete-btn"
                        >
                            {showDeleteConfirm ? 'Cancel' : 'Delete Account'}
                        </button>
                        
                        {showDeleteConfirm && (
                            <div className="delete-confirm">
                                <p className="warning">⚠️ Warning: This action cannot be undone!</p>
                                <p>Are you sure you want to delete your account? All your data will be permanently removed.</p>
                                <button onClick={handleDeleteAccount} className="confirm-delete-btn">
                                    Yes, Delete My Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* App Preferences Section - Now with blocked genres */}
                <div className="settings-section preferences">
                    <h2>App Preferences</h2>
                    
                    {/* Blocked Genres */}
                    <div className="preference-option">
                        <h3>Blocked Book Genres</h3>
                        {genreUpdateSuccess && <div className="form-success small">{genreUpdateSuccess}</div>}
                        
                        {/* Display current blocked genres */}
                        <div className="blocked-genres">
                            {blockedGenres.length > 0 ? (
                                <>
                                    <p>You're currently blocking these genres:</p>
                                    <ul className="genre-tags">
                                        {blockedGenres.map(genre => (
                                            <li key={genre} className="genre-tag">
                                                {genre}
                                                <button 
                                                    className="remove-genre" 
                                                    onClick={() => handleRemoveBlockedGenre(genre)}
                                                    title="Remove genre"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <p>You're not currently blocking any genres.</p>
                            )}
                        </div>
                        
                        {/* Add new blocked genre */}
                        <button 
                            onClick={() => setShowGenreForm(!showGenreForm)}
                            className="toggle-form-btn"
                        >
                            {showGenreForm ? 'Cancel' : 'Block Additional Genres'}
                        </button>
                        
                        {showGenreForm && (
                            <form onSubmit={handleAddBlockedGenre} className="account-form genre-form">
                                <div className="form-group">
                                    <label htmlFor="newBlockedGenre">Select Genre to Block:</label>
                                    <select
                                        id="newBlockedGenre"
                                        value={newBlockedGenre}
                                        onChange={(e) => setNewBlockedGenre(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select a Genre --</option>
                                        {filteredAvailableGenres.map(genre => (
                                            <option key={genre} value={genre}>{genre}</option>
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    type="submit" 
                                    className="submit-btn"
                                    disabled={!newBlockedGenre}
                                >
                                    Block Genre
                                </button>
                            </form>
                        )}
                        
                        <div className="preference-info">
                            <p>Blocked genres won't appear in your recommendations or search results.</p>
                        </div>
                    </div>
                </div>
                
                <div className="settings-actions">
                    <button className="logout-btn" onClick={handleLogout}>Log Out</button>
                    <button className="back-btn" onClick={() => navigate('/')}>Return to Home</button>
                </div>
            </div>
        </div>
    );
};

export default Settings;