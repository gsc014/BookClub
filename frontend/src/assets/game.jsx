import axios from "axios";
import { useEffect, useState } from "react";

const Game = () => {
    const [bookTitle, setBookTitle] = useState('');  // Holds the book title
    const [blur, setBlur] = useState(6);  // Blur level for the image
    const [userGuess, setUserGuess] = useState('');  // Holds the user's guess
    const [cover, setCover] = useState(0);

    const blurlevel = `blur(${blur}px)`;

    // Fetching random book title on component mount
    useEffect(() => {
        const fetchBook = async () => {
            const response = await axios.get('http://127.0.0.1:8000/random-book/');
            console.log("Got response", response.data);
            setBookTitle(response.data.title);  // Store the title for comparison
            setCover(`https://covers.openlibrary.org/b/id/${response.data.cover}-L.jpg`);
        };


        fetchBook();
    }, []);

    const guessBook = () => {
        if (userGuess.toLowerCase() === bookTitle.toLowerCase()) {
            setBlur(0);
            alert("YAYAYYYAYYAY");
        } else {
            unblurImage();
        }
    };

    const handleInputChange = (event) => {
        setUserGuess(event.target.value);
    };

    const unblurImage = () => {
        setBlur(blur - 2);
    };


    return (
        <div>
            <img src={cover} alt="Random" style={{ filter: blurlevel }} />

            <label htmlFor="BookName">Book Name:</label><br />
            <input 
                type="text" 
                id="BookName" 
                value={userGuess} 
                onChange={handleInputChange} 
            /><br />

            <button onClick={guessBook}>Guess book name</button>
        </div>
    );
};

export default Game;