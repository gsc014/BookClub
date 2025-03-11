import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isLoggedIn, getCurrentUsername, fetchProfileData, logout } from '../utils';
import './style/ProfilePage.css';
import axios from 'axios';
import search from './pictures/search.png';
import bin from './pictures/bin.png';
import { use } from 'react';

function ProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Profile editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState({
        bio: '',
        location: '',
        birth_date: ''
    });
    const [updateError, setUpdateError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState('');
    const [savedBooks, setSavedBooks] = useState([]);
    const [loadingSavedBooks, setLoadingSavedBooks] = useState(true);
    const [goth, setGoth] = useState(false);

    
    // Check auth status immediately on component render
    useEffect(() => {
        console.log("ProfilePage mounted - auth check");
        
        // Redirect if not logged in
        if (!isLoggedIn()) {
            console.log("Not logged in, redirecting to home");
            navigate('/');
            return;
        }
    }, [navigate]);
    
    useEffect(() => {

        console.log("HELLO!\n");

    }, [goth]);



    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        console.log("Auth token:", authToken);
        
        // Check if user is logged in
        if (!authToken) {
            console.log("No auth token found");
            return;
        }
        
        setLoadingSavedBooks(true);
        
        // Get saved book list
        axios.get('http://localhost:8000/api/book-list/', {
            params: { name: "Saved Books" },
            headers: {
                "Authorization": `Token ${authToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log("Book list retrieved:", response.data);
            setSavedBooks(response.data);
            setLoadingSavedBooks(false);
        })
        .catch(err => {
            console.error("Error fetching book list:", err);
            setLoadingSavedBooks(false);
        });
    }, []);  // Empty dependency array to run once on component mount

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        
        // Check if user is logged in
        if (!authToken) {
            console.log("No auth token found");
            return;
        }
        
        fetchSavedBooks();
    }, []);  // Empty dependency array to run once on component mount

    // Separate effect for data fetching
    useEffect(() => {
        if (!isLoggedIn()) return; // Skip fetch if not logged in
        
        console.log("Starting profile data fetch");
        setLoading(true);
        
        fetchProfileData(username)
            .then(data => {
                console.log("Profile data received:", data);
                setProfileData(data);
                setEditedProfile({
                    bio: data.bio || '',
                    location: data.location || '',
                    birth_date: data.birth_date || ''
                });
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

    const search_book = (id) => {
        console.log("Navigating to book with ID:", id);
        navigate('/books/' + id, { state: { book: { id } } });
    }

    const remove_book = (id) => {
        console.log("Removing book with ID:", id);
        const authToken = localStorage.getItem('authToken');
        
        // Check if user is logged in
        if (!authToken) {
            alert('You must be logged in to remove a book.');
            return;
        }
        
        // First, optimistically update the UI by filtering out the book
        setSavedBooks(currentBooks => currentBooks.filter(book => book.id !== id));
        
        // Then send the request to the server
        axios.post(
            `http://127.0.0.1:8000/api/save-book/${id}/`, 
            {}, // Empty object as body
            {
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => {
            console.log("Book removed:", response.data);
            
            // If the server indicates the book wasn't actually removed, 
            // fetch the updated list again to ensure consistency
            if (response.data.status !== 'removed') {
                fetchSavedBooks();
            }
        })
        .catch(error => {
            console.error("Error removing book:", error);
            
            // On error, fetch the full list again to restore correct state
            fetchSavedBooks();
        });
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditedProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleEditToggle = () => {
        if (isEditing) {
            // If we're canceling edit mode, reset the form
            setEditedProfile({
                bio: profileData.bio || '',
                location: profileData.location || '',
                birth_date: profileData.birth_date || ''
            });
        }
        setIsEditing(!isEditing);
        setUpdateError('');
        setUpdateSuccess('');
    };
    
    const handleProfileUpdate = (e) => {
        e.preventDefault();
        setUpdateError('');
        setUpdateSuccess('');
        
        const authToken = localStorage.getItem('authToken');
        
        // Call API to update profile
        axios.post('http://127.0.0.1:8000/api/update-profile/', editedProfile, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            setUpdateSuccess('Profile updated successfully!');
            // Update local profileData state with new values
            setProfileData(prev => ({
                ...prev,
                ...editedProfile
            }));
            // Exit edit mode
            setIsEditing(false);
        })
        .catch(err => {
            setUpdateError(err.response?.data?.error || 'Failed to update profile');
            console.error('Error updating profile:', err);
        });
    };
    
    const handleGoToSettings = () => {
        navigate('/settings');
    };

    // Add this function to fetch the saved books
    const fetchSavedBooks = () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        
        setLoadingSavedBooks(true);
        
        axios.get('http://localhost:8000/api/book-list/', {
            params: { name: "Saved Books" },
            headers: {
                "Authorization": `Token ${authToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log("Book list refreshed:", response.data);
            setSavedBooks(response.data);
            setLoadingSavedBooks(false);
        })
        .catch(err => {
            console.error("Error refreshing book list:", err);
            setLoadingSavedBooks(false);
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
                    {isOwnProfile && (
                        <>
                            <button className="settings-btn" onClick={handleGoToSettings}>Account Settings</button>
                            <button className="logout-btn" onClick={handleLogout}>Log Out</button>
                        </>
                    )}
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <div className="section-header">
                        <h2>Profile Information</h2>
                        {isOwnProfile && (
                            <button 
                                className={`edit-profile-btn ${isEditing ? 'cancel' : ''}`} 
                                onClick={handleEditToggle}
                            >
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                        )}
                    </div>
                    
                    {updateError && <div className="update-error">{updateError}</div>}
                    {updateSuccess && <div className="update-success">{updateSuccess}</div>}
                    
                    {isEditing ? (
                        <form className="edit-profile-form" onSubmit={handleProfileUpdate}>
                            <div className="form-group">
                                <label htmlFor="bio">Bio:</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={editedProfile.bio}
                                    onChange={handleInputChange}
                                    rows={4}
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="location">Location:</label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={editedProfile.location}
                                    onChange={handleInputChange}
                                    placeholder="Where are you from?"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="birth_date">Birth Date:</label>
                                <input
                                    type="date"
                                    id="birth_date"
                                    name="birth_date"
                                    value={editedProfile.birth_date}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <button type="submit" className="save-profile-btn">Save Changes</button>
                        </form>
                    ) : (
                        <div className="profile-info">
                            <p><strong>Username:</strong> {profileData.username}</p>
                            <p><strong>Member Since:</strong> {new Date(profileData.date_joined).toLocaleDateString()}</p>
                            <p><strong>Bio:</strong> {profileData.bio || 'No bio provided'}</p>
                            <p><strong>Location: </strong>{profileData.location || 'Not specified'}</p>
                            <p><strong>Birth Date: </strong>{profileData.birth_date ? new Date(profileData.birth_date).toLocaleDateString() : 'Not specified'}</p>
                            
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
                    )}
                </div>

                <div className="profile-section">
                    <h2>Saved Books</h2>
                    {loadingSavedBooks ? (
                        <p>Loading your saved books...</p>
                    ) : savedBooks.length > 0 ? (
                        <ul className="saved-books-list">
                            {savedBooks.map((book) => (
                                <li key={book.id} className="saved-book">
                                    {book.title} {book.author && `by ${book.author}`}
                                    <img src={search} className='goth_moom' onClick={() => search_book(book.id)}/>
                                    <img src={bin} className='goth_moom' onClick={() => remove_book(book.id)}/>

                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No saved books yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;