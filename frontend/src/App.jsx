import { useState, useEffect } from 'react'; // ✅ Import useEffect
import axios from 'axios'; // ✅ Import axios

import './stylesheet.css';
import './App.css';

import Header from './assets/header.jsx';
import Searchbar from './assets/searchbar.jsx';
import Booklist from './assets/booklist.jsx';
import Login from './assets/login.jsx';
import Signin from './assets/signin.jsx';

const App = () => {

    // add this to restrict use if backend is not running
    
    // const [data, setData] = useState(null);

    // useEffect(() => {
    //     axios.get('http://127.0.0.1:8000/') // ✅ Ensure the backend is running
    //         .then(response => {
    //             console.log("Backend Response:", response.data); // ✅ Debugging log
    //             setData(response.data);
    //         })
    //         .catch(error => console.error('Error fetching home data:', error));
    // }, []);

    // if (!data) return <div>We struggle to reach our backend<br />You sure its up and running?</div>;

    return (
        <div>
            <Header />
            <Searchbar />
            <Booklist />
            <Login />
            <Signin />
        </div>
    );
}

export default App;
