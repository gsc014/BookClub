import React, { useState } from 'react';
import './style/bookcard.css';
import saveIcon from './pictures/diskette.png';
import savedIcon from './pictures/diskette_saved.png';
import informationIcon from './pictures/file.png';
import defaultCover from './pictures/no-results.png';
import hearted from './pictures/heart.png';
import heart from './pictures/hearted.png';
import { useNavigate } from "react-router-dom";
import axios from 'axios';

const Bookcard = ({ book }) => {
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeStatus, setLikeStatus] = useState(null);

    const handleClick = () => {
        navigate(`/books/${book.id}`, {state: { book }});
    };

    const likeBook = (e) => {
        // Prevent the click from propagating to the parent div
        e.stopPropagation();
        
        const authToken = localStorage.getItem('authToken');
        
        // Check if user is logged in
        if (!authToken) {
            alert('You must be logged in to like a book.');
            return;
        }

        setLikeStatus('liking');

        axios.post(
            `http://127.0.0.1:8000/api/add-book/${book.id}/`, 
            {}, // Empty object as body
            {
                params: { name: "Liked Books" },
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => {
            console.log("Book liked:", response.data);
            if(response.data.status === 'removed') {
                setIsLiked(false);
            }
            else {
                setIsLiked(true);
            }
            setLikeStatus('liked');
            
            // Optional: Show a temporary success message
            setTimeout(() => setLikeStatus(null), 2000);
        })
        .catch(error => {
            console.error("Error saving book:", error);
            setLikeStatus('error');
            
            // Optional: Show a temporary error message
            setTimeout(() => setLikeStatus(null), 2000);
        });
    };


    const saveBook = (e) => {
        // Prevent the click from propagating to the parent div
        e.stopPropagation();
        
        const authToken = localStorage.getItem('authToken');
        
        // Check if user is logged in
        if (!authToken) {
            alert('You must be logged in to save a book.');
            return;
        }

        setSaveStatus('saving');

        axios.post(
            `http://127.0.0.1:8000/api/add-book/${book.id}/`, 
            {}, // Empty object as body
            {
                params: { name: "Saved Books" },
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(response => {
            console.log("Book saved:", response.data);
            if(response.data.status === 'removed') {
                setIsSaved(false);
            }
            else {
                setIsSaved(true);
            }
            setSaveStatus('saved');
            
            // Optional: Show a temporary success message
            setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch(error => {
            console.error("Error saving book:", error);
            setSaveStatus('error');
            
            // Optional: Show a temporary error message
            setTimeout(() => setSaveStatus(null), 2000);
        });
    };

    const handleInfoClick = (e) => {
        e.stopPropagation(); // Prevent triggering the parent onClick
        navigate(`/books/${book.id}`, {state: { book }});
    };

    return (
        <div className="book-card" onClick={handleClick}>
            <img 
                src={defaultCover} // {`https://covers.openlibrary.org/w/olid/${book.key}-L.jpg`} 
                alt={book.title || "Book Cover"}
                className="book-cover"
                onError={(e) => e.target.src = defaultCover} // Fallback if image fails to load
            />
            <h3>{book.title}</h3>
            
            {/* Save button with status feedback */}
            <div className="book-actions">
            <button 
                    className={`save-button icon_bookcard jump ${isLiked ? 'liked' : ''} ${likeStatus}`}
                    onClick={likeBook}
                    title={isLiked ? "Book liked" : "Like book"}
                >
                    {likeStatus === 'liking' && <span className="save-status">Liking...</span>}
                    {likeStatus === 'liked' && <span className="save-status">Liked!</span>}
                    {likeStatus === 'error' && <span className="save-status">Error!</span>}
                    <img src={isLiked ? heart : hearted} alt="Like" />
                </button>

                <button 
                    className={`save-button icon_bookcard jump ${isSaved ? 'saved' : ''} ${saveStatus}`}
                    onClick={saveBook}
                    title={isSaved ? "Book saved" : "Save book"}
                >
                    {saveStatus === 'saving' && <span className="save-status">Saving...</span>}
                    {saveStatus === 'saved' && <span className="save-status">Saved!</span>}
                    {saveStatus === 'error' && <span className="save-status">Error!</span>}
                    <img src={isSaved ? savedIcon : saveIcon} alt="Save" />
                </button>
                
                <button 
                    className="info-button icon_bookcard jump"
                    onClick={handleInfoClick}
                    title="Book information"
                >
                    <img src={informationIcon} alt="Info" />
                </button>
            </div>
        </div>
    );
};

export default Bookcard;