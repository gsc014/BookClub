import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import './style/bookpage.css';
import defaultCover from './pictures/no-results.png';

const Bookpage = () => {
    // Get the book ID from URL params and any state passed during navigation
    const { id } = useParams();
    const location = useLocation();

    // Get book data from state if available
    const stateBook = location.state?.book || null;

    // State variables
    const [book, setBook] = useState(stateBook);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(!stateBook);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userReview, setUserReview] = useState('');
    const [userRating, setUserRating] = useState(0);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [descriptionClass, setDescriptionClass] = useState('bookpage-description truncated');
    const [isbn, setIsbn] = useState('');

    const test = "https://bibsok.no/?mode=vt&pubsok_txt_0=";

    const fetchIsbn = () => {
        if (!book || !book.key) return;

        console.log(`Fetching ISBN for book key: ${book.key}`);
        axios.get(`http://127.0.0.1:8000/api/isbn/${book.key}`)
            .then(response => {
                console.log("ISBN received:", response.data);
                setIsbn(response.data);
            })
            .catch(error => {
                console.error('Error fetching ISBN:', error);
                // Don't show an error to the user, just log it
            });
    };

    // Fetch book data if not provided via state
    useEffect(() => {
        // If we don't have a book ID or we already have the book from state, don't fetch
        if (!id || (stateBook && stateBook.id === parseInt(id))) {
            return;
        }

        const fetchBookData = async () => {
            setLoading(true);
            try {
                console.log(`Fetching book data for ID: ${id}`);
                const response = await axios.get(`http://127.0.0.1:8000/api/book/${id}/`);
                console.log("Book data received:", response.data);
                setBook(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching book details:", err);
                setError("Failed to load book details");
            } finally {
                setLoading(false);
            }
        };

        fetchBookData();
    }, [id, stateBook]);

    // Fetch ISBN when book data is available
    useEffect(() => {
        if (book && book.key) {
            fetchIsbn();
        }
    }, [book]);

    // Fetch reviews for the book
    useEffect(() => {
        fetchReviews();
    }, [id]);

    const fetchReviews = async () => {
        if (!id) return;

        setReviewsLoading(true);
        try {
            console.log(`Fetching reviews for book ID: ${id}`);
            const response = await axios.get(`http://127.0.0.1:8000/api/reviews/${id}/`);
            console.log("Reviews received:", response.data);
            setReviews(response.data);
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setReviewsLoading(false);
        }
    };

    // Toggle description view

    const toggleDescription = () => {
        if (showFullDescription) {
            setDescriptionClass('bookpage-description animating-collapse');
            setTimeout(() => {
                setDescriptionClass('bookpage-description truncated');
                setShowFullDescription(false);
            }, 500);
        } else {
            setDescriptionClass('bookpage-description animating-expand');
            setTimeout(() => {
                setDescriptionClass('bookpage-description expanded');
                setShowFullDescription(true);
            }, 500);
        }
    };


    // Handle rating selection
    const handleRatingClick = (rating) => {
        setUserRating(rating);
    };

    // Handle review submission
    const handleReviewSubmit = async (e) => {
        e.preventDefault();

        if (!userRating) {
            alert("Please select a rating before submitting your review.");
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert("You must be logged in to submit a review.");
            return;
        }

        try {
            // Changed to use the correct endpoint from your URLs
            const response = await axios.post(
                `http://127.0.0.1:8000/api/reviewtest/${id}/`,
                {
                    rating: userRating,
                    text: userReview
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${authToken}`
                    }
                }
            );

            console.log("Review response:", response.data);

            // Since the backend only returns a success message and not the review object,
            // we need to create the review object ourselves
            const username = localStorage.getItem('username');
            const newReview = {
                rating: userRating,
                text: userReview,
                username: username || "You", // Fallback if username isn't stored
                created_at: new Date().toISOString(),
                book_id: parseInt(id)
            };

            // Add the new review to the beginning of the reviews list
            setReviews([newReview, ...reviews]);

            // Reset form
            setUserReview('');
            setUserRating(0);

            // Refresh reviews from server to get the complete data
            fetchReviews();

            // alert("Review submitted successfully!");

        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Failed to submit review. Please try again.");
        }
    };


    // Show loading state
    if (loading) {
        return (
            <div className="bookpage-loading">
                <div>Loading book details...</div>
            </div>
        );
    }

    // Show error state
    if (error || !book) {
        return (
            <div className="bookpage-error">
                <div>{error || "Book not found"}</div>
            </div>
        );
    }

    return (
        <div className="bookpage">
            {/* Book Header Section */}
            <div className="bookpage-header">
                <img
                    className="bookpage-cover"
                    src={`https://covers.openlibrary.org/b/id/${book.cover}-L.jpg`}
                    alt={`Cover of ${book.title}`}
                    onError={(e) => e.target.src = defaultCover}
                />

                <div className="bookpage-info">
                    <h1 className="bookpage-title">{book.title}</h1>
                    <h2 className="bookpage-author">
                        {typeof book.author === 'object' ? book.author.name : book.author}
                    </h2>

                    {/* External links */}
                    <div className="bookpage-external-links">
                        {isbn ? (
                            <a
                                href={`${test}${isbn}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="national-library-link"
                            >
                                <span className="link-icon">📚</span>
                                View on National Library
                            </a>
                        ) : (
                            <span className="no-isbn">ISBN not available</span>
                        )}
                    </div>

                    {/* Description section with expand/collapse functionality */}
                    <div className="description-container">
                        <div className={descriptionClass} data-testid="book-description">
                            {book.description || "No description available for this book."}
                        </div>
                        {book.description && book.description.length > 300 && (
                            <button
                                className="view-more-btn"
                                onClick={toggleDescription}
                            >
                                {showFullDescription ? "View Less" : "View More"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Review submission form */}
            <div className="bookpage-review">
                <h3>Write a Review</h3>

                <form onSubmit={handleReviewSubmit}>
                    <div className="star-rating">
                        <label>Your Rating:</label>
                        <div className="stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={`star ${star <= userRating ? 'filled' : ''}`}
                                    onClick={() => handleRatingClick(star)}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>

                    <textarea
                        className="bookpage-review-input"
                        placeholder="Share your thoughts about this book..."
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                    />

                    <button type="submit" className="bookpage-review-submit">
                        Submit Review
                    </button>
                </form>
            </div>

            {/* Reviews section */}
            <div className="bookpage-reviews">
                <h3>Reviews</h3>

                {reviewsLoading ? (
                    <div className="loading-reviews">Loading reviews...</div>
                ) : reviews.length > 0 ? (
                    reviews.map((review, index) => (
                        <div key={index} className="bookpage-review-item">
                            <div className="bookpage-review-rating">
                                <strong>{review.username}</strong>
                                <div className="stars">
                                    {[...Array(5)].map((_, i) => (
                                        <span
                                            key={i}
                                            className={`star ${i < review.rating ? 'filled' : ''}`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p>{review.text || "(No review text provided)"}</p>
                            <em>{new Date(review.creation_date).toLocaleDateString()}</em>
                        </div>
                    ))
                ) : (
                    <p>No reviews yet. Be the first to review this book!</p>
                )}
            </div>
        </div>
    );
};

export default Bookpage;