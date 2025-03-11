import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './searchbar.css';
import SearchResults from './searchresults';
import SubjectsHeader from './subjectheader';
import Welcome from './welcome';


const Searchbar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [filters, setFilters] = useState("");  // <-- Changed from array to string

    const navigate = useNavigate();

    useEffect(() => {
        if (query.length < 5) { 
            setSuggestions([]); 
            return; 
        }

        axios.get(`http://127.0.0.1:8000/api/autocomplete/`, { params: { query } })
            .then(response => setSuggestions(response.data))
            .catch(error => console.error("Error fetching suggestions", error));
    }, [query]);

    const handleSearch = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/search/?q=${query}`);
            navigate('/searchresults', { state: { results: response.data } });
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion); 
    };

    useEffect(() => {
        if (!filters) return;  // Prevent API call if filters is empty

        console.log("Passed filter is", filters);
        let url = `http://127.0.0.1:8000/api/filter/?filter=${filters}`;
        console.log("attempting", url);

        axios.get(url)
            .then(response => {
                navigate('/searchresults', { state: { results: response.data } });
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
                            <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
                                {suggestion}
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
