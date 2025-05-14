import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import Bookcard from './bookcard';
import './style/bookcard.css';
import './style/searchresults.css';

const SearchResults = () => {
    const location = useLocation();
    const initialResults = location.state?.initialResults || [];
    const initialFilter = location.state?.initialFilter || '';
    const isSearchQuery = location.state?.isSearchQuery || false;

    const [books, setBooks] = useState(initialResults);
    const [currentPage, setCurrentPage] = useState(1);
    const [resultsPerPage, setResultsPerPage] = useState(10);
    const [totalBooks, setTotalBooks] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState(initialFilter);

    useEffect(() => {
        console.log("Initial filter:", initialFilter);
        console.log("Initial results:", initialResults);
        console.log("Is search query:", isSearchQuery);
    }, [initialFilter, initialResults, isSearchQuery]);

    useEffect(() => {
        if (location.state?.initialResults?.length > 0) {
            setBooks(location.state.initialResults);
            if (location.state.initialFilter) {
                setFilter(location.state.initialFilter);
            }
        }
    }, [location.state]);

    useEffect(() => {
        const fetchBooks = async () => {
            if (!filter) return;
            setLoading(true);
            setError(null);
            try {
                const endpoint = isSearchQuery ? 'search' : 'filter';
                const paramName = isSearchQuery ? 'q' : 'filter';
                const response = await axios.get(`http://127.0.0.1:8000/api/${endpoint}/`, {
                    params: {
                        [paramName]: filter,
                        page: currentPage,
                        per_page: resultsPerPage
                    }
                });
                if (response.data && response.data.results) {
                    setBooks(response.data.results);
                    if (response.data.pagination) {
                        setTotalBooks(response.data.pagination.total_books);
                        setTotalPages(response.data.pagination.total_pages);
                    }
                } else {
                    console.error("Unexpected API response format:", response.data);
                    setError("Invalid data format received from server");
                    setBooks([]);
                }
            } catch (err) {
                console.error('Error fetching books:', err);
                setError('Failed to load books. Please try again.');
                setBooks([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, [filter, currentPage, resultsPerPage, isSearchQuery]);

    const handleResultsPerPageChange = (event) => {
        setResultsPerPage(Number(event.target.value));
        setCurrentPage(1);
    };

    return (
        <section id="search-results">
            <h2>
                {filter ? `"${filter}" Search Results` : "Search Results"}
                {totalBooks > 0 && ` (${totalBooks})`}
            </h2>
            
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
            
            {loading ? (
                <div className="loading-spinner">Loading...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : books.length === 0 ? (
                <div className="no-results">No books found matching your criteria</div>
            ) : (
                <div className="book-list">
                    {books.map((book) => (
                        <Bookcard key={book.id} book={book} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => setCurrentPage(currentPage - 1)} 
                        disabled={currentPage === 1 || loading}
                    >
                        Previous
                    </button>

                    <span> Page {currentPage} of {totalPages} </span>

                    <button 
                        onClick={() => setCurrentPage(currentPage + 1)} 
                        disabled={currentPage === totalPages || loading}
                    >
                        Next
                    </button>
                </div>
            )}
        </section>
    );
};

export default SearchResults;