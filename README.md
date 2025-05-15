# BookClub 📚

BookClub is a web application designed to connect book lovers, enabling them to track their reading progress, discover new books, and share their reviews. Inspired by Goodreads, this project is a school assignment aimed at learning full-stack web development with Django and React.

---

## Features ✨

- **Track Your Reading**: Add books to your virtual library and track your progress.
- **Discover New Books**: Get recommendations based on your reading preferences.
- **Write Reviews**: Share your thoughts and see what others are saying.
- **Community Engagement**: Follow other users and see their reading lists and reviews.

---

## Why BookClub? 🤔

This project combines powerful backend capabilities with an interactive frontend to deliver an engaging user experience. It's an ideal platform for book enthusiasts to connect, inspire, and grow their love for reading.

---

## Getting Started 🚀

Follow these steps to get a local copy of the project up and running:

### Prerequisites
- Python 3.10+
- Node.js (version >= 18) and npm
- Virtual environment manager (optional but recommended)

### Installation and running the app


1. **Navigate to folder and set up a virtual environment(optional but recommended)**
    Navigate to the bookclub folder in the terminal
    ```bash
    cd BookClub
    python -m venv venv
    source venv/bin/activate  # Use `venv\Scripts\activate` on Windows

2. **install dependencies**
    ```bash
    pip install -r requirements.txt

3. **Apply database migrations**
    ```bash
    python manage.py migrate

4. **Run the development server** 
    ```bash
    python manage.py runserver

5. **Open a new terminal and navigate to frontend folder**
    ```bash
    cd BookClub/frontend

6. **Requirements for running frontend server**
    ```bash
    npm install
    
7. **Run the frontend server**
    <br>write into terminal
    ```bash
    npm run dev
    ```
    and press the link that pops up in the terminal:
    http://localhost:5173/

8. **If the Database is not available**
    <br>you can download the database
    from this link:
    https://universitetetitromso-my.sharepoint.com/:u:/g/personal/agu078_uit_no/EWSpiCis85tDulFQM9y2DewBF40NWnsoFe09IiZN38kF1Q?e=vYSEhi

9. **Database location**:
    <br>put the db.sqlite3 database in root folder of /Bookclub, you will get a warning that there already exists a db.sqlite file, replace it with the new one, refresh the page and everythong should work
    
## Maintainers 👨‍💻
* Gard Schive
* Lukas Voldset
* Samuel Østby
* Alexander Guttormsen
