import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './searchbar.css';
import SearchResults from './searchresults';
import { redirect } from 'react-router-dom';

const Searchbar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();
   
    
    useEffect(() => {
        if(query.length < 5){ setSuggestions([]); return; }

        axios.get(`http://127.0.0.1:8000/api/autocomplete/`, {
            params: { query }
        })
        .then(response => setSuggestions(response.data))
        .catch(error => console.error("Error fetching suggestions", error));
    }, [query]);


    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/search/?q=${query}`);
            const results = response.data;
            navigate('/searchresults', { state: { results } });
         } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

     const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion); // Set input to clicked suggestion    
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

            {/* Autocomplete Suggestions Dropdown */}
            {suggestions.length > 0 && (
                <ul className="autocomplete-suggestions">
                    {suggestions.map((suggestion, index) => (
                        <li 
                            key={index} 
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}

            {/* Display Search Results */}
            {results.length > 0 && <SearchResults results={results} />}
        </div>
    );
};
export default Searchbar;