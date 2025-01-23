import React from 'react';

import './bookcard.css';

const Bookcard = () => {

    return (
        <section id="recommended">
            <h2>Recommended Books</h2>
            <ul id="bookList" className="horizontal-list" />
        </section>
    );
};

export default Bookcard;