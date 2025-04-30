import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/bookcard.css';
import './style/booklist.css';

const Booklist = ({ 
    title = "Recommended Books", 
    apiUrl = 'http://127.0.0.1:8000/api/random-book/', 
    params = {}, 
    booksToShow = 5
}) => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);

    // Calculate optimal number of books based on screen width
    const calculateOptimalBooksCount = () => {
        const bookCardWidth = 250; // width + padding + border
        const gap = 40; // gap in pixels
        
        const containerWidth = window.innerWidth - 40; // 40px for container padding
        const booksPerRow = Math.max(1, Math.floor(containerWidth / (bookCardWidth + gap)));
        
        // Request enough books to fill 2 rows
        return booksPerRow * 3;
    };

    useEffect(() => {
        // Handle window resize
        const handleResize = () => {
            setScreenWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            try {
                // Calculate optimal number of books based on screen width
                const optimalBooksCount = calculateOptimalBooksCount();
                
                // Use the provided API URL with the specified parameters
                const finalParams = { ...params };
                finalParams.num = optimalBooksCount;
                
                const authToken = localStorage.getItem('authToken');
                let response;
                
                // Only use recommended-book for the default home page recommendations
                if (!authToken && apiUrl === 'http://127.0.0.1:8000/api/random-book/') {
                    // Not logged in - use random books from default URL
                    response = await axios.get(apiUrl, { params: finalParams });
                } else if (authToken && apiUrl === 'http://127.0.0.1:8000/api/random-book/') {
                    // Logged in and using default URL - use recommended books
                    response = await axios.get("http://127.0.0.1:8000/api/recommended-book/", {
                        params: finalParams,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${authToken}`
                        }
                    });
                } else {
                    // For all other cases, use the provided apiUrl
                    const config = authToken ? {
                        params: finalParams,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${authToken}`
                        }
                    } : { params: finalParams };
                    
                    response = await axios.get(apiUrl, config);
                }
                
                console.log(`Fetched books for ${title} from ${apiUrl}:`, response.data);
                
                // Handle both single object and array responses
                if (Array.isArray(response.data)) {
                    setBooks(response.data);
                } else {
                    // If backend returns a single object instead of an array
                    setBooks([response.data]);
                }
            } catch (error) {
                console.error(`Error fetching books for ${title} from ${apiUrl}:`, error);
                setError(`Failed to load ${title.toLowerCase()}`);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [apiUrl, JSON.stringify(params), screenWidth, title]);

    return (
        <section className="booklist-container">
            <h2 className="booklist-title">{title}</h2>
            
            {loading ? (
                <div className="booklist-loading">Loading {title.toLowerCase()}...</div>
            ) : error ? (
                <div className="booklist-error">{error}</div>
            ) : (
                <div className="booklist-grid">
                    {books.length > 0 ? (
                        books.map(book => (
                            <Bookcard key={book.id} book={book} />
                        ))
                    ) : (
                        <div className="booklist-empty">No {title.toLowerCase()} available</div>
                    )}
                </div>
            )}
        </section>
    );
};

export default Booklist;