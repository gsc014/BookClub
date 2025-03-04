import React, { useState } from 'react';
import Bookcard from './bookcard'
import './bookcard.css';
import './searchresults.css';

const SearchResults = ({ results }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;

    // Calculate total pages
    const totalPages = Math.ceil(results.length / resultsPerPage);

    // Get current page's results
    const startIndex = (currentPage - 1) * resultsPerPage;
    const currentResults = results.slice(startIndex, startIndex + resultsPerPage);

    return (
        <section id="search-results">
            <h2>Search Results</h2>
            <div className="book-list">
                {currentResults.map((book) => (
                    <Bookcard key={book.id} book={book} />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
                <button 
                    onClick={() => setCurrentPage(currentPage - 1)} 
                    disabled={currentPage === 1}
                >
                    Previous
                </button>

                <span> Page {currentPage} of {totalPages} </span>

                <button 
                    onClick={() => setCurrentPage(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </section>
    );
};


export default SearchResults;