import React from 'react';

import './searchbar.css';
import Bookcard from './bookcard';
import './bookcard.css';


const Booklist = () => {
    // const [books, setBooks] = useState([]);
  
    // Function to dynamically add a book to the list
    const addBookToList = () => {
      const newBook = {
        id: books.length + 1,
        picture: "https://covers.openlibrary.org/b/id/14833301-L.jpg",
        title: `Book Title ${books.length + 1}`,
        author: `Author ${books.length + 1}`,
      };
  
      setBooks([...books, newBook]); // Add the new book to the state
    };
  
    return (
      <section id="recommended">
        <h2>Recommended Books</h2>
         <button onClick={addBookToList} className="add-book-button"> 
          Add Book
        </button>
        {/* <ul id="bookList" className="horizontal-list"> 
          {books.map((book) => (
            <li key={book.id}>
              <Bookcard 
                picture={book.picture}
                title={book.title}
                author={book.author}
              />
            </li>
          ))}
        </ul>  */}
       </section> 
    );
  };



// const Booklist = () => {

//     return (

//         <section id="recommended">
//             <h2>Recommended Books</h2>
//             {/* <ul id="bookList" className="horizontal-list" /> */}
//             <ul id="bookList" classname="horizontal-list">
//               <li><Bookcard /></li>
//               <li><Bookcard /></li>
//               <li><Bookcard /></li>
//               <li><Bookcard /></li>  
//               <li><Bookcard /></li>

            
//             </ul>


//         </section>


//     );
// };

export default Booklist;


