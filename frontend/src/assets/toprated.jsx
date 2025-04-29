import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/toprated.css';

const TopRatedBooks = ({ limit = 5 }) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTopRatedBooks = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://127.0.0.1:8000/api/highest-rated/', {
                    params: { num: limit }
                });
                
                console.log("Top rated books:", response.data);
                setBooks(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching top rated books:", err);
                setError("Failed to load top rated books");
                setLoading(false);
            }
        };

        fetchTopRatedBooks();
    }, [limit]);

    return (
        <div className="top-rated-container">
            <h3 className="top-rated-title">Top Rated Books</h3>
            
            {loading ? (
                <div className="top-rated-loading">Loading top books...</div>
            ) : error ? (
                <div className="top-rated-error">{error}</div>
            ) : books.length > 0 ? (
                <div className="top-rated-list">
                    {books.map(book => (
                        <Bookcard 
                            key={book.id} 
                            book={book}
                            isSmall={true} 
                        />
                    ))}
                </div>
            ) : (
                <div className="top-rated-empty">No rated books found</div>
            )}
        </div>
    );
};

export default TopRatedBooks;