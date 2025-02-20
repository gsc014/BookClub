import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './searchbar.css';
import SearchResults from './searchresults';
import { redirect } from 'react-router-dom';

const Searchbar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const navigate = useNavigate();
    const goToSearchresults = () => {
        navigate('/searchresults');
    };

    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/search/?q=${query}`);
            // setResults(response.data);
            const results = response.data;
            navigate('/searchresults', { state: { results } });
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
            {results.length > 0 && <SearchResults results={results} />}
        </div>
    );
};
export default Searchbar;