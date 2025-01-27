import React from 'react';

import './bookcard.css';

const Bookcard = ({picture,title, author}) => {

    return (
        
        <div className="book-card">
            <img src="https://covers.openlibrary.org/b/id/14833301-L.jpg" alt="Book Cover" />
            <h3>{title}</h3>
            <p>{author}</p>
            <button className="button">Save</button>
            <button className="button">Details</button>
            <button className="button">Review</button>
        </div>
    );
};

export default Bookcard;