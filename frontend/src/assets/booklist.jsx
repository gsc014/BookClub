import React from 'react';

import './searchbar.css';
import Bookcard from './bookcard';
import './bookcard.css';

// import { addBookCard } from '../App.jsx';


export default function Booklist() {

    return (
        <section id="recommended">
            <h2>Recommended Books</h2>
            {/* <button onClick={addBookCard}>add book</button> */}
            <ul id="bookList" className="horizontal-list" />

            <div class='row'>
                <Bookcard />

            </div>
        </section>
    );
};