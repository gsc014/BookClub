import React from 'react';

import './searchbar.css';

const Searchbar = () => {

    return (
        <div className="search-bar-container">
            <div className="search-bar">
                <input type="text" placeholder="Search for books..." />
                <button id="search_button" className="button">
                Search
                </button>
            </div>
        </div>
    );
};

export default Searchbar;