import React, { useEffect, useState } from 'react';
import './bookcard.css';
import axios from 'axios';

import saveIcon from './pictures/diskette.png';
import informationIcon from './pictures/file.png';
import defaultCover from './pictures/no-results.png';


const Bookcard = ({ book }) => {
    const [product, setProduct] = useState(null); // State to store fetched product

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/random-book/')
            .then(res => {
                console.log("Fetched Data:", res.data);
                setProduct(res.data); // Store product data in state
            })
            .catch(error => console.error("Error fetching data:", error));
    }, []); // Runs only once on component mount

    return (
        <div className="book-card">
            {product ? (
                <>
                    <img 
                        src={`https://covers.openlibrary.org/w/olid/${product.key}-L.jpg`} 
                        alt={product.title || "Book Cover"}
                        onError={(e) => e.target.src = defaultCover} // Fallback if image fails to load
                    /><p>id:{product.id}</p>
                    <h3>{product.title}</h3>
                    {/* <p>{product.description}</p> */}
                    {/* <p><strong>Price:</strong> ${product.price}</p> */}
                    {/* <p><strong>Rating:</strong> ⭐ {product.rating} / 5</p> */}
                    
                    {/* {product.reviews.length > 0 && ( */}
                        {/* <div className="reviews"> */}
                            {/* <h4>Latest Review:</h4> */}
                            {/* <p><strong>{product.reviews[0].reviewerName}:</strong> {product.reviews[0].comment}</p> */}
                        {/* </div> */}
                    {/* )} */}
                    <img src={saveIcon} id="Save" className="icon_bookcard jump" />
                    <img src={informationIcon} id="Info" className="icon_bookcard jump" />
                </>
            ) : (
                <p>Loading product...</p>
            )}
        </div>
    );
};

export default Bookcard;
