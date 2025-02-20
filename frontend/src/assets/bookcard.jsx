import React from 'react';
import './bookcard.css';
import saveIcon from './pictures/diskette.png';
import informationIcon from './pictures/file.png';
import defaultCover from './pictures/no-results.png';

const Bookcard = ({ book }) => {
    return (
        <div className="book-card">
            <img 
                // src={`https://covers.openlibrary.org/w/olid/${book.key}-L.jpg`} 
                alt={book.title || "Book Cover"}
                onError={(e) => e.target.src = defaultCover} // Fallback if image fails to load
            />
            <p>id:{book.id}</p>
            <h3>{book.title}</h3>
            <img src={saveIcon} id="Save" className="icon_bookcard jump" />
            <img src={informationIcon} id="Info" className="icon_bookcard jump" />
        </div>
    );
};

export default Bookcard;
