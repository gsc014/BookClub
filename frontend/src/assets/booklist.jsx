import React from 'react';

import './searchbar.css';
import Bookcard from './bookcard';
import './bookcard.css';


export default function Booklist() {


    // return (
    //   <section id="recommended">
    //     <h2>Recommended Books</h2>

    //    </section> 
    // );

    return (
        <section id="recommended">
            <h2>Recommended Books</h2>
            {/* <button onClick={handlebookadd}></button> */}
            <ul id="bookList" className="horizontal-list" />

            <div class='row'>
                <Bookcard />

            </div>
        </section>
    );
};



// const Booklist = () => {



// };

// export default Booklist;


