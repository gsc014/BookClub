import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './bookpage.css';

const Bookpage = ({ book }) => {
    const [retrievedBook, setBook] = useState(null);
    console.log("got", book);
    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/book/${book.id}`)
      .then(response => setBook(response.data))
      .catch(error => console.error('Error fetching settings:', error));
    }, [book.id]);


    return (
        <div>
            <h3>Book Data:</h3>
            <pre>{JSON.stringify(retrievedBook, null, 2)}</pre>
        </div>
    );
};

export default Bookpage;