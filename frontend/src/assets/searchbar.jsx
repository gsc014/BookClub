import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './style/searchbar.css';
import SearchResults from './searchresults';
import SubjectsHeader from './subjectheader';
import Welcome from './welcome';

const Searchbar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [filters, setFilters] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        if (query.length < 1) { 
            setSuggestions([]); 
            return; 
        }
        axios.get(`http://127.0.0.1:8000/api/autocomplete`, { params: { query } }).then(response => setSuggestions(response.data)).catch(error => console.error("Error fetching suggestions", error));
    }, [query]);

    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/search/?q=${query}`);
            console.log("Search response:", response.data);
            navigate('/searchresults', { 
                state: { 
                    initialResults: response.data.results, 
                    initialFilter: query,
                    isSearchQuery: true 
                }
            });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (typeof suggestion === 'object' && suggestion.id && suggestion.title) {
            console.log(`Navigating to book with ID: ${suggestion.id}, Title: ${suggestion.title}`);
            navigate(`/books/${suggestion.id}`, { 
                state: { 
                    book: { 
                        id: suggestion.id, 
                        title: suggestion.title ,
                        book: suggestion.book
                    } 
                }
            });
        } else {
            console.log("Suggestion clicked (old format):", suggestion);
            setQuery(suggestion);
        }
    };

    useEffect(() => {
        if (!filters) return;
        console.log("Passed filter is", filters);
        let url = `http://127.0.0.1:8000/api/filter/?filter=${filters}`;
        console.log("attempting", url);
        axios.get(url, { params: { per_page: 10 } })
            .then(response => {
                navigate('/searchresults', { 
                    state: { 
                        initialResults: response.data.results,
                        initialFilter: filters,
                        isSearchQuery: false
                    }
                });
            })
            .catch(error => console.error('Error fetching search results:', error));
    }, [filters]);

    return (
        <>
            <SubjectsHeader onSelect={setFilters} />  
            <Welcome />
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

                {suggestions.length > 0 && (
                    <ul className="autocomplete-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <li 
                                key={suggestion.id || index} 
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion.title || suggestion}
                            </li>
                        ))}
                    </ul>
                )}

                {results.length > 0 && <SearchResults results={results} />}
            </div>
        </>
    );
};

export default Searchbar;
