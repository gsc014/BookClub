import React from 'react';
import './bookcard.css';
import saveIcon from './pictures/save.png';
import informationIcon from './pictures/file.png';
import defaultCover from './pictures/no-results.png';
import { useNavigate } from "react-router-dom";

const Bookcard = ({ book }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/books/${book.id}`, {state: { book }});
    };

    return (
        <div className="book-card" onClick={handleClick}>
            <img 
                src={defaultCover} //{`https://covers.openlibrary.org/w/olid/${book.key}-L.jpg`} 
                alt={book.title || "Book Cover"}
                onError={(e) => e.target.src = defaultCover} // Fallback if image fails to load
            />
            <h3>{book.title}</h3>
            <img src={saveIcon} id="Save" className="icon_bookcard jump" />
            <img src={informationIcon} id="Info" className="icon_bookcard jump" />
        </div>
    );
};

export default Bookcard;
