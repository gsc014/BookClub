import React, { useState } from 'react';
import axios from 'axios';
import './searchbar.css';

const Searchbar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/search/?q=${query}`);
            console.log('Search results:', response.data); // Log the response data
            setResults(response.data);
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    return (
        <div className="search-bar-container">
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search for books..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button id="search_button" className="button" onClick={handleSearch}>
                    Search
                </button>
            </div>
            <div className="search-results">
                {results.map((result) => (
                    <div key={result.id} className="search-result-item">
                        <h3>{result.title}</h3>
                        <p>{result.author}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Searchbar;