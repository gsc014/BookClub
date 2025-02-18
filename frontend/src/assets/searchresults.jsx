import React, { useState } from 'react';
import './searchresults.css';

const SearchResults = ({ results }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const resultsPerPage = 10;

    // Calculate the indices for the current page
    const indexOfLastResult = currentPage * resultsPerPage;
    const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    const currentResults = results.slice(indexOfFirstResult, indexOfLastResult);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="search-results-container">
            <ul className="search-results-list">
                {currentResults.map((result) => (
                    <li key={result.id} className="search-result-item">
                        <h3>{result.title}</h3>
                        <p>{result.author}</p>
                    </li>
                ))}
            </ul>
            <div className="pagination-container">
                <div className="pagination">
                    {Array.from({ length: Math.ceil(results.length / resultsPerPage) }, (_, index) => (
                        <button key={index + 1} onClick={() => paginate(index + 1)}>
                            {index + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchResults;