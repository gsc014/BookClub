import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isLoggedIn, getCurrentUsername, fetchProfileData, logout } from '../utils';
import './style/ProfilePage.css';
import axios from 'axios';
import search from './pictures/search.png';
import bin from './pictures/bin.png';

function ProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
    const [likedBooks, setLikedBooks] = useState([]);
    const [loadingLikedBooks, setLoadingLikedBooks] = useState(true);
    const [goth, setGoth] = useState(false);
    const [otherUserLikedBooks, setOtherUserLikedBooks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        if (!isLoggedIn()) {
            navigate('/');
            return;
        }
    }, [navigate]);
    
    useEffect(() => {
        console.log("HELLO!\n");
    }, [goth]);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            return;
        }
        fetchSavedBooks();
        fetchLikedBooks();
    }, []);

    useEffect(() => {
        if (!isLoggedIn()) return;
        setLoading(true);
        fetchProfileData(username)
            .then(data => {
                setProfileData(data);
                setEditedProfile({
                    bio: data.bio || '',
                    location: data.location || '',
                    birth_date: data.birth_date || ''
                });
                setLoading(false);
                if (getCurrentUsername() === username) {
                    fetchBookList("Saved Books");
                    fetchBookList("Liked Books");
                } else {
                    fetchOtherUserBookList(username);
                }
            })
            .catch(err => {
                setError(`Failed to load profile data: ${err.message}`);
                setLoading(false);
                if (err.message.includes('Authentication failed')) {
                    navigate('/');
                }
            });
    }, [username, navigate]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchRef]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const search_book = (id) => {
        navigate('/books/' + id);
    }

    const remove_saved_book = (id) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert('You must be logged in to remove a book.');
            return;
        }
        setSavedBooks(currentBooks => currentBooks.filter(book => book.id !== id));
        axios.post(
            `http://127.0.0.1:8000/api/add-book/${id}/`, 
            {},
            {
                params: { name: "Saved Books" },
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => {
            if (response.data.status !== 'removed') {
                fetchSavedBooks();
            }
        })
        .catch(error => {
            fetchSavedBooks();
        });
    };

    const remove_liked_book = (id) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert('You must be logged in to remove a liked book.');
            return;
        }
        setLikedBooks(currentBooks => currentBooks.filter(book => book.id !== id));
        axios.post(
            `http://127.0.0.1:8000/api/add-book/${id}/`, 
            {},
            {
                params: { name: "Liked Books" },
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => {
            if (response.data.status !== 'removed') {
                fetchLikedBooks();
            }
        })
        .catch(error => {
            fetchLikedBooks();
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
        axios.post('http://127.0.0.1:8000/api/update-profile/', editedProfile, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            setUpdateSuccess('Profile updated successfully!');
            setProfileData(prev => ({
                ...prev,
                ...editedProfile
            }));
            setIsEditing(false);
        })
        .catch(err => {
            setUpdateError(err.response?.data?.error || 'Failed to update profile');
        });
    };
    
    const handleGoToSettings = () => {
        navigate('/settings');
    };

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
            setSavedBooks(response.data);
            setLoadingSavedBooks(false);
        })
        .catch(err => {
            setLoadingSavedBooks(false);
        });
    };

    const fetchLikedBooks = () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        setLoadingLikedBooks(true);
        axios.get('http://localhost:8000/api/book-list/', {
            params: { name: "Liked Books" },
            headers: {
                "Authorization": `Token ${authToken}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            setLikedBooks(response.data);
            setLoadingLikedBooks(false);
        })
        .catch(err => {
            setLoadingLikedBooks(false);
        });
    };

    const fetchBookList = (listName) => {
        const authToken = localStorage.getItem('authToken');
        axios.get(`http://127.0.0.1:8000/api/saved-books/?name=${listName}`, {
            headers: {
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            if (listName === "Saved Books") {
                setSavedBooks(response.data);
            } else if (listName === "Liked Books") {
                setLikedBooks(response.data);
            }
        })
        .catch(error => {});
    };

    const fetchOtherUserBookList = (username) => {
        const authToken = localStorage.getItem('authToken');
        axios.get(`http://127.0.0.1:8000/api/saved-books/?name=Liked Books&username=${username}`, {
            headers: {
                'Authorization': `Token ${authToken}`
            }
        })
        .then(response => {
            setOtherUserLikedBooks(response.data);
        })
        .catch(error => {});
    };

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 0) {
            setIsSearching(true);
            searchProfiles(query);
            setShowResults(true);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    };

    const searchProfiles = (query) => {
        axios.get(`http://127.0.0.1:8000/api/autocomplete-profile/?query=${encodeURIComponent(query)}`)
            .then(response => {
                setSearchResults(response.data);
                setIsSearching(false);
            })
            .catch(error => {
                setIsSearching(false);
            });
    };

    const goToProfile = (username) => {
        setSearchQuery('');
        setShowResults(false);
        navigate(`/profile/${username}`);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/profile/${searchQuery.trim()}`);
            setSearchQuery('');
            setShowResults(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-page loading">
                <h2>Loading profile...</h2>
                <p>Please wait while we retrieve the profile information.</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="profile-page error">
                <h2>Error Loading Profile</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
        );
    }
    
    const currentUser = getCurrentUsername();
    const isOwnProfile = currentUser === username;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>{profileData.username}'s Profile</h1>
                <div className="profile-actions">
                <div className="profile-search-container" ref={searchRef}>
                <form onSubmit={handleSearchSubmit} className="profile-search-form">
                    <input
                        type="text"
                        placeholder="Search for profiles..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="profile-search-input"
                    />
                    <button type="submit" className="profile-search-button">
                        <img src={search} alt="Search" />
                    </button>
                    {showResults && (
                        <div className="profile-search-results" data-testid="profile-search-results">
                            {isSearching ? (
                                <div className="search-loading">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div 
                                        key={user.id} 
                                        className="search-result-item"
                                        onClick={() => goToProfile(user.username)}
                                    >
                                        {user.username}
                                    </div>
                                ))
                            ) : (
                                <div className="no-results">No profiles found</div>
                            )}
                        </div>
                    )}
                </form>
            </div>
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
                        <form className="edit-profile-form" onSubmit={handleProfileUpdate} aria-label="Edit profile form">
                            <label htmlFor="bio">Bio:</label>
                            <div className="form-group">
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={editedProfile.bio}
                                    onChange={handleInputChange}
                                    rows={4}
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                            
                            <label htmlFor="location">Location:</label>
                            <div className="form-group">
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={editedProfile.location}
                                    onChange={handleInputChange}
                                    placeholder="Where are you from?"
                                />
                            </div>
                            
                            <label htmlFor="birth_date">Birth Date:</label>
                            <div className="form-group">
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
                {isOwnProfile && (
                    <div className="profile-section">
                        <h2>Saved Books</h2>
                        {loadingSavedBooks ? (
                            <p>Loading your saved books...</p>
                        ) : savedBooks.length > 0 ? (
                            <ul className="saved-books-list">
                                {savedBooks.map((book) => (
                                    <li key={book.id} className="saved-book">
                                        {book.title} {book.author && `by ${book.author}`}
                                        <div className="book-actions">
                                            <img src={search} className='img_style' onClick={() => search_book(book.id)} alt="View details" />
                                            <img src={bin} className='img_style' onClick={() => remove_saved_book(book.id)} alt="Remove" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No saved books yet.</p>
                        )}
                    </div>
                )}
                {isOwnProfile && (
                    <div className="profile-section">
                        <h2>Liked Books</h2>
                        {loadingLikedBooks ? (
                            <p>Loading your liked books...</p>
                        ) : likedBooks.length > 0 ? (
                            <ul className="liked-books-list">
                                {likedBooks.map((book) => (
                                    <li key={book.id} className="liked-book">
                                        {book.title} {book.author && `by ${book.author}`}
                                        <div className="book-actions">
                                            <img src={search} className='img_style' onClick={() => search_book(book.id)} alt="View details" />
                                            <img src={bin} className='img_style' onClick={() => remove_liked_book(book.id)} alt="Remove" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No liked books yet.</p>
                        )}
                    </div>
                )}
                {!isOwnProfile && (
                    <div className="profile-section">
                        <h2>{username}'s Liked Books</h2>
                        {otherUserLikedBooks.length > 0 ? (
                            <ul className="liked-books-list">
                                {otherUserLikedBooks.map((book) => (
                                    <li key={book.id} className="liked-book">
                                        {book.title} {book.author && `by ${book.author}`}
                                        <div className="book-actions">
                                            <img src={search} className='img_style' onClick={() => search_book(book.id)} alt="View details" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No liked books yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePage;