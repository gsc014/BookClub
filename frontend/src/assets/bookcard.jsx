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

const Bookcard = ({ book, isSmall = false }) => {
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likeStatus, setLikeStatus] = useState(null);

    const handleClick = () => {
        console.log("got book", book);
        navigate(`/books/${book.id}`, {state: { book }});
    };

    const likeBook = (e) => {
        e.stopPropagation();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert('You must be logged in to like a book.');
            return;
        }
        axios.post(
            `http://127.0.0.1:8000/api/add-book/${book.id}/`, 
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
            console.log("Book liked:", response.data);
            if(response.data.status === 'removed') {
                setIsLiked(false);
            }
            else {
                setIsLiked(true);
            }
            setTimeout(() => setLikeStatus(null), 2000);
        })
        .catch(error => {
            console.error("Error saving book:", error);
            setLikeStatus('error');
            setTimeout(() => setLikeStatus(null), 2000);
        });
    };

    const saveBook = (e) => {
        e.stopPropagation();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert('You must be logged in to save a book.');
            return;
        }
        axios.post(
            `http://127.0.0.1:8000/api/add-book/${book.id}/`, 
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
            console.log("Book saved:", response.data);
            if(response.data.status === 'removed') {
                setIsSaved(false);
            }
            else {
                setIsSaved(true);
            }
            setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch(error => {
            console.error("Error saving book:", error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 2000);
        });
    };

    const handleInfoClick = (e) => {
        e.stopPropagation();
        navigate(`/books/${book.id}`, {state: { book }});
    };

    if (isSmall) {
        return (
            <div className="book-card-small" onClick={handleClick}>
                <div className="book-card-small-content">
                    <img 
                        src={`https://covers.openlibrary.org/w/olid/${book.key}-M.jpg`}
                        alt={book.title || "Book Cover"}
                        className="book-cover-small"
                        onError={(e) => e.target.src = defaultCover}
                    />
                    <div className="book-info-small">
                        <h4 className="book-title-small">{book.title}</h4>
                        <p className="book-author-small">
                            {typeof book.author === 'object' ? book.author.name : book.author}
                        </p>
                        {book.avg_rating && (
                            <div className="book-rating">
                                <span className="rating-stars">★</span> 
                                <span className="rating-value">{book.avg_rating}</span>
                                <span className="rating-count">({book.review_count})</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="book-card" onClick={handleClick}>
            <img 
                src={`https://covers.openlibrary.org/w/olid/${book.key}-M.jpg`}
                alt={book.title || "Book Cover"}
                className="book-cover"
                onError={(e) => e.target.src = defaultCover}
            />
            <h3>{book.title}</h3>
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