// src/components/BookCard/BookCard.jsx
import React from 'react';

const BookCard = ({ book }) => {
  return (
    <li>
      <div className="book-card">
        <img src={book.cover} alt="Book Cover" />
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <button className="button">Review</button>
      </div>
    </li>
  );
};

export default BookCard;