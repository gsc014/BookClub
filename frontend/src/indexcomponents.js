window.onload = function () {
    console.log('Page loaded');
    for (let i = 0; i < 5; i++) {
        addBookToList();
    }
}

const settings_button = document.getElementById('Settings');
settings_button.addEventListener('click', function () {
    console.log('Settings button clicked');
});

let dark = false;

const search_button = document.getElementById('search_button');
const dark_mode = document.getElementById('dark_mode');
const user = document.getElementById('User');
const bookList = document.getElementById('bookList');

// Function to add a book card to the book list, book card is determined in here
export function addBookToList() {
    const li = document.createElement('li');
    var picture = "https://covers.openlibrary.org/b/id/14833301-L.jpg";
    const save_icon = "💾";
    li.innerHTML = `
    <div class="book-card">
        <img src="${picture}" alt="Book Cover">
        <h3>Book Title</h3>
        <p>Author Name</p>
        <button id = "log_in" class="button"></button>
        <button id = "log_in" class="button"></button>
        <button id = "log_in" class="button">Review</button>
    </div>
`;



    bookList.appendChild(li);

    if (dark) {
        const newBookCard = li.querySelector('.book-card');
        newBookCard.style.backgroundColor = '#454545';
        newBookCard.style.color = 'white';
        newBookCard.style.borderColor = '#272727';
    }
}

// temporary event listener to add a book card to the list
search_button.addEventListener('click', function () {
    addBookToList();
});

// dark mode button
document.getElementById('dark_mode').addEventListener('click', function () {
    const buttons = document.querySelectorAll('.button'); // Select all buttons
    const book_cards = document.querySelectorAll('.book-card'); // Select all book cards
    const header = document.getElementById('header');
    const searchInput = document.querySelector('.search-bar input'); // Get the search input field
    const img = document.getElementById('dark_mode');

    if (dark) {
        // Light mode
        img.setAttribute("src", "{% static 'pictures/bright-mode.png' %}");
        document.getElementById("dark_mode").innerText = "Too bright?";
        document.body.style.backgroundColor = '#edebd7';
        header.style.backgroundColor = '#423e37';

        searchInput.style.backgroundColor = '#fff';
        searchInput.style.color = '#000';
        searchInput.style.borderColor = '#ccc';

        buttons.forEach(button => {
            button.style.backgroundColor = '#d1a641';
            button.style.color = '#ffffff';
        });
        book_cards.forEach(book_card => {
            book_card.style.backgroundColor = '#FFFFFF';
            book_card.style.color = 'black';
            book_card.style.borderColor = '#ddd';
        });
        dark = false;
    } else {
        // Dark mode
        img.setAttribute("src", "{% static 'pictures/night-mode.png' %}");
        document.getElementById("dark_mode").innerText = "Too dark?";
        document.body.style.backgroundColor = '#252525';
        header.style.backgroundColor = '#353535';

        searchInput.style.backgroundColor = '#353535';
        searchInput.style.color = '#fff';
        searchInput.style.borderColor = '#555';

        buttons.forEach(button => {
            button.style.backgroundColor = '#4464ad';
            button.style.color = '#fff';
        });
        book_cards.forEach(book_card => {
            book_card.style.backgroundColor = '#454545';
            book_card.style.color = 'white';
            book_card.style.borderColor = '#272727';
        });
        dark = true;
    }
});