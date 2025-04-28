import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './style/bookpage.css';
import StarRating from './starrating';
import Booklist from './booklist';

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
    const [isbn, setIsbn] = useState('');

    const maxLength = 500;
    const test = "https://bibsok.no/?mode=vt&pubsok_txt_0=";

    const fetchIsbn = () => {
        axios.get(`http://127.0.0.1:8000/api/isbn/${retrievedBook.key}`)
            .then(response => {
                setIsbn(response.data) 
            })
            .catch(error => console.error('Error fetching ISBN:', error));
    };

    const shortenText = (text) => {
        if (!text) return 'No description available.';
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    // Function to fetch reviews
    const fetchReviews = () => {
        axios.get(`http://127.0.0.1:8000/api/reviews/${book.id}`)
            .then(response => {
                console.log("Fetched reviews:", response.data);
                setReviews(response.data)
            })
            .catch(error => console.error('Error fetching reviews:', error));
    };

    useEffect(() => {
        // Fetch book details
        axios.get(`http://127.0.0.1:8000/api/book/${book.id}`)
            .then(response => {
                setBook(response.data)
                console.log("Book data:", response.data);
            })
            .catch(error => {
                console.error('Error fetching book details:', error);
                setBook({ error: 'Failed to fetch book details' });
            });
        // Fetch initial reviews
        fetchReviews();
    }, [book.id]);

    useEffect(() => {
        if (retrievedBook && retrievedBook.key) {  // Ensure the book data is loaded
            fetchIsbn();  // Only fetch ISBN when retrievedBook is not null
        }
    }, [retrievedBook]);  // Trigger this effect when retrievedBook changes
    

    if (retrievedBook?.error) {
        return <div className="bookpage-error">{retrievedBook.error}</div>;
    }

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
                rating: bookRating  // Make sure this is a number, not a string
            },
            {
                headers: {
                    'Authorization': `Token ${authToken}`,
                    'Content-Type': 'application/json'  // Add this line
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
                console.log("Updated reviews:", response.data);
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
                    <p className="bookpage-author">{typeof retrievedBook.author === 'object' ? retrievedBook.author.name : retrievedBook.author}</p>
                </div>
            </div>

            <div className="bookpage-external-links">
                {isbn ? (
                    <a 
                        href={`${test}${isbn}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="national-library-link"
                    >
                        <span className="link-icon">📚</span>
                        Search National Library
                    </a>
                ) : (
                    <p className="library-link-unavailable">ISBN not available</p>
                )}
            </div>

            {/* Use BookList for author's other works */}
            {retrievedBook.author_key && (
                <div className="author-other-books">
                    <Booklist 
                        title={`Books by ${typeof retrievedBook.author === 'object' ? retrievedBook.author.name : retrievedBook.author}`}
                        apiUrl="http://127.0.0.1:8000/api/books_by_author/"
                        params={{ key: retrievedBook.author_key }}
                        booksToShow={5}
                    />
                </div>
            )}

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
                            <div className="review-header">
                                <p className="review-username">
                                    <strong>{review.username || "Anonymous"}</strong>
                                </p>
                                <p className="review-rating">
                                    <strong>Rating:</strong> {review.rating}/5
                                </p>
                            </div>
                            <p className="review-text">{review.text}</p>
                            <p className="review-date">
                                <em>Posted on: {new Date(review.creation_date).toLocaleString()}</em>
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Bookpage;