import React, { useEffect, useState } from 'react';
import './bookcard.css';
import axios from 'axios';

const Bookcard = ({ book }) => {
    const [product, setProduct] = useState(null); // State to store fetched product

    useEffect(() => {
        axios.get('https://dummyjson.com/products/1')
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
                    <img src={product.images[0]} alt={product.title} className="product-image" />
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    <p><strong>Price:</strong> ${product.price}</p>
                    <p><strong>Rating:</strong> ⭐ {product.rating} / 5</p>
                    
                    {product.reviews.length > 0 && (
                        <div className="reviews">
                            <h4>Latest Review:</h4>
                            <p><strong>{product.reviews[0].reviewerName}:</strong> {product.reviews[0].comment}</p>
                        </div>
                    )}

                    <button className="button">Save</button>
                    <button className="button">Details</button>
                    <button className="button">Review</button>
                </>
            ) : (
                <p>Loading product...</p>
            )}
        </div>
    );
};

export default Bookcard;
