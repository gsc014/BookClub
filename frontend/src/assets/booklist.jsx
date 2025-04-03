import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/bookcard.css';

const Booklist = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Number of books to display in the first row
    const booksToShow = 6;  // Adjust this number based on your design

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                // Only fetch the number we need to show
                const authToken = localStorage.getItem('authToken');
                
                const response = await axios.get('http://127.0.0.1:8000/recommended_books/', {
                    params: { num: booksToShow },
                    headers: {
                        "Authorization": `Token ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log("Fetched books:", response.data);
                
                // Handle both single object and array responses
                if (Array.isArray(response.data)) {
                    setBooks(response.data);
                } else {
                    // If backend returns a single object instead of an array
                    setBooks([response.data]);
                }
            } catch (error) {
                console.error('Error fetching books:', error);
                setError('Failed to load recommended books');
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, []);

    return (
        <section id="recommended">
            <h2>Recommended Books</h2>
            
            {loading ? (
                <div className="loading-container">Loading recommended books...</div>
            ) : error ? (
                <div className="error-container">{error}</div>
            ) : (
                <div className="book-list">
                    {books.length > 0 ? (
                        books.map(book => (
                            <Bookcard key={book.id} book={book} />
                        ))
                    ) : (
                        <div className="no-books">No recommended books available</div>
                    )}
                </div>
            )}
        </section>
    );
};

export default Booklist;