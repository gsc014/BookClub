import React, { useState } from 'react';
import Bookcard from './bookcard'
import './bookcard.css';
import './searchresults.css';

const SearchResults = ({ results }) => {
    // const [currentPage, setCurrentPage] = useState(1);
    // const resultsPerPage = 10;

    // // Calculate the indices for the current page
    // const indexOfLastResult = currentPage * resultsPerPage;
    // const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    // const currentResults = results.slice(indexOfFirstResult, indexOfLastResult);

    // // Change page
    // const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <section id="search-results">
            <h2>Search Results</h2>
            <div className='row'>
                {results.map((book) => (
                    <Bookcard key={book.id} book={book} />
                ))}
            </div>
        </section>
    );
};

export default SearchResults;