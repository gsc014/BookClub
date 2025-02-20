import React, { useState } from 'react';
import Bookcard from './bookcard'
import './bookcard.css';
import './searchresults.css';

const SearchResults = ({ results }) => {

    return (
        <section id="search-results">
            <h2>Search Results</h2>
            <div className='book-list'>
                {results.map((book) => (
                    <Bookcard key={book.id} book={book} />
                ))}
            </div>
        </section>
    );
};

export default SearchResults;