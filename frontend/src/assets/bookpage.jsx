import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './bookpage.css';
import StarRating from './starrating';
import ProtectedRoute from '../ProtectedRoute';
import defaultCover from './pictures/no-results.png';
import { Link } from 'react-router-dom';  // Make sure to import Link for routing

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
        
        // Form validation
        if (!review.trim()) {
            setErrorMessage('Please write a review before submitting.');
            return;
        }
        
        if (bookRating === 0) {
            setErrorMessage('Please select a rating before submitting.');
            return;
        }
        
        // Disable submit button while processing
        setIsSubmitting(true);
        
        // Clear any existing messages
        setSuccessMessage('');
        setErrorMessage('');
        console.log("posting ", review, bookRating, book.id);
        const token = localStorage.getItem('authToken');


        axios.post(`http://127.0.0.1:8000/api/reviewtest/${book.id}/`, {
            text: review,
            rating: bookRating
        },
        { headers: { Authorization: `Token ${token}`} })
        .then(response => {
            console.log("Review added", response.data);
            
            // Clear the form after successful submission
            setReview('');
            setRating(0);
            setSuccessMessage('Your review has been submitted!');
            
            // Now fetch the updated reviews AFTER the submission is complete
            return axios.get(`http://127.0.0.1:8000/api/reviews/${book.id}`);
        })
        .then(response => {
            // Update the reviews state with new data
            setReviews(response.data);
        })
        .catch(error => {
            console.error("Error posting review", error);
            setErrorMessage('Failed to submit review. Please try again.');
        })
        .finally(() => {
            // Re-enable the submit button
            setIsSubmitting(false);
        });
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
            <ProtectedRoute>
            <div className="bookpage-reviews">
                <h3>Reviews:</h3>
                {reviews.length === 0 ? (
                    <p>No reviews yet. Be the first to add one!</p>
                ) : (
                    reviews.map((review, index) => (
                        <div key={index} className="bookpage-review-item">
                            <p><strong>Rating:</strong> {review.rating}</p>
                            <p>{review.text}</p>
                            <p>
                                <strong>By:</strong> 
                                <Link to={`/profile/${review.username}`}>{review.username}</Link> {/* Update this line */}
                            </p>

                            <p><em>Posted on: {review.created_at}</em></p>
                        </div>
                    ))
                )}
            </div>
            </ProtectedRoute>
        </div>
    );
};

export default Bookpage;