import { useState } from 'react'
import './stylesheet.css'; // Import the CSS file here
import './App.css'

import Header from './assets/header.jsx';
import Searchbar from './assets/searchbar.jsx';
import Bookcard from './assets/bookcard.jsx';
import Login from './assets/login.jsx';
import Signin from './assets/signin.jsx';


const App = () => {
    // const [count, setCount] = useState(0)

    return (
        <div>
            <Header />
            <Searchbar />
            <Bookcard/>
            <Login />
            <Signin />
        </div>
    )
}

export default App;
