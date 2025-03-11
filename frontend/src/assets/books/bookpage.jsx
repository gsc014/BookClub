import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './style/bookpage.css';
import StarRating from '../starrating';

import defaultCover from '/home/alexander/BookClub/frontend/src/assets/pictures/no-results.png';
const Bookpage = ({ book }) => {
    const [retrievedBook, setBook] = useState(null);
    const [review, setReview] = useState('');
    const [reviews, setReviews] = useState([]);
    const [bookRating, setRating] = useState(0);

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/book/${book.id}`)
        .then(response => setBook(response.data))
        .catch(error => console.error('Error fetching settings:', error));

        axios.get(`http://127.0.0.1:8000/api/reviews/${book.id}`)
        .then(response => setReviews(response.data))
        .catch(error => console.error('Error fetching reviews:', error));

    }, [book.id]);


    if (!retrievedBook) {
        return <div>Loading...</div>;
    }

    const handleReviewChange = (e) => {
        setReview(e.target.value);  // Update review state when input changes
    };

    const handleReviewSubmit = (e) => {
        e.preventDefault();
        // Call backend to post the review (not implemented yet)
        console.log("Submitting review:", review);
        axios.post(`http://127.0.0.1:8000/api/reviewtest/${book.id}/`, 
        { text: review, rating: bookRating } )
        .then(response => console.log("Review added!", response.data))
        .catch(error => console.error("Error posting review", error));
    };

    return (
        <div className="bookpage">
            <div className="bookpage-header">
                <img 
                    className="bookpage-cover" 
                    src={`https://covers.openlibrary.org/b/id/${retrievedBook.id}-L.jpg`} 
                    alt={retrievedBook.title || "Book Cover"} 
                    onError={(e) => e.target.src = defaultCover} // Optional fallback image
                />
                <div className="bookpage-info">
                    <h1 className="bookpage-title">{retrievedBook.title}</h1>
                    <p className="bookpage-description">{retrievedBook.description || "No description available."}</p>
                    <p className="bookpage-author">{retrievedBook.author}</p>
                </div>
            </div>
            <div className="bookpage-review">
                <textarea
                    className="bookpage-review-input"
                    placeholder="Write your review here..."
                    value={review}
                    onChange={handleReviewChange}
                />
                <StarRating rating={bookRating} setRating={setRating} />
                <button 
                    className="bookpage-review-submit"
                    onClick={handleReviewSubmit}
                >
                    Submit Review
                </button>
            </div>
            <div className="bookpage-reviews">
                <h3>Reviews:</h3>
                {reviews.length === 0 ? (
                    <p>No reviews yet. Be the first to add one!</p>
                ) : (
                    reviews.map((review, index) => (
                        <div key={index} className="bookpage-review-item">
                            <p><strong>Rating:</strong> {review.rating}</p>
                            <p>{review.text}</p>
                            <p><em>Posted on: {new Date(review.created_at).toLocaleDateString()}</em></p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Bookpage;