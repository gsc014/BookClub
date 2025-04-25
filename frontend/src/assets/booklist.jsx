import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/bookcard.css';

const Booklist = ({ 
    title = "Recommended Books", 
    apiUrl = 'http://127.0.0.1:8000/api/random-book/', 
    params = {}, 
    booksToShow = 6 
}) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                // Use the provided API URL with the specified parameters
                const finalParams = { ...params };
                if (!finalParams.num) {
                    finalParams.num = booksToShow;
                }
                
                const authToken = localStorage.getItem('authToken');
                let response;
                
                if (!authToken) {
                    // Not logged in - use random books
                    response = await axios.get(apiUrl, { params: finalParams });
                } else {
                    // Logged in - use recommended books
                    response = await axios.get("http://127.0.0.1:8000/api/recommended-book/", {
                        params: finalParams,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${authToken}`
                        }
                    });
                }
                
                console.log(`Fetched books for ${title}:`, response.data);
                
                // Handle both single object and array responses
                if (Array.isArray(response.data)) {
                    setBooks(response.data);
                } else {
                    // If backend returns a single object instead of an array
                    setBooks([response.data]);
                }
            } catch (error) {
                console.error(`Error fetching books for ${title}:`, error);
                setError(`Failed to load ${title.toLowerCase()}`);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [apiUrl, JSON.stringify(params), booksToShow, title]);

    return (
        <section className="book-list-section">
            <h2>{title}</h2>
            
            {loading ? (
                <div className="loading-container">Loading {title.toLowerCase()}...</div>
            ) : error ? (
                <div className="error-container">{error}</div>
            ) : (
                <div className="book-list">
                    {books.length > 0 ? (
                        books.map(book => (
                            <Bookcard key={book.id} book={book} />
                        ))
                    ) : (
                        <div className="no-books">No {title.toLowerCase()} available</div>
                    )}
                </div>
            )}
        </section>
    );
};

export default Booklist;