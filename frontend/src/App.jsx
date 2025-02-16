import './stylesheet.css';
import './App.css';


import { Header, Searchbar, Booklist, Login, Signin, Welcome, Profile } from './assets';


const App = () => {

    return (
        <div>
            <Header />
            <Welcome />
            <Searchbar />
            <Booklist />
            <Login />
            <Signin />
            <Profile />
        </div>
    );
}

export default App;
