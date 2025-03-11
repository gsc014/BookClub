import React, { useState } from 'react';
import './style/bookpage.css';  // Make sure your styles are imported

function StarRating({ rating, setRating }) {
    const [hover, setHover] = useState(0);
    
    return (
        <div className="star-rating">
            <label>Rating:</label>
            <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <span 
                        key={star}
                        className={`star ${star <= (hover || rating) ? 'filled' : ''}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                    >
                        ★
                    </span>
                ))}
            </div>
            {rating > 0 && <span className="rating-text">{rating}/5</span>}
        </div>
    );
}

export default StarRating;