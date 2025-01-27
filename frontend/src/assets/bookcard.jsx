import React, { useEffect } from 'react';

import './bookcard.css';
import axios from 'axios';

const Bookcard = (book) => {
    useEffect(() => {
        axios.get('https://dummyjson.com/products/1')
            .then(res => res.json())
            .then(console.log)
    })


    return (

        <div className="book-card">
            <img src="https://covers.openlibrary.org/b/id/14833301-L.jpg" alt="Book Cover" />
            <p>{res.body}</p>
            {/* <h3>{title}</h3>
            <p>{author}</p> */}
            <button className="button">Save</button>
            <button className="button">Details</button>
            <button className="button">Review</button>
        </div>
    );
};

export default Bookcard;