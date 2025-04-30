import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/sidebar-widget.css';

const MostLikedBooks = ({ limit = 5 }) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMostLikedBooks = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://127.0.0.1:8000/api/most-liked/', {
                    params: { num: limit }
                });
                
                console.log("Most liked books:", response.data);
                setBooks(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching most liked books:", err);
                setError("Failed to load popular books");
                setLoading(false);
            }
        };

        fetchMostLikedBooks();
    }, [limit]);

    return (
        <div className="sidebar-widget">
            <h3 className="widget-title">Most Popular Books</h3>
            
            {loading ? (
                <div className="widget-loading">Loading popular books...</div>
            ) : error ? (
                <div className="widget-error">{error}</div>
            ) : books.length > 0 ? (
                <div className="widget-list">
                    {books.map(book => (
                        <div key={book.id} className="liked-book-card">
                            <Bookcard 
                                book={book}
                                isSmall={true} 
                            />
                            <div className="like-count">
                                <span className="heart-icon">❤️</span> 
                                <span className="like-number">{book.likes_count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="widget-empty">No popular books found</div>
            )}
        </div>
    );
};

export default MostLikedBooks;