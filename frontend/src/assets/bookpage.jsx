import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './style/bookpage.css';
import StarRating from './starrating';

import defaultCover from './pictures/no-results.png';

const Bookpage = ({ book }) => {
    const [retrievedBook, setBook] = useState(null);
    const [review, setReview] = useState('');
    const [reviews, setReviews] = useState([]);
    const [bookRating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);

    const maxLength = 500;
    const shortenText = (text) => {
        if (!text) return 'No description available.';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    // Function to fetch reviews
    const fetchReviews = () => {
        axios.get(`http://127.0.0.1:8000/api/reviews/${book.id}`)
            .then(response => setReviews(response.data))
            .catch(error => console.error('Error fetching reviews:', error));
    };

    useEffect(() => {
        // Fetch book details
        axios.get(`http://127.0.0.1:8000/api/book/${book.id}`)
            .then(response => setBook(response.data))
            .catch(error => console.error('Error fetching book details:', error));

        // Fetch initial reviews
        fetchReviews();
    }, [book.id]);

    if (!retrievedBook) {
        return <div className="bookpage-loading">Loading book information...</div>;
    }

    const handleReviewChange = (e) => {
        setReview(e.target.value);
        // Clear any existing messages when user starts typing
        if (successMessage) setSuccessMessage('');
        if (errorMessage) setErrorMessage('');
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

        // Get the authentication token
        const authToken = localStorage.getItem('authToken');
        
        // Check if user is logged in
        if (!authToken) {
            setErrorMessage('You must be logged in to submit a review.');
            return;
        }

        // Disable submit button while processing
        setIsSubmitting(true);

        // Clear any existing messages
        setSuccessMessage('');
        setErrorMessage('');

        // Submit review to the server with authentication token
        axios.post(
            `http://127.0.0.1:8000/api/reviewtest/${book.id}/`, 
            {
                text: review,
                rating: bookRating
            },
            {
                headers: {
                    'Authorization': `Token ${authToken}`
                }
            }
        )
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
                
                if (error.response && error.response.status === 401) {
                    setErrorMessage('You need to log in again to submit a review.');
                } else {
                    setErrorMessage('Failed to submit review. Please try again.');
                }
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
                    src={`https://covers.openlibrary.org/b/id/${retrievedBook.cover}-L.jpg`}
                    alt={retrievedBook.title || "Book Cover"}
                    onError={(e) => e.target.src = defaultCover}
                />
                <div className="bookpage-info">
                    <h1 className="bookpage-title">{retrievedBook.title}</h1>
                    <div className="description-container">
                        <p className={`bookpage-description ${!isDescriptionExpanded && retrievedBook.description && retrievedBook.description.length > maxLength ? 'truncated' : 'expanded'}`}>
                            {isDescriptionExpanded
                                ? retrievedBook.description || "No description available."
                                : shortenText(retrievedBook.description || "")}
                        </p>
                        {retrievedBook.description && retrievedBook.description.length > maxLength && (
                            <button
                                className="view-more-btn"
                                onClick={() => setDescriptionExpanded(!isDescriptionExpanded)}
                                aria-expanded={isDescriptionExpanded}
                            >
                                {isDescriptionExpanded ? "View less" : "View more"}
                            </button>
                        )}
                    </div>
                    <p className="bookpage-author">{retrievedBook.author}</p>
                </div>
            </div>

            <div>
                <a href="https://bibsok.no/?mode=vt&pubsok_txt_0=0465045154" target="_blank">
                    Search national library
                </a>
            </div>


            <div className="bookpage-review">
                <h3>Write a Review</h3>

                {/* Display success or error messages */}
                {successMessage && <div className="review-success-message">{successMessage}</div>}
                {errorMessage && <div className="review-error-message">{errorMessage}</div>}

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
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
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