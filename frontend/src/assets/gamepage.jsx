import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './style/GamePage.css';

const GamePage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [buttonsDisabled, setButtonsDisabled] = useState(false);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = () => {
        setLoading(true);
        axios.get('http://127.0.0.1:8000/random-book?num=5')
            .then(response => {
                const booksWithCorrectFlag = response.data.map((book, index) => ({
                    ...book,
                    is_correct: index === 0
                }));
                const shuffledBooks = shuffleArray(booksWithCorrectFlag);
                setBooks(shuffledBooks);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching random books:', error);
                setError('Failed to fetch books. Please try again later.');
                setLoading(false);
            });
    };

    const shuffleArray = (array) => {
        return array.sort(() => Math.random() - 0.5);
    };

    const handleBookClick = (book) => {
        if (buttonsDisabled || selectedBook) return; // Prevent multiple clicks or clicking after selection
        setButtonsDisabled(true);
        setSelectedBook(book);
        if (book.is_correct) {
            setIsCorrect(true);
            setCorrectCount(correctCount + 1);
            if (correctCount + 1 > highScore) {
                setHighScore(correctCount + 1);
            }
            setTimeout(() => {
                setButtonsDisabled(false);
                setSelectedBook(null);
                fetchBooks();
            }, 0); 
        } else {
            setIsCorrect(false);
            setGameOver(true);
        }
    };

    const handleRestart = () => {
        setGameOver(false);
        setCorrectCount(0);
        setSelectedBook(null);
        setIsCorrect(null);
        setButtonsDisabled(false);

        const resetBooks = books.map(book => ({ ...book, is_correct: false }));
        if (resetBooks.length > 0) {
            resetBooks[0].is_correct = true; // Ensure the first book is correct
        }
        setBooks(shuffleArray(resetBooks));
    };

    const correctBook = books.find(book => book.is_correct);

    return (
        <div className="game-page">
            <h1>Guess the Book</h1>
            {gameOver ? (
                <div className="game-over">
                    <p>Game Over! Your streak was: {correctCount}</p>
                    <button onClick={handleRestart} className="restart-button">Try Again</button>
                </div>
            ) : (
                <>
                    {correctBook && <p>{correctBook.description}</p>}
                    <div className="book-buttons">
                        {books.map((book, index) => (
                            <button
                                key={index}
                                onClick={() => handleBookClick(book)}
                                className="book-button"
                                disabled={buttonsDisabled || selectedBook === book} // Disable button if already selected
                            >
                                {book.title}
                            </button>
                        ))}
                    </div>
                    {selectedBook && (
                        <div className="result">
                            {isCorrect ? <p>Correct!</p> : <p>Incorrect. Try again!</p>}
                        </div>
                    )}
                    <div className="score">
                        <p>Current Streak: {correctCount}</p>
                        <p>High Score: {highScore}</p>
                    </div>
                    {loading && <div>Loading new books...</div>}
                    {error && <div>{error}</div>}
                </>
            )}
        </div>
    );
};

export default GamePage;