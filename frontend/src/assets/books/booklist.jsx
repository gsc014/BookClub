import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Bookcard from './bookcard';
import './style/bookcard.css';

const Booklist = () => {
    const [randomBook, setRandomBook] = useState(null);

    useEffect(() => {
        const fetchRandomBook = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/random-book/');
                console.trace("Fetching random book");
                // throw error
                setRandomBook(response.data);
            } catch (error) {
                console.error('Error fetching random book:', error);
            }
        };

        fetchRandomBook();
    }, []);

    return (
        <section id="recommended">
            <h2>Recommended Books</h2>
            <div className='row'>
                {randomBook && <Bookcard book={randomBook} />}
            </div>
        </section>
    );
};

export default Booklist;