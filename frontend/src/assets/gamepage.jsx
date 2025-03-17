import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GamePage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/random_book?num=5')
            .then(response => {
                setBooks(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching random books:', error);
                setError('Failed to fetch books. Please try again later.');
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (books.length === 0) return <div>No books available.</div>;

    const correctBook = books[0];

    return (
        <div>
            <h1>Guess the Book</h1>
            <p>{correctBook.description}</p>
            <ul>
                {books.map((book, index) => (
                    <li key={index}>{book.title}</li>
                ))}
            </ul>
        </div>
    );
};

export default GamePage;