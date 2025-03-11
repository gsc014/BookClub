import React, { useState } from 'react';
import Bookcard from './bookcard'
import './style/bookcard.css';
import './style/searchresults.css';

const SearchResults = ({ results }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [resultsPerPage, setResultsPerPage] = useState(10);

    // Calculate total pages
    const totalPages = Math.ceil(results.length / resultsPerPage);

    // Get current page's results
    const startIndex = (currentPage - 1) * resultsPerPage;
    const currentResults = results.slice(startIndex, startIndex + resultsPerPage);

    const handleResultsPerPageChange = (event) => {
        setResultsPerPage(Number(event.target.value));
        setCurrentPage(1); // Reset to the first page when changing results per page
    };

    return (
        <section id="search-results">
            <h2>Search Results</h2>
            <div className="results-per-page">
                <label htmlFor="results-per-page">Results per page:</label>
                <select
                    id="results-per-page"
                    value={resultsPerPage}
                    onChange={handleResultsPerPageChange}
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>
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